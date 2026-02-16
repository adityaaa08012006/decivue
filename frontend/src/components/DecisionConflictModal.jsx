import React, { useState } from "react";
import { X, AlertTriangle, CheckCircle2 } from "lucide-react";
import api from "../services/api";

const DecisionConflictModal = ({ conflict, onClose, onResolved }) => {
  const [resolutionAction, setResolutionAction] = useState("KEEP_BOTH");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  if (!conflict) return null;

  const decisionA = conflict.decision_a;
  const decisionB = conflict.decision_b;

  const handleResolve = async () => {
    try {
      setResolving(true);
      await api.resolveDecisionConflict(
        conflict.id,
        resolutionAction,
        resolutionNotes,
      );
      onResolved();
      onClose();
    } catch (error) {
      console.error("Failed to resolve conflict:", error);
      alert("Failed to resolve conflict. Please try again.");
    } finally {
      setResolving(false);
    }
  };

  const handleMarkFalsePositive = async () => {
    if (
      !confirm(
        "Mark this as a false positive? This will delete the conflict record.",
      )
    ) {
      return;
    }

    try {
      await api.deleteDecisionConflict(conflict.id);
      onResolved();
      onClose();
    } catch (error) {
      console.error("Failed to delete conflict:", error);
      alert("Failed to delete conflict. Please try again.");
    }
  };

  const getConfidenceColor = (score) => {
    if (score >= 0.9) return "text-red-600";
    if (score >= 0.7) return "text-orange-600";
    return "text-yellow-600";
  };

  const getConflictTypeLabel = (type) => {
    const labels = {
      CONTRADICTORY: "Contradictory Decisions",
      RESOURCE_COMPETITION: "Resource Competition",
      OBJECTIVE_UNDERMINING: "Objective Undermining",
      PREMISE_INVALIDATION: "Premise Invalidation",
      MUTUALLY_EXCLUSIVE: "Mutually Exclusive",
    };
    return labels[type] || type;
  };

  const getConflictTypeDescription = (type) => {
    const descriptions = {
      CONTRADICTORY: "These decisions have directly opposing actions or goals",
      RESOURCE_COMPETITION:
        "These decisions compete for the same limited resources",
      OBJECTIVE_UNDERMINING:
        "One decision undermines the objectives of the other",
      PREMISE_INVALIDATION:
        "A newer decision invalidates the premise of an older one",
      MUTUALLY_EXCLUSIVE: "Both decisions cannot be executed simultaneously",
    };
    return descriptions[type] || "";
  };

  const resolutionOptions = [
    {
      value: "PRIORITIZE_A",
      label: "Prioritize Decision A",
      description: "Decision A takes precedence, B should be reconsidered",
    },
    {
      value: "PRIORITIZE_B",
      label: "Prioritize Decision B",
      description: "Decision B takes precedence, A should be reconsidered",
    },
    {
      value: "MODIFY_BOTH",
      label: "Modify Both",
      description: "Both decisions need adjustment to coexist",
    },
    {
      value: "DEPRECATE_BOTH",
      label: "Deprecate Both",
      description: "Both decisions are invalid and should be retired",
    },
    {
      value: "KEEP_BOTH",
      label: "Keep Both as-is",
      description: "Both can coexist, no action needed",
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-8 py-6 border-b border-neutral-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
            <h2 className="text-2xl font-bold text-neutral-black">
              Resolve Decision Conflict
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {/* Conflict Info */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-semibold text-orange-900">
                  {getConflictTypeLabel(conflict.conflict_type)}
                </span>
                <p className="text-xs text-orange-700 mt-1">
                  {getConflictTypeDescription(conflict.conflict_type)}
                </p>
              </div>
              <span
                className={`text-sm font-bold ${getConfidenceColor(conflict.confidence_score)}`}
              >
                {Math.round(conflict.confidence_score * 100)}% confidence
              </span>
            </div>
            {conflict.explanation && (
              <div className="mt-3 pt-3 border-t border-orange-200">
                <p className="text-sm font-semibold text-orange-900 mb-1">
                  Explanation:
                </p>
                <p className="text-sm text-orange-800">
                  {conflict.explanation}
                </p>
              </div>
            )}
          </div>

          {/* Side-by-side Comparison */}
          <div className="grid grid-cols-2 gap-4">
            {/* Decision A */}
            <div className="border-2 border-blue-300 rounded-xl p-5 bg-blue-50">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  A
                </div>
                <span className="font-semibold text-blue-900">Decision A</span>
              </div>
              <h3 className="text-neutral-black font-bold mb-2">
                {decisionA.title}
              </h3>
              <p className="text-neutral-gray-700 text-sm mb-3">
                {decisionA.description}
              </p>
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs px-2 py-1 bg-blue-200 text-blue-800 rounded-full font-medium">
                  {decisionA.state}
                </span>
                {decisionA.lifecycle && (
                  <span className="text-xs px-2 py-1 bg-neutral-gray-200 text-neutral-gray-700 rounded-full">
                    {decisionA.lifecycle}
                  </span>
                )}
              </div>
              {decisionA.created_at && (
                <p className="text-xs text-neutral-gray-500 mt-3">
                  Created: {new Date(decisionA.created_at).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Decision B */}
            <div className="border-2 border-purple-300 rounded-xl p-5 bg-purple-50">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                  B
                </div>
                <span className="font-semibold text-purple-900">
                  Decision B
                </span>
              </div>
              <h3 className="text-neutral-black font-bold mb-2">
                {decisionB.title}
              </h3>
              <p className="text-neutral-gray-700 text-sm mb-3">
                {decisionB.description}
              </p>
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs px-2 py-1 bg-purple-200 text-purple-800 rounded-full font-medium">
                  {decisionB.state}
                </span>
                {decisionB.lifecycle && (
                  <span className="text-xs px-2 py-1 bg-neutral-gray-200 text-neutral-gray-700 rounded-full">
                    {decisionB.lifecycle}
                  </span>
                )}
              </div>
              {decisionB.created_at && (
                <p className="text-xs text-neutral-gray-500 mt-3">
                  Created: {new Date(decisionB.created_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Resolution Action */}
          <div>
            <label className="block text-sm font-semibold text-neutral-gray-700 mb-3">
              Resolution Action
            </label>
            <div className="space-y-2">
              {resolutionOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    resolutionAction === option.value
                      ? "border-primary-blue bg-blue-50"
                      : "border-neutral-gray-200 hover:border-neutral-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="resolutionAction"
                    value={option.value}
                    checked={resolutionAction === option.value}
                    onChange={(e) => setResolutionAction(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-neutral-black">
                      {option.label}
                    </div>
                    <div className="text-sm text-neutral-gray-600">
                      {option.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Resolution Notes */}
          <div>
            <label className="block text-sm font-semibold text-neutral-gray-700 mb-2">
              Resolution Notes (Optional)
            </label>
            <textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Add any context or explanation for this resolution..."
              className="w-full p-3 border border-neutral-gray-200 rounded-xl focus:border-primary-blue focus:ring-1 focus:ring-primary-blue resize-none"
              rows="3"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-neutral-gray-200 flex items-center justify-between">
          <button
            onClick={handleMarkFalsePositive}
            className="px-4 py-2 text-neutral-gray-600 hover:text-neutral-gray-800 font-medium"
          >
            Mark as False Positive
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-neutral-gray-300 text-neutral-gray-700 font-semibold rounded-xl hover:bg-neutral-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleResolve}
              disabled={resolving}
              className="px-6 py-3 bg-primary-blue text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {resolving ? (
                "Resolving..."
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  Resolve Conflict
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DecisionConflictModal;
