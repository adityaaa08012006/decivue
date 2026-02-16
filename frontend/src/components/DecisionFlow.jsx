import React, { useState, useEffect } from "react";
import {
  Shield,
  FileCheck,
  AlertTriangle,
  Layers,
  Link2,
  ArrowDown,
  X,
  ChevronRight,
} from "lucide-react";
import api from "../services/api";

// Decision Card for List View
const DecisionCard = ({ decision, onClick }) => {
  const getLifecycleColor = (lifecycle) => {
    switch (lifecycle) {
      case "STABLE":
        return "bg-green-500 text-white";
      case "UNDER_REVIEW":
        return "bg-yellow-500 text-white";
      case "AT_RISK":
        return "bg-orange-500 text-white";
      case "INVALIDATED":
        return "bg-red-500 text-white";
      case "RETIRED":
        return "bg-gray-500 text-white";
      default:
        return "bg-blue-500 text-white";
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all cursor-pointer border-2 border-gray-200 hover:border-blue-400 p-4 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-lg text-gray-800 group-hover:text-blue-600 transition-colors">
            {decision.title}
          </h3>
          {decision.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {decision.description}
            </p>
          )}
        </div>
        <ChevronRight
          size={20}
          className="text-gray-400 group-hover:text-blue-500 flex-shrink-0 ml-2"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`${getLifecycleColor(decision.lifecycle)} px-3 py-1 rounded-full text-xs font-semibold`}
        >
          {decision.lifecycle}
        </span>
        <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold">
          Health: {decision.health_signal}%
        </span>
      </div>
    </div>
  );
};

