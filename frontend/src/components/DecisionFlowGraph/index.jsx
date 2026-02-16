import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./styles.css";

import DecisionNode from "./DecisionNode";
import OrgAssumptionNode from "./OrgAssumptionNode";
import DecisionDetailPanel from "./DecisionDetailPanel";
import api from "../../services/api";

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
  const [error, setError] = useState(null);
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [selectedDecisionAssumptions, setSelectedDecisionAssumptions] =
    useState({
      org: [],
      decisionSpecific: [],
    });
  const [highlightedAssumption, setHighlightedAssumption] = useState(null);

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
   */
  const transformDataToGraph = useCallback(
    (decisions, orgAssumptions, dependencies, decisionAssumptionLinks) => {
      const graphNodes = [];
      const graphEdges = [];

      // Create decision nodes (rectangular)
      decisions.forEach((decision, index) => {
        graphNodes.push({
          id: `decision-${decision.id}`,
          type: "decision",
          position: { x: 250, y: index * 200 }, // Basic vertical layout
          data: {
            id: decision.id,
            title: decision.title,
            description: decision.description,
            lifecycle: decision.lifecycle,
            health_signal: decision.health_signal,
          },
        });
      });

      // Create organizational assumption nodes (circular)
      // Only show UNIVERSAL assumptions in the graph
      orgAssumptions.forEach((assumption, index) => {
        graphNodes.push({
          id: `org-assumption-${assumption.id}`,
          type: "orgAssumption",
          position: { x: 50, y: index * 150 }, // Left side layout
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

      // Create decision-to-decision dependency edges (solid arrows)
      dependencies.forEach((dep) => {
        graphEdges.push({
          id: `dep-${dep.id}`,
          source: `decision-${dep.depends_on_decision_id}`,
          target: `decision-${dep.decision_id}`,
          type: "default",
          animated: false,
          style: { stroke: "#3b82f6", strokeWidth: 2 },
          markerEnd: {
            type: "arrowclosed",
            color: "#3b82f6",
          },
        });
      });

      // Create org assumption to decision edges (dotted lines, no arrowhead)
      decisionAssumptionLinks.forEach((link) => {
        graphEdges.push({
          id: `link-${link.assumption_id}-${link.decision_id}`,
          source: `org-assumption-${link.assumption_id}`,
          target: `decision-${link.decision_id}`,
          type: "default",
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
   * Fetch all data needed for the graph
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

      setNodes(graphNodes);
      setEdges(graphEdges);
    } catch (err) {
      console.error("❌ Error fetching graph data:", err);
      setError("Failed to load decision flow data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [transformDataToGraph, setNodes, setEdges]);

  // Fetch data on mount
  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

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
          <p className="text-gray-600">Loading decision flow...</p>
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
    <div className="relative w-full h-screen bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
      >
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === "decision") return "#3b82f6";
            if (node.type === "orgAssumption") return "#a855f7";
            return "#6b7280";
          }}
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

      {/* Instruction overlay (optional) */}
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
          <li>• Solid arrows = decision dependencies</li>
          <li>• Dotted lines = org assumption links</li>
        </ul>
      </div>
    </div>
  );
};

export default DecisionFlowGraph;
