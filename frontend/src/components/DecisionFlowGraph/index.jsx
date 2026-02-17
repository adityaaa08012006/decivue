import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./styles.css";

import DecisionNode from "./DecisionNode";
import OrgAssumptionNode from "./OrgAssumptionNode";
import DecisionDetailPanel from "./DecisionDetailPanel";
import api from "../../services/api";
import {
  applySwimLaneLayout,
  generateSwimlaneLanes,
  enrichDecisionsWithSwimLaneData,
} from "../../utils/swimlaneLayout";
import { RefreshCw } from "lucide-react";

/**
 * Cache utilities for persisting node positions
 */
const CACHE_VERSION = "v1";
const CACHE_KEY = `decisionFlow_nodePositions_${CACHE_VERSION}`;

// Generate a stable hash from data to detect STRUCTURAL changes only
// Only invalidate cache when graph structure changes (nodes added/removed, edges change)
// Do NOT invalidate for lifecycle/health/status changes (visual updates only)
const generateDataHash = (decisions, assumptions, dependencies) => {
  const dataString = JSON.stringify({
    // Only track IDs - not lifecycle, health, or status
    decisionIds: decisions.map(d => d.id).sort(),
    assumptionIds: assumptions.map(a => a.id).sort(),
    // Track dependency structure only
    dependencyPairs: dependencies.map(d => `${d.depends_on_decision_id}->${d.decision_id}`).sort(),
  });
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
};

// Save node positions to localStorage
const savePositionsToCache = (nodes, dataHash) => {
  try {
    const positions = nodes.reduce((acc, node) => {
      acc[node.id] = { x: node.position.x, y: node.position.y };
      return acc;
    }, {});
    
    const cacheData = {
      dataHash,
      positions,
      timestamp: Date.now(),
    };
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    
    console.log("💾 Saved", Object.keys(positions).length, "node positions to cache (hash:", dataHash, ")");
  } catch (error) {
    console.warn("Failed to save positions to cache:", error);
  }
};

// Load node positions from localStorage
const loadPositionsFromCache = (dataHash) => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) {
      console.log("ℹ️ No cache found in localStorage");
      return null;
    }
    
    const { dataHash: cachedHash, positions, timestamp } = JSON.parse(cached);
    
    // Check if cache is valid (data hasn't changed)
    if (cachedHash !== dataHash) {
      console.log("🔄 Cache invalid - data has changed");
      console.log("   Cached hash:", cachedHash);
      console.log("   Current hash:", dataHash);
      return null;
    }
    
    // Cache expires after 7 days
    const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000;
    const cacheAge = Date.now() - timestamp;
    if (cacheAge > CACHE_EXPIRY) {
      console.log("⏰ Cache expired (age:", Math.floor(cacheAge / (1000 * 60 * 60 * 24)), "days)");
      return null;
    }
    
    console.log("✅ Loaded", Object.keys(positions).length, "cached positions (age:", Math.floor(cacheAge / (1000 * 60)), "minutes)");
    return positions;
  } catch (error) {
    console.warn("Failed to load positions from cache:", error);
    return null;
  }
};

// Clear cache (useful for debugging)
const clearPositionCache = () => {
  localStorage.removeItem(CACHE_KEY);
  console.log("🗑️ Cache cleared");
};

