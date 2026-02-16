import React, { useState } from "react";
import { X, FileText, Check, Calendar, AlertTriangle } from "lucide-react";

const ReviewDecisionModal = ({ decision, onClose, onSubmit }) => {
  const [reviewComment, setReviewComment] = useState("");
  const [reviewType, setReviewType] = useState("routine");
  const [reviewOutcome, setReviewOutcome] = useState("reaffirmed");
  const [deferralReason, setDeferralReason] = useState("");
  const [nextReviewDate, setNextReviewDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!decision) return null;

  const handleSubmit = async () => {
    // Validation
    if (reviewOutcome === 'deferred' && deferralReason.trim().length < 10) {
      alert('Please provide a deferral reason (minimum 10 characters)');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(decision.id, reviewComment, reviewType, reviewOutcome, deferralReason, nextReviewDate);
      onClose();
    } catch (error) {
      console.error("Failed to submit review:", error);
      alert("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const reviewTypeOptions = [
    { value: "routine", label: "Routine Review", description: "Regular periodic review" },
    { value: "conflict_resolution", label: "Conflict Resolution", description: "Review after resolving conflicts" },
    { value: "expiry_check", label: "Expiry Check", description: "Review near expiry date" },
    { value: "manual", label: "Manual Review", description: "Ad-hoc manual review" },
  ];

  const outcomeOptions = [
    { value: "reaffirmed", label: "Reaffirmed", description: "Decision remains valid", color: "green" },
    { value: "revised", label: "Revised", description: "Decision updated with changes", color: "blue" },
    { value: "escalated", label: "Escalated", description: "Requires higher-level review", color: "orange" },
    { value: "deferred", label: "Deferred", description: "Review postponed", color: "gray" },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-neutral-gray-200 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Check className="text-green-600" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-neutral-black">
                Review Decision
              </h2>
              <p className="text-sm text-neutral-gray-600 mt-1">
                {decision.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Decision Info */}
          <div className="bg-neutral-gray-50 rounded-lg p-4">
            <div className="text-sm text-neutral-gray-600 mb-1">Description</div>
            <div className="text-neutral-black">
              {decision.description || "No description provided"}
            </div>
          </div>

          {/* Review Type Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-black mb-3">
              Review Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {reviewTypeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setReviewType(option.value)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    reviewType === option.value
                      ? "border-primary-blue bg-blue-50"
                      : "border-neutral-gray-200 bg-white hover:border-neutral-gray-300"
                  }`}
                >
                  <div className="font-medium text-neutral-black mb-1">
                    {option.label}
                  </div>
                  <div className="text-xs text-neutral-gray-600">
                    {option.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Review Outcome Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-black mb-3">
              Review Outcome
            </label>
            <div className="grid grid-cols-2 gap-3">
              {outcomeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setReviewOutcome(option.value)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    reviewOutcome === option.value
                      ? `border-${option.color}-500 bg-${option.color}-50`
                      : "border-neutral-gray-200 bg-white hover:border-neutral-gray-300"
                  }`}
                >
                  <div className="font-medium text-neutral-black mb-1">
                    {option.label}
                  </div>
                  <div className="text-xs text-neutral-gray-600">
                    {option.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Deferral Reason (shown only for deferred outcome) */}
          {reviewOutcome === 'deferred' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-3">
                <AlertTriangle className="text-orange-600 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <div className="text-sm font-medium text-orange-900">Deferral Reason Required</div>
                  <div className="text-xs text-orange-700 mt-1">
                    Deferring reviews repeatedly may increase urgency scoring. Please provide a clear justification.
                  </div>
                </div>
              </div>
              <textarea
                value={deferralReason}
                onChange={(e) => setDeferralReason(e.target.value)}
                className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                rows="3"
                placeholder="Explain why this review is being deferred (minimum 10 characters)..."
              />
              <div className="text-xs text-orange-700 mt-1">
                {deferralReason.length} / 10 characters minimum
              </div>
            </div>
          )}

          {/* Next Review Date (shown for deferred or escalated) */}
          {(reviewOutcome === 'deferred' || reviewOutcome === 'escalated') && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-black mb-2">
                <Calendar size={16} />
                Next Review Date <span className="text-neutral-gray-500">(Optional)</span>
              </label>
              <input
                type="date"
                value={nextReviewDate}
                onChange={(e) => setNextReviewDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="px-3 py-2 border border-neutral-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue w-full md:w-auto"
              />
              <div className="text-xs text-neutral-gray-600 mt-1">
                Leave blank for automatic scheduling based on urgency
              </div>
            </div>
          )}

          {/* Review Comments */}
          <div>
            <label
              htmlFor="reviewComment"
              className="block text-sm font-medium text-neutral-black mb-2"
            >
              Review Comments <span className="text-neutral-gray-500">(Optional)</span>
            </label>
            <textarea
              id="reviewComment"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Add notes about your review decision, any concerns addressed, or follow-up actions needed..."
              rows={5}
              className="w-full px-4 py-3 border border-neutral-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent resize-none"
            />
            <div className="mt-2 text-xs text-neutral-gray-500">
              These comments will be recorded in the decision's version history.
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-primary-blue rounded-lg p-4">
            <div className="flex gap-3">
              <FileText className="text-primary-blue mt-0.5 flex-shrink-0" size={20} />
              <div className="text-sm text-neutral-black">
                <div className="font-medium mb-1">What happens when you review?</div>
                <ul className="space-y-1 text-neutral-gray-700">
                  <li>• Decision health is restored (unless there are active constraint violations)</li>
                  <li>• Last reviewed date is updated to now</li>
                  <li>• Review notification (if any) is dismissed</li>
                  <li>• Your comments are saved in the version history</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-neutral-gray-50 border-t border-neutral-gray-200 p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-6 py-2.5 border-2 border-neutral-gray-300 text-neutral-black font-medium rounded-lg hover:bg-neutral-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2.5 bg-primary-blue text-white font-medium rounded-lg hover:bg-blue-600 hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:transform-none flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Check size={18} />
                Submit Review
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewDecisionModal;
