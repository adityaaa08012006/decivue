/**
 * Swimlane DAG Layout Utility
 * Uses ELKjs to create a horizontal, swimlane-based layout for decisions
 * 
 * Layout Strategy:
 * - Horizontal flow: Left → Right (Inputs → Decisions → Outcomes)
 * - Swimlanes (rows): Strategy, Technical, Operations, Compliance, etc.
 * - Clean orthogonal edges (right-angle connections)
 * - Automatic node placement with no manual dragging
 */

import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

/**
 * Swimlane definitions
 * Each swimlane represents a category/domain of decisions
 */
export const SWIMLANES = {
  STRATEGY: { id: 'strategy', label: 'Strategy', order: 0, color: '#3b82f6' },
  TECHNICAL: { id: 'technical', label: 'Technical', order: 1, color: '#8b5cf6' },
  OPERATIONS: { id: 'operations', label: 'Operations', order: 2, color: '#06b6d4' },
  COMPLIANCE: { id: 'compliance', label: 'Compliance', order: 3, color: '#10b981' },
  FINANCIAL: { id: 'financial', label: 'Financial', order: 4, color: '#f59e0b' },
  OTHER: { id: 'other', label: 'Other', order: 5, color: '#6b7280' },
};

/**
 * Stage definitions (columns)
 * Each stage represents a phase in the decision flow
 */
export const STAGES = {
  INPUT: { id: 'input', label: 'Inputs', order: 0 },
  DECISION: { id: 'decision', label: 'Decisions', order: 1 },
  OUTCOME: { id: 'outcome', label: 'Outcomes', order: 2 },
};

/**
 * Determine swimlane for a decision based on metadata or type
 */
export const getDecisionSwimlane = (decision) => {
  const category = decision.metadata?.category || decision.category;
  
  if (!category) return SWIMLANES.OTHER.id;
  
  const normalized = category.toLowerCase();
  
  if (normalized.includes('strategy') || normalized.includes('strategic')) {
    return SWIMLANES.STRATEGY.id;
  }
  if (normalized.includes('technical') || normalized.includes('tech') || normalized.includes('engineering')) {
    return SWIMLANES.TECHNICAL.id;
  }
  if (normalized.includes('operation') || normalized.includes('ops')) {
    return SWIMLANES.OPERATIONS.id;
  }
  if (normalized.includes('compliance') || normalized.includes('legal') || normalized.includes('regulatory')) {
    return SWIMLANES.COMPLIANCE.id;
  }
  if (normalized.includes('financial') || normalized.includes('budget') || normalized.includes('finance')) {
    return SWIMLANES.FINANCIAL.id;
  }
  
  return SWIMLANES.OTHER.id;
};

/**
 * Determine stage for a decision based on dependencies
 * - INPUT: No dependencies (source nodes)
 * - DECISION: Has dependencies and dependents
 * - OUTCOME: Has no dependents (leaf nodes)
 */
export const getDecisionStage = (decision, allDependencies) => {
  const hasDependencies = allDependencies.some(dep => 
    dep.target === `decision-${decision.id}` || dep.target === decision.id
  );
  const hasDependents = allDependencies.some(dep => 
    dep.source === `decision-${decision.id}` || dep.source === decision.id
  );
  
  if (!hasDependencies && hasDependents) return STAGES.INPUT.id;
  if (hasDependencies && !hasDependents) return STAGES.OUTCOME.id;
  return STAGES.DECISION.id;
};

/**
 * Apply ELK layout algorithm to nodes and edges
 * Returns positioned nodes ready for React Flow
 */