/**
 * DecisionFlowGraph Component
 *
 * Main graph visualization showing:
 * - Decision nodes (rectangular)
 * - Organizational assumption nodes (circular)
 * - Decision dependencies (solid arrows)
 * - Org assumption to decision links (dotted lines)
 *
 * WHY ONLY ORGANIZATIONAL ASSUMPTIONS APPEAR IN THE GRAPH:
 * - Decision-specific assumptions are unique to ONE decision
 * - Showing them in the graph would clutter the visualization
 * - They are revealed when clicking a decision node (in the detail panel)
 * - Organizational assumptions affect MULTIPLE decisions, so they're valuable to see in the graph
 *
 * DATA FETCHING:
 * - GET /decisions - Fetches all decisions
 * - GET /decision-dependencies - Fetches decision-to-decision dependencies
 * - GET /assumptions - Fetches all assumptions (filtered by scope=UNIVERSAL for org assumptions)
 * - GET /assumptions?decisionId=X - Fetches assumptions linked to a specific decision (when clicked)
 *
 * CLICK INTERACTIONS:
 * - Clicking a DECISION node: Opens detail panel with org + decision-specific assumptions
 * - Clicking an ORG ASSUMPTION node: Highlights all connected decisions in the graph
 */
const DecisionFlowGraph = () => {
  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isLayouting, setIsLayouting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [selectedDecisionAssumptions, setSelectedDecisionAssumptions] =
    useState({
      org: [],
      decisionSpecific: [],
    });
  const [highlightedAssumption, setHighlightedAssumption] = useState(null);
  const [swimlaneLanes, setSwimlaneLanes] = useState([]);
  const [currentDataHash, setCurrentDataHash] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAutoLayouting, setIsAutoLayouting] = useState(false); // Track if we're in auto-layout mode

  // Define custom node types
  const nodeTypes = useMemo(
    () => ({
      decision: DecisionNode,
      orgAssumption: OrgAssumptionNode,
    }),
    [],
  );

  /**
   * Transform backend data into React Flow nodes and edges
   * Enhanced with swimlane support while keeping assumption connections
   */
  const transformDataToGraph = useCallback(
    (decisions, orgAssumptions, dependencies, decisionAssumptionLinks) => {
      const graphNodes = [];
      const graphEdges = [];

      // Enrich decisions with swimlane and stage data
      const enrichedDecisions = enrichDecisionsWithSwimLaneData(decisions, dependencies);

      // Create decision nodes (rectangular) with swimlane data
      enrichedDecisions.forEach((decision) => {
        graphNodes.push({
          id: `decision-${decision.id}`,
          type: "decision",
          position: { x: 0, y: 0 }, // Will be set by auto-layout
          data: {
            id: decision.id,
            title: decision.title,
            description: decision.description,
            lifecycle: decision.lifecycle,
            health_signal: decision.health_signal,
            category: decision.metadata?.category || decision.category,
            swimlane: decision.swimlane,
            stage: decision.stage,
            metadata: decision.metadata,
          },
        });
      });

      // Create organizational assumption nodes (circular)
      // Only show UNIVERSAL assumptions in the graph
      orgAssumptions.forEach((assumption, index) => {
        graphNodes.push({
          id: `org-assumption-${assumption.id}`,
          type: "orgAssumption",
          position: { x: -300, y: index * 150 }, // Left side, will adjust with layout
          data: {
            id: assumption.id,
            label:
              assumption.description.substring(0, 50) +
              (assumption.description.length > 50 ? "..." : ""),
            fullDescription: assumption.description,
            status: assumption.status,
            isHighlighted: false,
          },
        });
      });

      // Create decision-to-decision dependency edges (solid arrows with better styling)
      dependencies.forEach((dep) => {
        // Check if source or target decision is at risk/invalidated
        const sourceDecision = enrichedDecisions.find(d => d.id === dep.depends_on_decision_id);
        const targetDecision = enrichedDecisions.find(d => d.id === dep.decision_id);
        
        const isAtRisk = 
          sourceDecision?.lifecycle === 'AT_RISK' || 
          sourceDecision?.lifecycle === 'INVALIDATED' ||
          targetDecision?.lifecycle === 'AT_RISK' || 
          targetDecision?.lifecycle === 'INVALIDATED';
        
        const edgeColor = isAtRisk ? '#ef4444' : '#3b82f6'; // Red for at-risk, blue for normal
        
        graphEdges.push({
          id: `dep-${dep.id}`,
          source: `decision-${dep.depends_on_decision_id}`,
          target: `decision-${dep.decision_id}`,
          type: "smoothstep",
          animated: false,
          style: { stroke: edgeColor, strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edgeColor,
            width: 20,
            height: 20,
          },
        });
      });

      // Create org assumption to decision edges (dotted lines, no arrowhead)
      decisionAssumptionLinks.forEach((link) => {
        graphEdges.push({
          id: `link-${link.assumption_id}-${link.decision_id}`,
          source: `org-assumption-${link.assumption_id}`,
          target: `decision-${link.decision_id}`,
          type: "smoothstep",
          animated: false,
          style: {
            stroke: "#a855f7",
            strokeWidth: 2,
            strokeDasharray: "5,5",
          },
          // No arrowhead for assumption links (supporting context, not dependency)
        });
      });

      return { nodes: graphNodes, edges: graphEdges };
    },
    [],
  );

  /**
   * Apply swimlane layout with ELK algorithm (with smart caching)
   */
  const layoutGraph = useCallback(
    async (graphNodes, graphEdges, dataHash, cachedPositions = null) => {
      setIsLayouting(true);
      setIsAutoLayouting(true); // Mark that we're in auto-layout mode

      try {
        // If we have valid cached positions, use them instead of recalculating
        if (cachedPositions) {
          console.log("⚡ Using cached positions - skipping layout calculation");
          
          const nodesWithCachedPositions = graphNodes.map(node => ({
            ...node,
            position: cachedPositions[node.id] || node.position,
          }));
          
          // Generate swimlane background lanes
          const decisionNodes = nodesWithCachedPositions.filter(n => n.type === "decision");
          const lanes = generateSwimlaneLanes(decisionNodes, {
            swimlaneSpacing: 200,
            swimlaneHeight: 170,
          });
          setSwimlaneLanes(lanes);
          
          setNodes(nodesWithCachedPositions);
          setEdges(graphEdges);
          setIsLayouting(false);
          setIsAutoLayouting(false); // Done with auto-layout
          return;
        }
        
        // No cache - calculate layout with ELK
        console.log("🧮 Calculating layout with ELK (this may take a moment)...");
        
        // Separate decision nodes from assumption nodes for layout
        const decisionNodes = graphNodes.filter((n) => n.type === "decision");
        const assumptionNodes = graphNodes.filter(
          (n) => n.type === "orgAssumption",
        );

        // Apply ELK swimlane layout to decision nodes only
        const layoutedDecisionNodes = await applySwimLaneLayout(
          decisionNodes,
          graphEdges.filter((e) => e.id.startsWith("dep-")), // Only decision dependencies
          {
            nodeWidth: 280,
            nodeHeight: 120,
            swimlaneSpacing: 200,
            stageSpacing: 450,
            nodeSpacing: 100,
          },
        );

        // Position assumption nodes on the left side with proper spacing
        const positionedAssumptionNodes = assumptionNodes.map(
          (node, index) => ({
            ...node,
            position: {
              x: -350,
              y: index * 180 + 100,
            },
          }),
        );

        // Generate swimlane background lanes
        const lanes = generateSwimlaneLanes(layoutedDecisionNodes, {
          swimlaneSpacing: 200,
          swimlaneHeight: 170,
        });

        setSwimlaneLanes(lanes);

        // Combine all nodes
        const allLayoutedNodes = [
          ...layoutedDecisionNodes,
          ...positionedAssumptionNodes,
        ];

        setNodes(allLayoutedNodes);
        setEdges(graphEdges);
        
        // Save new layout to cache
        savePositionsToCache(allLayoutedNodes, dataHash);
      } catch (err) {
        console.error("Layout failed:", err);
        // Fallback: use nodes without advanced layout
        setNodes(graphNodes);
        setEdges(graphEdges);
      } finally {
        setIsLayouting(false);
        setIsAutoLayouting(false); // Done with auto-layout
      }
    },
    [setNodes, setEdges],
  );

  /**
   * Fetch all data needed for the graph and apply layout
   */
  const fetchGraphData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch decisions and assumptions first
      const [decisionsData, allAssumptions] = await Promise.all([
        api.getDecisions(),
        api.getAssumptions(), // Gets all assumptions
      ]);

      console.log("📊 Fetched data:", {
        decisions: decisionsData.length,
        assumptions: allAssumptions.length,
      });

      // Filter only UNIVERSAL (organizational) assumptions for the graph
      const orgAssumptions = (allAssumptions || []).filter(
        (a) => !a.scope || a.scope === "UNIVERSAL",
      );

      console.log(
        "🔍 Filtered organizational assumptions:",
        orgAssumptions.length,
      );

      // Fetch dependencies for all decisions
      // Note: Backend requires decisionId parameter, so we fetch for each decision
      const allDependencies = [];
      for (const decision of decisionsData || []) {
        try {
          const deps = await api.getDependencies(decision.id);
          // deps contains { blocking: [], blockedBy: [] }
          // We need to extract the actual dependency links
          if (deps.blocking) {
            deps.blocking.forEach((dep) => {
              allDependencies.push({
                id: dep.id,
                depends_on_decision_id: decision.id, // source
                decision_id: dep.target_decision_id, // target
              });
            });
          }
        } catch (err) {
          // Skip if no dependencies for this decision
          console.log(`No dependencies for decision ${decision.id}`);
        }
      }

      console.log("📌 Dependencies:", allDependencies.length);

      // Build decision-assumption links for org assumptions only
      // This requires querying which decisions each org assumption is linked to
      const decisionAssumptionLinks = [];

      for (const decision of decisionsData || []) {
        try {
          const linkedAssumptions = await api.getAssumptions(
            decision.id,
            false,
          );

          linkedAssumptions.forEach((assumption) => {
            // Only include organizational assumptions
            if (!assumption.scope || assumption.scope === "UNIVERSAL") {
              decisionAssumptionLinks.push({
                assumption_id: assumption.id,
                decision_id: decision.id,
              });
            }
          });
        } catch (err) {
          console.log(`No assumptions for decision ${decision.id}`);
        }
      }

      console.log(
        "🔗 Decision-Assumption links:",
        decisionAssumptionLinks.length,
      );

      // Transform data into graph format
      const { nodes: graphNodes, edges: graphEdges } = transformDataToGraph(
        decisionsData || [],
        orgAssumptions,
        allDependencies,
        decisionAssumptionLinks,
      );

      // Generate data hash for cache validation
      const dataHash = generateDataHash(
        decisionsData || [],
        orgAssumptions,
        allDependencies
      );
      console.log("📌 Generated data hash:", dataHash);
      setCurrentDataHash(dataHash);
      
      // Try to load cached positions
      const cachedPositions = loadPositionsFromCache(dataHash);
      if (cachedPositions) {
        console.log("✅ Found valid cache with", Object.keys(cachedPositions).length, "node positions");
      } else {
        console.log("ℹ️ No valid cache found, will calculate layout");
      }

      // Apply auto-layout (uses cache if available)
      await layoutGraph(graphNodes, graphEdges, dataHash, cachedPositions);

      console.log("✅ Graph layouted successfully");
    } catch (err) {
      console.error("❌ Error fetching graph data:", err);
      setError("Failed to load decision flow data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty dependencies - layoutGraph and transformDataToGraph are called inline

  // Fetch data on mount only
  useEffect(() => {
    fetchGraphData();
  }, []); // Run only once on mount
  
  /**
   * Handle node position changes (e.g., when user drags a node)
   * Debounced save to avoid excessive localStorage writes
   * 
   * Note: This effect tracks the 'nodes' array, which changes whenever positions
   * OR data (lifecycle, health) changes. We use guards to only save when appropriate.
   */
  useEffect(() => {
    // Don't save during initial load or auto-layout
    if (!currentDataHash || nodes.length === 0 || isAutoLayouting) {
      return;
    }
    
    // Debounce: only save 500ms after changes settle
    const timeoutId = setTimeout(() => {
      // Final guard: don't save if still dragging or auto-layouting
      if (isDragging || isAutoLayouting) return;
      
      console.log("🔄 Auto-saving node positions (user drag or manual change)...");
      savePositionsToCache(nodes, currentDataHash);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [nodes, currentDataHash, isDragging, isAutoLayouting]);
  
  /**
   * Wrap onNodesChange to track dragging state
   */
  const handleNodesChange = useCallback((changes) => {
    // Detect if user is dragging
    const isDraggingChange = changes.some(change => 
      change.type === 'position' && change.dragging === true
    );
    const hasDragEnded = changes.some(change => 
      change.type === 'position' && change.dragging === false
    );
    
    if (isDraggingChange) setIsDragging(true);
    if (hasDragEnded) setIsDragging(false);
    
    // Call original handler
    onNodesChange(changes);
  }, [onNodesChange]);

  /**
   * Handle clicking a decision node
   * - Opens detail panel
   * - Fetches and displays both organizational and decision-specific assumptions
   */
  const handleDecisionClick = useCallback(async (event, node) => {
    if (node.type !== "decision") return;

    console.log("🖱️ Decision clicked:", node.data.title);

    // Find the decision data
    const decision = {
      id: node.data.id,
      title: node.data.title,
      description: node.data.description,
      lifecycle: node.data.lifecycle,
    };

    setSelectedDecision(decision);

    // Fetch assumptions for this decision
    try {
      const linkedAssumptions = await api.getAssumptions(decision.id, false);

      console.log("📋 Fetched assumptions for decision:", {
        total: linkedAssumptions.length,
        decision: decision.title,
      });

      // Separate by scope
      const orgAssumps = linkedAssumptions.filter(
        (a) => !a.scope || a.scope === "UNIVERSAL",
      );
      const decisionSpecificAssumps = linkedAssumptions.filter(
        (a) => a.scope === "DECISION_SPECIFIC",
      );

      console.log("  ✓ Organizational:", orgAssumps.length);
      console.log("  ✓ Decision-specific:", decisionSpecificAssumps.length);

      setSelectedDecisionAssumptions({
        org: orgAssumps,
        decisionSpecific: decisionSpecificAssumps,
      });
    } catch (err) {
      console.error("❌ Error fetching decision assumptions:", err);
      setSelectedDecisionAssumptions({ org: [], decisionSpecific: [] });
    }
  }, []);

  /**
   * Handle clicking an organizational assumption node
   * - Highlights all decisions connected to this assumption
   * - Does NOT open the decision detail panel
   */
  const handleOrgAssumptionClick = useCallback(
    (event, node) => {
      if (node.type !== "orgAssumption") return;

      console.log("🖱️ Org Assumption clicked:", node.data.fullDescription);

      const assumptionId = node.data.id;

      // Toggle highlighting
      if (highlightedAssumption === assumptionId) {
        // Un-highlight
        setHighlightedAssumption(null);
        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            data: { ...n.data, isHighlighted: false },
          })),
        );
      } else {
        // Highlight this assumption and connected decisions
        setHighlightedAssumption(assumptionId);

        // Find all decisions connected to this assumption
        const connectedDecisionIds = edges
          .filter((e) => e.source === `org-assumption-${assumptionId}`)
          .map((e) => e.target);

        console.log("  ✓ Connected decisions:", connectedDecisionIds.length);

        // Update node styling
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === `org-assumption-${assumptionId}`) {
              return { ...n, data: { ...n.data, isHighlighted: true } };
            }
            if (connectedDecisionIds.includes(n.id)) {
              return { ...n, className: "highlighted-decision" };
            }
            return { ...n, className: "" };
          }),
        );
      }
    },
    [highlightedAssumption, edges, setNodes],
  );

  /**
   * Handle node clicks (router)
   */
  const handleNodeClick = useCallback(
    (event, node) => {
      if (node.type === "decision") {
        handleDecisionClick(event, node);
      } else if (node.type === "orgAssumption") {
        handleOrgAssumptionClick(event, node);
      }
    },
    [handleDecisionClick, handleOrgAssumptionClick],
  );

  /**
   * Close decision detail panel
   */
  const closeDetailPanel = useCallback(() => {
    setSelectedDecision(null);
    setSelectedDecisionAssumptions({ org: [], decisionSpecific: [] });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading decision flow...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center text-red-600">
          <p className="font-semibold mb-2">Error</p>
          <p>{error}</p>
          <button
            onClick={fetchGraphData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-neutral-white dark:bg-neutral-gray-900">
      {/* Swimlane Background Labels */}
      {swimlaneLanes.length > 0 && (
        <div className="absolute top-0 left-0 z-10 p-4 pointer-events-none">
          {swimlaneLanes.map((lane) => (
            <div
              key={lane.id}
              className="mb-4 flex items-center"
              style={{
                marginTop: lane.y,
                marginBottom: lane.height - 40,
              }}
            >
              <div
                className="px-3 py-1 rounded-r-lg text-white font-semibold text-sm shadow-md"
                style={{ backgroundColor: lane.color }}
              >
                {lane.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Refresh Button & Cache Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={fetchGraphData}
          disabled={isLayouting}
          className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          title="Refresh Graph"
        >
          <RefreshCw
            className={`w-5 h-5 text-gray-700 ${isLayouting ? "animate-spin" : ""}`}
          />
        </button>
        <button
          onClick={() => {
            clearPositionCache();
            fetchGraphData();
          }}
          className="px-3 py-1 bg-white rounded-lg shadow-lg hover:bg-gray-100 transition-colors text-xs text-gray-600"
          title="Reset Layout (clears cached positions)"
        >
          Reset Layout
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ 
          padding: 0.2,
          minZoom: 0.5,
          maxZoom: 1.5,
        }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: "smoothstep",
        }}
      >
        <Background color="#e5e7eb" gap={20} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === "decision") {
              const lifecycle = node.data?.lifecycle;
              switch (lifecycle) {
                case "STABLE":
                  return "#10b981";
                case "UNDER_REVIEW":
                  return "#f59e0b";
                case "AT_RISK":
                  return "#ef4444";
                case "INVALIDATED":
                  return "#dc2626";
                case "RETIRED":
                  return "#6b7280";
                default:
                  return "#3b82f6";
              }
            }
            if (node.type === "orgAssumption") return "#a855f7";
            return "#6b7280";
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>

      {/* Decision Detail Panel (slides in from right) */}
      {selectedDecision && (
        <DecisionDetailPanel
          decision={selectedDecision}
          orgAssumptions={selectedDecisionAssumptions.org}
          decisionAssumptions={selectedDecisionAssumptions.decisionSpecific}
          onClose={closeDetailPanel}
        />
      )}

      {/* Instruction overlay */}
      <div className="absolute bottom-4 left-4 bg-white p-4 rounded-lg shadow-lg max-w-sm z-10">
        <p className="text-sm text-gray-700 mb-2 font-semibold">
          💡 How to use:
        </p>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>
            • Click a <strong>decision</strong> to see its assumptions
          </li>
          <li>
            • Click an <strong>org assumption</strong> to highlight connected
            decisions
          </li>
          <li>• <strong>Drag nodes</strong> to customize layout (auto-saved)</li>
          <li>• Solid arrows = decision dependencies</li>
          <li>• Dotted lines = org assumption links</li>
          <li>• Decisions auto-organized by category into swimlanes</li>
        </ul>
      </div>
    </div>
  );
};

export default DecisionFlowGraph;
