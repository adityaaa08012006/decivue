import React, { useState } from "react";
import { X, Archive, AlertCircle } from "lucide-react";

const RetireDecisionModal = ({ decision, onClose, onSubmit }) => {
  const [outcome, setOutcome] = useState("");
  const [whatHappened, setWhatHappened] = useState("");
  const [whyOutcome, setWhyOutcome] = useState("");
  const [lessonsLearned, setLessonsLearned] = useState("");
  const [keyIssues, setKeyIssues] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [failureReasons, setFailureReasons] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!decision) return null;

  const handleSubmit = async () => {
    // Validation
    if (!outcome) {
      alert("Please select an outcome");
      return;
    }

    // For failed decisions, require more details
    if (outcome === "failed" && (!whyOutcome || !failureReasons)) {
      alert(
        "For failed decisions, please provide why it failed and failure reasons"
      );
      return;
    }

    try {
      setSubmitting(true);

      // Build conclusions object
      const conclusions = {};
      if (whatHappened) conclusions.what_happened = whatHappened;
      if (whyOutcome) conclusions.why_outcome = whyOutcome;
      if (lessonsLearned)
        conclusions.lessons_learned = lessonsLearned
          .split("\n")
          .filter((l) => l.trim());
      if (keyIssues)
        conclusions.key_issues = keyIssues.split("\n").filter((i) => i.trim());
      if (recommendations)
        conclusions.recommendations = recommendations
          .split("\n")
          .filter((r) => r.trim());
      if (failureReasons)
        conclusions.failure_reasons = failureReasons
          .split("\n")
          .filter((f) => f.trim());

      await onSubmit(decision.id, "manually_retired", outcome, conclusions);
      onClose();
    } catch (err) {
      alert("Failed to retire decision. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto p-4">
      <div className="bg-white rounded-2xl p-6 max-w-5xl w-full my-8 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-full">
              <Archive className="text-orange-600" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-black">
                Retire Decision
              </h2>
              <p className="text-xs text-gray-600">{decision.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-blue-600 flex-shrink-0" />
            <p className="text-xs text-blue-800">
              <span className="font-semibold">Help us learn:</span> Capture the outcome and lessons to warn others about similar decisions that failed.
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            {/* Outcome Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                What was the outcome? <span className="text-red-500">*</span>
              </label>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                required
              >
                <option value="">Select outcome...</option>
                <option value="failed">Failed - Did not work out</option>
                <option value="succeeded">
                  Succeeded - Completed successfully
                </option>
                <option value="partially_succeeded">
                  Partially Succeeded - Mixed results
                </option>
                <option value="superseded">
                  Superseded - Replaced by better decision
                </option>
                <option value="no_longer_relevant">
                  No Longer Relevant - Context changed
                </option>
              </select>
            </div>

            {/* What Happened */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                What happened with this decision?
              </label>
              <textarea
                value={whatHappened}
                onChange={(e) => setWhatHappened(e.target.value)}
                placeholder="Brief summary of what happened..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                rows={2}
              />
            </div>

            {/* Why Outcome */}
            {outcome && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Why did it have this outcome?
                  {outcome === "failed" && (
                    <span className="text-red-500"> *</span>
                  )}
                </label>
                <textarea
                  value={whyOutcome}
                  onChange={(e) => setWhyOutcome(e.target.value)}
                  placeholder={`Explain why the decision ${outcome === "failed" ? "failed" : "had this outcome"}...`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                  rows={2}
                  required={outcome === "failed"}
                />
              </div>
            )}

            {/* Failure Reasons (only for failed) */}
            {outcome === "failed" && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Specific failure reasons{" "}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={failureReasons}
                  onChange={(e) => setFailureReasons(e.target.value)}
                  placeholder="One reason per line&#10;e.g., Insufficient budget"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-xs"
                  rows={2}
                  required
                />
              </div>
            )}

            {/* Key Issues */}
            {outcome && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Key issues encountered
                </label>
                <textarea
                  value={keyIssues}
                  onChange={(e) => setKeyIssues(e.target.value)}
                  placeholder="One issue per line"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-xs"
                  rows={2}
                />
              </div>
            )}

            {/* Lessons Learned */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Lessons learned
              </label>
              <textarea
                value={lessonsLearned}
                onChange={(e) => setLessonsLearned(e.target.value)}
                placeholder="One lesson per line"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-xs"
                rows={2}
              />
            </div>

            {/* Recommendations */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Recommendations for future
              </label>
              <textarea
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                placeholder="One recommendation per line"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-xs"
                rows={2}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-4 py-2 bg-neutral-gray-100 text-neutral-gray-700 font-semibold rounded-lg hover:bg-neutral-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {submitting ? "Retiring..." : "Retire Decision"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RetireDecisionModal;