export const applySwimLaneLayout = async (nodes, edges, options = {}) => {
  const {
    nodeWidth = 280,
    nodeHeight = 120,
    swimlaneSpacing = 200,
    stageSpacing = 450,
    nodeSpacing = 100,
  } = options;

  // Group nodes by swimlane
  const swimlaneGroups = {};
  nodes.forEach(node => {
    const swimlane = node.data.swimlane || SWIMLANES.OTHER.id;
    if (!swimlaneGroups[swimlane]) {
      swimlaneGroups[swimlane] = [];
    }
    swimlaneGroups[swimlane].push(node);
  });

  // Build ELK graph structure with swimlane constraints
  const elkNodes = nodes.map(node => {
    const swimlane = node.data.swimlane || SWIMLANES.OTHER.id;
    const swimlaneInfo = Object.values(SWIMLANES).find(s => s.id === swimlane) || SWIMLANES.OTHER;
    
    return {
      id: node.id,
      width: nodeWidth,
      height: nodeHeight,
      // Add swimlane constraint to keep nodes in their row
      layoutOptions: {
        'org.eclipse.elk.layered.layering.strategy': 'LONGEST_PATH',
        'org.eclipse.elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
        'partitioning.partition': swimlaneInfo.order, // This ensures swimlane separation
      },
    };
  });

  const elkEdges = edges.map(edge => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }));

  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT', // Left-to-right flow
      'elk.layered.spacing.nodeNodeBetweenLayers': stageSpacing,
      'elk.layered.spacing.nodeNode': nodeSpacing,
      'elk.spacing.nodeNode': nodeSpacing,
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.edgeRouting': 'ORTHOGONAL', // Clean right-angle edges
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.layered.crossingMinimization.semiInteractive': true,
      'elk.padding': '[top=50,left=50,bottom=50,right=50]',
      'elk.spacing.edgeNode': 50,
      'elk.spacing.edgeEdge': 30,
      'elk.layered.unnecessaryBendpoints': false,
      'elk.layered.spacing.edgeNodeBetweenLayers': 50,
    },
    children: elkNodes,
    edges: elkEdges,
  };

  try {
    // Run ELK layout algorithm
    const layoutedGraph = await elk.layout(elkGraph);

    // Transform ELK output back to React Flow format
    const layoutedNodes = nodes.map(node => {
      const elkNode = layoutedGraph.children.find(n => n.id === node.id);
      
      if (!elkNode) return node;

      // Apply swimlane-based y-offset to group nodes by row
      const swimlane = node.data.swimlane || SWIMLANES.OTHER.id;
      const swimlaneInfo = Object.values(SWIMLANES).find(s => s.id === swimlane) || SWIMLANES.OTHER;
      const swimlaneYOffset = swimlaneInfo.order * swimlaneSpacing;

      return {
        ...node,
        position: {
          x: elkNode.x,
          y: elkNode.y + swimlaneYOffset, // Apply swimlane offset
        },
        // Mark as positioned so React Flow doesn't override
        draggable: true,
      };
    });

    return layoutedNodes;
  } catch (error) {
    console.error('ELK layout failed:', error);
    // Return original nodes if layout fails
    return nodes;
  }
};

/**
 * Create swimlane background elements for visualization
 * Returns array of swimlane metadata for rendering
 */
export const generateSwimlaneLanes = (nodes, options = {}) => {
  const {
    swimlaneSpacing = 200,
    swimlaneHeight = 170,
  } = options;

  // Determine which swimlanes are in use
  const usedSwimlanes = new Set();
  nodes.forEach(node => {
    const swimlane = node.data.swimlane || SWIMLANES.OTHER.id;
    usedSwimlanes.add(swimlane);
  });

  // Create swimlane background data
  const lanes = Object.values(SWIMLANES)
    .filter(swimlane => usedSwimlanes.has(swimlane.id))
    .sort((a, b) => a.order - b.order)
    .map(swimlane => ({
      id: swimlane.id,
      label: swimlane.label,
      color: swimlane.color,
      y: swimlane.order * swimlaneSpacing,
      height: swimlaneHeight,
    }));

  return lanes;
};

/**
 * Utility: Assign swimlanes and stages to decisions automatically
 */
export const enrichDecisionsWithSwimLaneData = (decisions, dependencies) => {
  return decisions.map(decision => {
    const swimlane = getDecisionSwimlane(decision);
    const stage = getDecisionStage(decision, dependencies);
    
    return {
      ...decision,
      swimlane,
      stage,
    };
  });
};