// Detailed Flowchart Modal for Selected Decision
const DecisionFlowchart = ({
  decision,
  orgAssumptions,
  decisionAssumptions,
  allOrgAssumptions,
  onClose,
}) => {
  // Debug logging
  console.log("===== DecisionFlowchart Debug =====");
  console.log("Decision:", decision.title);
  console.log("Org Assumptions received:", orgAssumptions);
  console.log("Decision Assumptions received:", decisionAssumptions);
  console.log("===================================");

  const getStatusColor = (status) => {
    switch (status) {
      case "VALID":
        return "bg-green-50 border-green-300 text-green-800";
      case "SHAKY":
        return "bg-yellow-50 border-yellow-300 text-yellow-800";
      case "BROKEN":
        return "bg-red-50 border-red-300 text-red-800";
      default:
        return "bg-gray-50 border-gray-300 text-gray-800";
    }
  };

  const getLifecycleColor = (lifecycle) => {
    switch (lifecycle) {
      case "STABLE":
        return "bg-green-500 border-green-400";
      case "UNDER_REVIEW":
        return "bg-yellow-500 border-yellow-400";
      case "AT_RISK":
        return "bg-orange-500 border-orange-400";
      case "INVALIDATED":
        return "bg-red-500 border-red-400";
      case "RETIRED":
        return "bg-gray-500 border-gray-400";
      default:
        return "bg-blue-500 border-blue-400";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Decision Flowchart
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Visualizing relationships and dependencies
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Flowchart Content */}
        <div className="p-8 space-y-8">
          {/* Organizational Assumptions Section */}
          {orgAssumptions.length > 0 ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-4 shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={20} />
                  <h3 className="text-lg font-bold">
                    ORGANIZATIONAL ASSUMPTIONS
                  </h3>
                </div>
                <p className="text-purple-100 text-sm">
                  Linked to this decision ({orgAssumptions.length})
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 pl-8">
                {orgAssumptions.map((assumption) => {
                  const oaIndex = allOrgAssumptions.findIndex(
                    (oa) => oa.id === assumption.id,
                  );
                  const oaLabel = oaIndex !== -1 ? `OA-${oaIndex + 1}` : "OA-?";

                  return (
                    <div key={assumption.id} className="relative">
                      {/* Connection Line */}
                      <div className="absolute -left-8 top-0 bottom-0 flex items-center">
                        <div className="w-6 h-0.5 bg-purple-400"></div>
                        <div className="w-2 h-2 rounded-full bg-purple-500 border-2 border-white shadow"></div>
                      </div>

                      <div
                        className={`${getStatusColor(assumption.status)} rounded-lg p-3 border-2 shadow-sm`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="font-bold text-sm text-purple-700">
                            {oaLabel}:
                          </span>
                          <span className="text-sm flex-1">
                            {assumption.description}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-semibold ${
                              assumption.status === "VALID"
                                ? "bg-green-200 text-green-800"
                                : assumption.status === "SHAKY"
                                  ? "bg-yellow-200 text-yellow-800"
                                  : "bg-red-200 text-red-800"
                            }`}
                          >
                            {assumption.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-lg p-4 shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={20} />
                  <h3 className="text-lg font-bold">
                    ORGANIZATIONAL ASSUMPTIONS
                  </h3>
                </div>
                <p className="text-gray-100 text-sm">
                  No organizational assumptions linked
                </p>
              </div>
            </div>
          )}

          {/* Connection Arrow */}
          <div className="flex justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-0.5 h-12 bg-gradient-to-b from-purple-400 to-blue-400"></div>
              <ArrowDown size={32} className="text-blue-500" strokeWidth={3} />
              <div className="w-0.5 h-12 bg-gradient-to-b from-blue-400 to-blue-500"></div>
            </div>
          </div>

          {/* Decision Section */}
          <div className="relative">
            <div
              className={`${getLifecycleColor(decision.lifecycle)} text-white rounded-xl p-6 shadow-xl border-4`}
            >
              <div className="flex items-center gap-3 mb-3">
                <FileCheck size={28} strokeWidth={2.5} />
                <div>
                  <h3 className="text-2xl font-bold">DECISION</h3>
                  <p className="text-sm opacity-90">Core decision node</p>
                </div>
              </div>
              <p className="text-lg font-semibold mb-3">{decision.title}</p>
              {decision.description && (
                <p className="text-sm opacity-90 mb-3">
                  {decision.description}
                </p>
              )}
              <div className="flex items-center gap-3 pt-3 border-t border-white/30">
                <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-semibold">
                  {decision.lifecycle}
                </span>
                <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-semibold">
                  Health: {decision.health_signal}%
                </span>
              </div>
            </div>
          </div>

          {/* Connection Arrow to Decision Assumptions */}
          {decisionAssumptions.length > 0 && (
            <div className="flex justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-0.5 h-12 bg-gradient-to-b from-blue-500 to-green-400"></div>
                <ArrowDown
                  size={32}
                  className="text-green-500"
                  strokeWidth={3}
                />
                <div className="w-0.5 h-12 bg-gradient-to-b from-green-400 to-green-500"></div>
              </div>
            </div>
          )}

          {/* Decision-Specific Assumptions Section */}
          {decisionAssumptions.length > 0 && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-4 shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Layers size={20} />
                  <h3 className="text-lg font-bold">
                    DECISION-SPECIFIC ASSUMPTIONS
                  </h3>
                </div>
                <p className="text-green-100 text-sm">
                  Unique to this decision ({decisionAssumptions.length})
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 pl-8">
                {decisionAssumptions.map((assumption, idx) => (
                  <div key={assumption.id} className="relative">
                    {/* Connection Line */}
                    <div className="absolute -left-8 top-0 bottom-0 flex items-center">
                      <div className="w-6 h-0.5 bg-green-400"></div>
                      <div className="w-2 h-2 rounded-full bg-green-500 border-2 border-white shadow"></div>
                    </div>

                    <div
                      className={`${getStatusColor(assumption.status)} rounded-lg p-3 border-2 shadow-sm`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-sm text-green-700">
                          DA-{idx + 1}:
                        </span>
                        <span className="text-sm flex-1">
                          {assumption.description}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-semibold ${
                            assumption.status === "VALID"
                              ? "bg-green-200 text-green-800"
                              : assumption.status === "SHAKY"
                                ? "bg-yellow-200 text-yellow-800"
                                : "bg-red-200 text-red-800"
                          }`}
                        >
                          {assumption.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State for No Decision Assumptions */}
          {decisionAssumptions.length === 0 && (
            <div>
              <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-gray-300">
                <Layers size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600 font-medium">
                  No decision-specific assumptions
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {orgAssumptions.length > 0
                    ? "This decision relies only on organizational assumptions"
                    : "This decision has no assumptions linked"}
                </p>
              </div>
              {/* Debug Info */}
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
                <p className="font-semibold text-yellow-800">Debug Info:</p>
                <p className="text-yellow-700">
                  Decision-specific assumptions count:{" "}
                  {decisionAssumptions.length}
                </p>
                <p className="text-yellow-700">
                  Org assumptions count: {orgAssumptions.length}
                </p>
                <p className="text-yellow-700">
                  Check browser console for detailed logs
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DecisionFlow = () => {
  const [organizationalAssumptions, setOrganizationalAssumptions] = useState(
    [],
  );
  const [decisions, setDecisions] = useState([]);
  const [decisionAssumptions, setDecisionAssumptions] = useState({});
  const [decisionOrgAssumptions, setDecisionOrgAssumptions] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDecision, setSelectedDecision] = useState(null);

  useEffect(() => {
    fetchFlowData();
  }, []);

  const fetchFlowData = async () => {
    try {
      setLoading(true);

      // Fetch all required data
      const [allAssumptions, decisionsData] = await Promise.all([
        api.getAssumptions(),
        api.getDecisions(),
      ]);

      setDecisions(decisionsData || []);

      // Separate organizational (UNIVERSAL) and decision-specific assumptions
      const orgAssumptions = (allAssumptions || []).filter(
        (a) => !a.scope || a.scope === "UNIVERSAL",
      );

      // Group assumptions by decision
      const decisionAssumpMap = {};
      const decisionOrgAssumpMap = {};
      const assumptionLinksMap = {};

      for (const decision of decisionsData || []) {
        try {
          // Fetch assumptions linked to this decision via decision_assumptions junction table
          // Backend queries: decision_assumptions -> assumptions (filtered by organization_id)
          // This ensures proper linkage for all future decisions
          const linkedAssumptions = await api.getAssumptions(
            decision.id,
            false,
          );

          console.log(`\n=== Decision: ${decision.title} ===`);
          console.log(`Total linked assumptions:`, linkedAssumptions.length);
          linkedAssumptions.forEach((a, idx) => {
            console.log(
              `  [${idx + 1}] ${a.description?.substring(0, 60)}... | scope: "${a.scope}" | id: ${a.id}`,
            );
          });

          // Separate by scope field from assumptions table:
          // - DECISION_SPECIFIC: unique to this decision
          // - UNIVERSAL (or null): organizational assumptions shared across decisions
          const decisionSpecific = linkedAssumptions.filter(
            (a) => a.scope === "DECISION_SPECIFIC",
          );
          decisionAssumpMap[decision.id] = decisionSpecific;

          const orgAssumpsForDecision = linkedAssumptions.filter(
            (a) => !a.scope || a.scope === "UNIVERSAL",
          );
          decisionOrgAssumpMap[decision.id] = orgAssumpsForDecision;

          console.log(
            `  ✓ Decision-specific count: ${decisionSpecific.length}`,
          );
          console.log(
            `  ✓ Organizational count: ${orgAssumpsForDecision.length}`,
          );

          // Track which decisions each org assumption is linked to
          orgAssumpsForDecision.forEach((assump) => {
            if (!assumptionLinksMap[assump.id]) {
              assumptionLinksMap[assump.id] = [];
            }
            assumptionLinksMap[assump.id].push(decision.id);
          });
        } catch (err) {
          console.error(
            `Failed to load assumptions for decision ${decision.id}`,
            err,
          );
          decisionAssumpMap[decision.id] = [];
          decisionOrgAssumpMap[decision.id] = [];
        }
      }

      // Add linked decisions info to org assumptions
      const enrichedOrgAssumptions = orgAssumptions.map((assump) => ({
        ...assump,
        linkedDecisions: assumptionLinksMap[assump.id] || [],
      }));

      setOrganizationalAssumptions(enrichedOrgAssumptions);
      setDecisionAssumptions(decisionAssumpMap);
      setDecisionOrgAssumptions(decisionOrgAssumpMap);
    } catch (err) {
      console.error("Failed to fetch flow data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDecisionClick = (decision) => {
    setSelectedDecision(decision);
  };

  const handleCloseFlowchart = () => {
    setSelectedDecision(null);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full p-8">
          {/* Page Header */}
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-neutral-black mb-2">
              Decision Flow
            </h1>
            <p className="text-neutral-gray-600 mb-4">
              Click on any decision to visualize its complete flowchart with
              relationships
            </p>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                <FileCheck size={16} className="text-blue-600" />
                <span className="text-blue-700 font-medium">
                  {decisions.length} Decisions
                </span>
              </div>
              <div className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-lg border border-purple-200">
                <Shield size={16} className="text-purple-600" />
                <span className="text-purple-700 font-medium">
                  {organizationalAssumptions.length} Org. Assumptions
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="animate-pulse text-neutral-gray-500 text-lg">
                Loading decisions...
              </div>
            </div>
          ) : decisions.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-300 shadow-lg">
              <AlertTriangle size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 font-medium text-lg">
                No decisions yet
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Create your first decision to see the flow visualization
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {decisions.map((decision) => (
                <DecisionCard
                  key={decision.id}
                  decision={decision}
                  onClick={() => handleDecisionClick(decision)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Flowchart Modal */}
      {selectedDecision && (
        <DecisionFlowchart
          decision={selectedDecision}
          orgAssumptions={decisionOrgAssumptions[selectedDecision.id] || []}
          decisionAssumptions={decisionAssumptions[selectedDecision.id] || []}
          allOrgAssumptions={organizationalAssumptions}
          onClose={handleCloseFlowchart}
        />
      )}
    </div>
  );
};

export default DecisionFlow;
