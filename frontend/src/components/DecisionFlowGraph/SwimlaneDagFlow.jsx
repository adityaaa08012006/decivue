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
import { RefreshCw, Loader2 } from "lucide-react";

import SwimLaneDecisionCard from "./SwimLaneDecisionCard";
import DecisionDetailPanel from "./DecisionDetailPanel";
import api from "../../services/api";

import {
  applySwimLaneLayout,
  generateSwimlaneLanes,
  enrichDecisionsWithSwimLaneData,
  SWIMLANES,
} from "../../utils/swimlaneLayout";

/**
 * Swimlane DAG Flow - Professional Decision Visualization
 * 
 * Features:
 * - Horizontal Left-to-Right flow (Inputs → Decisions → Outcomes)
 * - Automatic swimlane organization by category
 * - ELK-powered auto-layout (no manual dragging)
 * - Clean orthogonal edges
 * - Professional card-based nodes
 * - Real-time health monitoring
 */
const SwimlaneDagFlow = () => {
  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isLayouting, setIsLayouting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [swimlaneLanes, setSwimlaneLanes] = useState([]);

  // Define custom node types
  const nodeTypes = useMemo(
    () => ({
      swimlaneCard: SwimLaneDecisionCard,
    }),
    []
  );

  /**
   * Transform backend data into React Flow format
   */
  const transformDataToGraph = useCallback((decisions, dependencies) => {
    const graphNodes = [];
    const graphEdges = [];

    // Enrich decisions with swimlane and stage data
    const enrichedDecisions = enrichDecisionsWithSwimLaneData(decisions, dependencies);

    // Create decision nodes
    enrichedDecisions.forEach((decision) => {
      graphNodes.push({
        id: `decision-${decision.id}`,
        type: "swimlaneCard",
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

    // Create dependency edges with clean orthogonal routing
    dependencies.forEach((dep) => {
      const sourceId = dep.source_decision_id || dep.depends_on_decision_id;
      const targetId = dep.target_decision_id || dep.decision_id;

      graphEdges.push({
        id: `dep-${dep.id || `${sourceId}-${targetId}`}`,
        source: `decision-${sourceId}`,
        target: `decision-${targetId}`,
        type: "smoothstep", // Smooth orthogonal edges
        animated: false,
        style: {
          stroke: "#3b82f6",
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#3b82f6",
          width: 20,
          height: 20,
        },
      });
    });

    return { nodes: graphNodes, edges: graphEdges };
  }, []);

  /**
   * Apply auto-layout to nodes
   */
  const layoutGraph = useCallback(
    async (graphNodes, graphEdges) => {
      setIsLayouting(true);

      try {
        // Apply ELK swimlane layout
        const layoutedNodes = await applySwimLaneLayout(graphNodes, graphEdges, {
          nodeWidth: 280,
          nodeHeight: 120,
          swimlaneSpacing: 180,
          stageSpacing: 400,
          nodeSpacing: 60,
        });

        // Generate swimlane background lanes
        const lanes = generateSwimlaneLanes(layoutedNodes, {
          swimlaneSpacing: 180,
          swimlaneHeight: 150,
        });

        setSwimlaneLanes(lanes);
        setNodes(layoutedNodes);
        setEdges(graphEdges);
      } catch (err) {
        console.error("Layout failed:", err);
        // Fallback: use nodes without layout
        setNodes(graphNodes);
        setEdges(graphEdges);
      } finally {
        setIsLayouting(false);
      }
    },
    [setNodes, setEdges]
  );

  /**
   * Fetch all graph data and apply layout
   */
  const fetchAndLayoutGraph = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch decisions
      const decisionsData = await api.getDecisions();

      console.log("📊 Fetched decisions:", decisionsData.length);

      // Fetch dependencies for all decisions
      const allDependencies = [];
      for (const decision of decisionsData || []) {
        try {
          const deps = await api.getDependencies(decision.id);

          // Extract blocking relationships (this decision blocks others)
          if (deps.blocking) {
            deps.blocking.forEach((dep) => {
              allDependencies.push({
                id: `${decision.id}-${dep.target_decision_id}`,
                source_decision_id: decision.id,
                target_decision_id: dep.target_decision_id,
              });
            });
          }
        } catch (err) {
          // No dependencies for this decision
        }
      }

      console.log("🔗 Fetched dependencies:", allDependencies.length);

      // Transform to graph format
      const { nodes: graphNodes, edges: graphEdges } = transformDataToGraph(
        decisionsData || [],
        allDependencies
      );

      // Apply auto-layout
      await layoutGraph(graphNodes, graphEdges);

      console.log("✅ Graph layouted successfully");
    } catch (err) {
      console.error("❌ Error fetching graph data:", err);
      setError("Failed to load decision flow. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [transformDataToGraph, layoutGraph]);

  // Fetch and layout on mount
  useEffect(() => {
    fetchAndLayoutGraph();
  }, [fetchAndLayoutGraph]);

  /**
   * Handle node click
   */
  const handleNodeClick = useCallback((event, node) => {
    if (node.type === "swimlaneCard") {
      console.log("🖱️ Decision clicked:", node.data.title);
      setSelectedDecision({
        id: node.data.id,
        title: node.data.title,
        description: node.data.description,
        lifecycle: node.data.lifecycle,
      });
    }
  }, []);

  /**
   * Close detail panel
   */
  const handleClosePanel = useCallback(() => {
    setSelectedDecision(null);
  }, []);

  /**
   * Refresh graph
   */
  const handleRefresh = useCallback(() => {
    fetchAndLayoutGraph();
  }, [fetchAndLayoutGraph]);

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading Decision Flow...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
            {error}
          </div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen relative bg-gray-50">
      {/* Swimlane Background Labels */}
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

      {/* Refresh Button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={handleRefresh}
          disabled={isLayouting}
          className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          title="Refresh Graph"
        >
          <RefreshCw
            className={`w-5 h-5 text-gray-700 ${isLayouting ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
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
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>

      {/* Decision Detail Panel */}
      {selectedDecision && (
        <DecisionDetailPanel
          decision={selectedDecision}
          onClose={handleClosePanel}
        />
      )}
    </div>
  );
};

export default SwimlaneDagFlow;
