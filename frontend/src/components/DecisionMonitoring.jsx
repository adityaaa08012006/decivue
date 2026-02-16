import React, { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingDown,
  Link2,
  Target,
  Shield,
  Lock,
  Activity,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  X,
  Check,
  Archive,
  History,
  Sparkles,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import DecisionVersionsModal from "./DecisionVersionsModal";
import ReviewDecisionModal from "./ReviewDecisionModal";

const DecisionMonitoring = ({ onAddDecision, onEditDecision }) => {
  const { user, isLead } = useAuth();
  const [decisions, setDecisions] = useState([]);
  const [expandedDecision, setExpandedDecision] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDecisionForVersions, setSelectedDecisionForVersions] =
    useState(null);
  const [reviewDecision, setReviewDecision] = useState(null); // For review modal
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }
  const [deleteConfirmation, setDeleteConfirmation] = useState(null); // { id, title }
  const [retireConfirmation, setRetireConfirmation] = useState(null); // { id, title }
  const [currentTime, setCurrentTime] = useState(new Date()); // Track simulated time

  // Store related data for each decision
  const [decisionData, setDecisionData] = useState({});

  useEffect(() => {
    fetchDecisions();
    fetchCurrentTime(); // Fetch simulated time on mount
  }, []);

  // Fetch current time (could be simulated)
  const fetchCurrentTime = async () => {
    try {
      const response = await api.getCurrentTime();
      setCurrentTime(
        new Date(response.currentTime || response.date || Date.now()),
      );
    } catch (err) {
      // If endpoint doesn't exist yet, fallback to real time
      setCurrentTime(new Date());
    }
  };

  // Fetch additional data when a decision is expanded
  useEffect(() => {
    if (expandedDecision) {
      fetchDecisionDetails(expandedDecision);
    }
  }, [expandedDecision]);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  const fetchDecisions = async () => {
    try {
      setLoading(true);
      const data = await api.getDecisions();
      setDecisions(data);
      setError(null);

      // Smart evaluation: Use batch endpoint to only evaluate what's needed
      smartEvaluateDecisions();
    } catch (err) {
      console.error("Failed to fetch decisions:", err);
      setError(
        "Failed to load decisions. Please make sure the backend is running.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Smart evaluation: Only evaluates decisions that actually need it
  const smartEvaluateDecisions = async () => {
    try {
      console.log("🔄 Running smart evaluation...");

      // Call batch evaluate endpoint (it will only evaluate what's needed)
      const result = await api.post("/decisions/batch-evaluate", {
        // Don't pass decisionIds - let backend decide what needs evaluation
        force: false, // Only evaluate if actually needed
      });

      console.log(`✅ Smart evaluation complete:`, {
        evaluated: result.evaluated,
        skipped: result.skipped,
        failed: result.failed,
      });

      // Only refresh if any evaluations actually ran
      if (result.evaluated > 0) {
        const updatedData = await api.getDecisions();
        setDecisions(updatedData);
      }
    } catch (err) {
      console.error("Smart evaluation failed:", err);
      // Don't show error to user - evaluation is background task
    }
  };

  // Legacy auto-evaluate for backwards compatibility (now uses smart logic)
  const autoEvaluateDecisions = async (decisionsList) => {
    console.log(
      "⚠️ Legacy auto-evaluate called - redirecting to smart evaluation",
    );
    await smartEvaluateDecisions();
  };

  const fetchDecisionDetails = async (decisionId) => {
    try {
      // Fetch assumptions, dependencies, constraints, violations, and conflicts in parallel
      const [
        assumptions,
        dependencies,
        constraints,
        violations,
        allConflicts,
        allDecisionConflicts,
      ] = await Promise.all([
        api.getAssumptions(decisionId).catch(() => []),
        api
          .getDependencies(decisionId)
          .catch(() => ({ dependsOn: [], blocks: [] })),
        api.getConstraints(decisionId).catch(() => []),
        api.getConstraintViolations(decisionId).catch(() => []),
        api.getAssumptionConflicts(false).catch(() => []),
        api.getDecisionConflictsForDecision(decisionId).catch(() => []),
      ]);

      // Filter conflicts that involve this decision's assumptions
      const assumptionIds = assumptions.map((a) => a.id);
      const conflictsForDecision = allConflicts.filter(
        (conflict) =>
          assumptionIds.includes(conflict.assumption_a_id) ||
          assumptionIds.includes(conflict.assumption_b_id),
      );

      console.log(`📋 Fetched data for decision ${decisionId}:`, {
        assumptions: assumptions?.length || 0,
        dependencies: dependencies,
        constraints: constraints?.length || 0,
        assumptionConflicts: conflictsForDecision?.length || 0,
        decisionConflicts: allDecisionConflicts?.length || 0,
      });

      setDecisionData((prev) => ({
        ...prev,
        [decisionId]: {
          assumptions,
          dependencies,
          constraints,
          violations,
          conflicts: conflictsForDecision,
          decisionConflicts: allDecisionConflicts,
        },
      }));
    } catch (err) {
      console.error("Failed to fetch decision details:", err);
    }
  };

  // Derive effective lifecycle from health score to keep them in sync
  const getEffectiveLifecycle = (decision) => {
    const { healthSignal, lifecycle } = decision;

    // If manually set to RETIRED or INVALIDATED, respect that
    if (lifecycle === "RETIRED" || lifecycle === "INVALIDATED") {
      return lifecycle;
    }

    // Check if any assumptions are in conflict or if decision has conflicts
    const details = decisionData[decision.id];
    const hasAssumptionConflicts =
      details?.conflicts && details.conflicts.length > 0;
    const hasDecisionConflicts =
      details?.decisionConflicts && details.decisionConflicts.length > 0;

    if (hasAssumptionConflicts || hasDecisionConflicts) {
      // Decision has conflicts - cannot be healthy
      return healthSignal < 65 ? "AT_RISK" : "UNDER_REVIEW";
    }

    // Otherwise, sync with health
    if (healthSignal < 65) return "AT_RISK";
    if (healthSignal < 85) return "UNDER_REVIEW";
    return "STABLE";
  };

  const getStatusColor = (lifecycle) => {
    switch (lifecycle) {
      case "STABLE":
        return "bg-teal-500 text-white";
      case "UNDER_REVIEW":
        return "bg-blue-500 text-white";
      case "AT_RISK":
        return "bg-orange-500 text-white";
      case "INVALIDATED":
        return "bg-red-500 text-white";
      case "RETIRED":
        return "bg-gray-400 text-white";
      default:
        return "bg-gray-400 text-white";
    }
  };

  const getHealthColor = (health) => {
    if (health >= 80) return "text-teal-600";
    if (health >= 60) return "text-orange-500";
    return "text-red-500";
  };

  const getHealthBand = (health) => {
    if (health >= 85)
      return {
        label: "Good",
        color: "bg-teal-500",
        textColor: "text-teal-700",
      };
    if (health >= 65)
      return {
        label: "Needs review",
        color: "bg-amber-400",
        textColor: "text-amber-700",
      };
    return {
      label: "At risk",
      color: "bg-rose-500",
      textColor: "text-rose-700",
    };
  };

  const getFreshnessBand = (freshness) => {
    if (freshness >= 85)
      return {
        label: "Fresh",
        color: "bg-teal-500",
        textColor: "text-teal-700",
      };
    if (freshness >= 65)
      return {
        label: "Needs review",
        color: "bg-amber-400",
        textColor: "text-amber-700",
      };
    return { label: "Stale", color: "bg-rose-500", textColor: "text-rose-700" };
  };

  const getConsistencyBand = (consistency) => {
    if (consistency >= 85)
      return {
        label: "On track",
        color: "bg-teal-500",
        textColor: "text-teal-700",
      };
    if (consistency >= 65)
      return {
        label: "Minor drift",
        color: "bg-amber-400",
        textColor: "text-amber-700",
      };
    return {
      label: "Needs attention",
      color: "bg-rose-500",
      textColor: "text-rose-700",
    };
  };

  const getDecayScore = (lastReviewedAt) => {
    const now = new Date();
    const lastReview = new Date(lastReviewedAt);
    const daysSinceReview = Math.floor(
      (now - lastReview) / (1000 * 60 * 60 * 24),
    );

    // Decay: 100% at 0 days, decreases by ~2% per day
    const decay = Math.max(0, Math.min(100, 100 - daysSinceReview * 2));
    return decay;
  };

  const getConsistencyScore = (healthSignal, lifecycle) => {
    // Simple consistency calculation based on health-lifecycle alignment
    if (lifecycle === "STABLE" && healthSignal >= 80) return 95;
    if (lifecycle === "UNDER_REVIEW" && healthSignal >= 60) return 80;
    if (lifecycle === "AT_RISK" && healthSignal >= 40) return 65;
    return 50;
  };

  const getLifecycleStages = () => [
    "STABLE",
    "UNDER_REVIEW",
    "AT_RISK",
    "INVALIDATED",
    "RETIRED",
  ];

  const calculateDrift = (healthSignal, decayScore) => {
    return Math.abs(healthSignal - decayScore);
  };

  const filteredDecisions =
    filterStatus === "all"
      ? decisions.filter(
          (d) => d.lifecycle !== "RETIRED" && d.lifecycle !== "INVALIDATED",
        )
      : decisions.filter((d) => {
          if (filterStatus === "active") return d.lifecycle === "STABLE";
          if (filterStatus === "at-risk")
            return d.lifecycle === "AT_RISK" || d.lifecycle === "UNDER_REVIEW";
          if (filterStatus === "deprecated")
            return d.lifecycle === "INVALIDATED" || d.lifecycle === "RETIRED";
          return true;
        });

  // Calculate counts for each filter status
  const getCountForStatus = (status) => {
    if (status === "all")
      return decisions.filter(
        (d) => d.lifecycle !== "RETIRED" && d.lifecycle !== "INVALIDATED",
      ).length;
    if (status === "active")
      return decisions.filter((d) => d.lifecycle === "STABLE").length;
    if (status === "at-risk")
      return decisions.filter(
        (d) => d.lifecycle === "AT_RISK" || d.lifecycle === "UNDER_REVIEW",
      ).length;
    if (status === "deprecated")
      return decisions.filter(
        (d) => d.lifecycle === "INVALIDATED" || d.lifecycle === "RETIRED",
      ).length;
    return 0;
  };

  const toggleExpand = (id) => {
    setExpandedDecision(expandedDecision === id ? null : id);
  };

  const handleDeleteDecision = (decisionId, decisionTitle) => {
    setDeleteConfirmation({ id: decisionId, title: decisionTitle });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;

    try {
      await api.deleteDecision(deleteConfirmation.id);
      await fetchDecisions(); // Refresh the list
      showToast(
        "success",
        `Decision "${deleteConfirmation.title}" deleted successfully`,
      );
      setDeleteConfirmation(null);
    } catch (err) {
      console.error("Failed to delete decision:", err);
      showToast("error", "Failed to delete decision. Please try again.");
      setDeleteConfirmation(null);
    }
  };

  const handleMarkReviewed = (decisionId, decisionTitle) => {
    const decision = decisions.find((d) => d.id === decisionId);
    if (decision) {
      setReviewDecision(decision);
    }
  };

  const handleSubmitReview = async (decisionId, reviewComment, reviewType, reviewOutcome, deferralReason, nextReviewDate) => {
    try {
      await api.markDecisionReviewed(decisionId, reviewComment, reviewType, reviewOutcome, deferralReason, nextReviewDate);
      // Refresh the list WITHOUT auto-evaluation to preserve the reviewed state
      const data = await api.getDecisions();
      setDecisions(data);
      const decision = decisions.find((d) => d.id === decisionId);
      showToast("success", `"${decision?.title}" marked as reviewed with outcome: ${reviewOutcome}`);
    } catch (err) {
      console.error("Failed to mark decision as reviewed:", err);
      const errorMessage =
        err.message || "Failed to mark as reviewed. Please try again.";
      showToast("error", errorMessage);
      throw err; // Re-throw so modal knows it failed
    }
  };

  const handleRetireDecision = (decisionId, decisionTitle) => {
    setRetireConfirmation({ id: decisionId, title: decisionTitle });
  };

  const confirmRetire = async () => {
    if (!retireConfirmation) return;

    try {
      await api.retireDecision(retireConfirmation.id, "manually_retired");
      await fetchDecisions(); // Refresh the list
      showToast(
        "success",
        `Decision "${retireConfirmation.title}" has been retired`,
      );
      setRetireConfirmation(null);
    } catch (err) {
      console.error("Failed to retire decision:", err);
      showToast("error", "Failed to retire decision. Please try again.");
      setRetireConfirmation(null);
    }
  };

  const handleEvaluateNow = async (decisionId, decisionTitle) => {
    try {
      console.log("🔄 Starting evaluation for:", decisionId, decisionTitle);
      showToast("info", `Evaluating "${decisionTitle}"...`);

      const result = await api.evaluateDecision(decisionId);
      console.log("✅ Evaluation result:", result);

      await fetchDecisions(); // Refresh the list to show updated health

      // Show detailed result
      const healthChange = result.evaluation?.healthChange || 0;
      const lifecycleChanged = result.evaluation?.lifecycleChanged;

      let message = `Evaluation complete for "${decisionTitle}". `;
      if (healthChange > 0) {
        message += `Health improved by ${healthChange} points! ✨`;
      } else if (healthChange < 0) {
        message += `Health decreased by ${Math.abs(healthChange)} points. ⚠️`;
      } else {
        message += `Health unchanged (${result.evaluation?.newHealth}/100).`;
      }

      if (lifecycleChanged) {
        message += ` Lifecycle changed to ${result.evaluation?.newLifecycle}.`;
      }

      showToast(healthChange >= 0 ? "success" : "warning", message);
    } catch (err) {
      console.error("❌ Failed to evaluate decision:", err);
      showToast(
        "error",
        `Failed to evaluate "${decisionTitle}". Error: ${err.message}`,
      );
    }
  };

  const handleResolveViolation = async (violationId, decisionId) => {
    try {
      await api.resolveConstraintViolation(violationId);
      // Refresh decision details to update violations list
      await fetchDecisionDetails(decisionId);
      showToast("success", "Constraint violation marked as resolved");
    } catch (err) {
      console.error("Failed to resolve violation:", err);
      showToast("error", "Failed to resolve violation. Please try again.");
    }
  };

  const handleToggleLock = async (decisionId, currentlyLocked, decisionTitle) => {
    try {
      const action = currentlyLocked ? "unlock" : "lock";
      console.log(`🔒 ${action}ing decision:`, decisionId);
      
      await api.toggleDecisionLock(decisionId, {
        lock: !currentlyLocked,
        reason: currentlyLocked 
          ? "Unlocking decision for editing" 
          : "Locking decision to prevent unauthorized changes"
      });
      
      showToast("success", `Decision "${decisionTitle}" ${currentlyLocked ? "unlocked" : "locked"} successfully`);
      
      // Refresh decisions to show updated lock status
      await fetchDecisions();
    } catch (err) {
      console.error("Failed to toggle lock:", err);
      showToast("error", `Failed to ${currentlyLocked ? "unlock" : "lock"} decision. ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-white p-8">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 transition-all duration-300 ease-out">
          <div
            className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg max-w-md ${
              toast.type === "success"
                ? "bg-teal-500 text-white"
                : "bg-red-500 text-white"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle size={20} className="flex-shrink-0" />
            ) : (
              <XCircle size={20} className="flex-shrink-0" />
            )}
            <span className="flex-1 font-medium">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="flex-shrink-0 hover:opacity-80 transition-opacity"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
              <AlertCircle className="text-red-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-neutral-black mb-2 text-center">
              Delete Decision?
            </h2>
            <p className="text-neutral-gray-600 mb-6 text-center">
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                "{deleteConfirmation.title}"
              </span>
              ?
            </p>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-orange-800">
                <strong>Warning:</strong> This action cannot be undone. All
                related assumptions, dependencies, and constraints will be
                unlinked.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="flex-1 px-6 py-3 bg-neutral-gray-100 text-neutral-gray-700 font-semibold rounded-xl hover:bg-neutral-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Retire Confirmation Modal */}
      {retireConfirmation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mx-auto mb-4">
              <Archive className="text-orange-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-neutral-black mb-2 text-center">
              Retire Decision?
            </h2>
            <p className="text-neutral-gray-600 mb-6 text-center">
              Are you sure you want to retire{" "}
              <span className="font-semibold">
                "{retireConfirmation.title}"
              </span>
              ?
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> This action marks the decision as
                deprecated and final. The decision will be set to RETIRED
                lifecycle and cannot be reviewed.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setRetireConfirmation(null)}
                className="flex-1 px-6 py-3 bg-neutral-gray-100 text-neutral-gray-700 font-semibold rounded-xl hover:bg-neutral-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRetire}
                className="flex-1 px-6 py-3 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 transition-colors"
              >
                Retire
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">
              Decision Monitoring
            </h1>
            <p className="text-gray-600">
              Keep track of how your decisions are doing
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onAddDecision}
              className="px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-sm font-medium"
            >
              <Plus size={18} />
              Add Decision
            </button>
            <button
              onClick={fetchDecisions}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2">
        {["all", "active", "at-risk", "deprecated"].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
              filterStatus === status
                ? "bg-blue-500 text-white shadow-md"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
            <span className="ml-2 text-sm opacity-80">
              ({getCountForStatus(status)})
            </span>
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-500 mb-4"></div>
          <p className="text-gray-700">Loading your decisions...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 shadow-sm">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Decisions List */}
      {!loading && !error && (
        <div className="space-y-4">
          {filteredDecisions.map((decision) => {
            const effectiveLifecycle = getEffectiveLifecycle(decision);
            const decayScore = getDecayScore(decision.lastReviewedAt);
            const consistencyScore = getConsistencyScore(
              decision.healthSignal,
              decision.lifecycle,
            );
            const drift = calculateDrift(decision.healthSignal, decayScore);

            return (
              <div
                key={decision.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
              >
                {/* Decision Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => toggleExpand(decision.id)}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-mono text-gray-500">
                          {decision.id.slice(0, 8)}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-md text-xs font-semibold ${getStatusColor(effectiveLifecycle)}`}
                        >
                          {effectiveLifecycle.replace("_", " ")}
                        </span>
                        {/* Assumption Conflict Warning Badge */}
                        {decisionData[decision.id]?.conflicts?.length > 0 && (
                          <span className="px-3 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700 border border-red-300 flex items-center gap-1">
                            ⚠️ {decisionData[decision.id].conflicts.length}{" "}
                            Assumption Conflict
                            {decisionData[decision.id].conflicts.length > 1
                              ? "s"
                              : ""}
                          </span>
                        )}
                        {/* Decision Conflict Warning Badge */}
                        {decisionData[decision.id]?.decisionConflicts?.length >
                          0 && (
                          <span className="px-3 py-1 rounded-md text-xs font-bold bg-orange-100 text-orange-700 border border-orange-300 flex items-center gap-1">
                            🔀{" "}
                            {decisionData[decision.id].decisionConflicts.length}{" "}
                            Decision Conflict
                            {decisionData[decision.id].decisionConflicts
                              .length > 1
                              ? "s"
                              : ""}
                          </span>
                        )}
                        {/* Locked Badge */}
                        {decision.lockedAt && (
                          <span className="px-3 py-1 rounded-md text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300 flex items-center gap-1">
                            <Lock size={12} />
                            Locked
                          </span>
                        )}
                        {/* Governance Tier Badge */}
                        {decision.governanceTier && decision.governanceTier !== 'standard' && (
                          <span className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1 ${
                            decision.governanceTier === 'critical' 
                              ? 'bg-red-100 text-red-700 border border-red-300'
                              : decision.governanceTier === 'high_impact'
                              ? 'bg-orange-100 text-orange-700 border border-orange-300'
                              : 'bg-blue-100 text-blue-700 border border-blue-300'
                          }`}>
                            <Shield size={12} />
                            {decision.governanceTier.replace('_', ' ').toUpperCase()}
                          </span>
                        )}
                        {/* Expiry Badge */}
                        {decision.expiryDate &&
                          (() => {
                            const expiryDate = new Date(decision.expiryDate);
                            const now = currentTime;
                            const daysUntilExpiry = Math.floor(
                              (expiryDate - now) / (1000 * 60 * 60 * 24),
                            );
                            const isExpired = daysUntilExpiry < 0;

                            if (isExpired) {
                              return (
                                <span className="px-3 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700 border border-red-300 animate-pulse">
                                  ⚠️ EXPIRED
                                </span>
                              );
                            } else if (daysUntilExpiry <= 30) {
                              return (
                                <span className="px-3 py-1 rounded-md text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-300">
                                  ⏰ {daysUntilExpiry}d to expiry
                                </span>
                              );
                            }
                            return null;
                          })()}
                        <span className="text-xs text-gray-500">
                          {effectiveLifecycle === "STABLE"
                            ? "active"
                            : effectiveLifecycle === "RETIRED"
                              ? "deprecated"
                              : "planning"}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-black mb-3">
                        {decision.title}
                      </h3>

                      {/* Key Metrics - Feature 1, 5, 7 */}
                      <div className="flex gap-4 flex-wrap">
                        {/* Health Metric */}
                        <div
                          className="flex items-center gap-2 cursor-help"
                          title={`Health: ${decision.healthSignal}%`}
                          aria-label={`Health ${decision.healthSignal}%`}
                        >
                          <Activity
                            size={16}
                            className={
                              getHealthBand(decision.healthSignal).textColor
                            }
                          />
                          <span className="text-sm text-gray-700">
                            Health:{" "}
                            <span
                              className={`font-semibold ${getHealthBand(decision.healthSignal).textColor}`}
                            >
                              {getHealthBand(decision.healthSignal).label}
                            </span>
                          </span>
                        </div>

                        {/* Freshness Metric */}
                        <div
                          className="flex items-center gap-2 cursor-help"
                          title={`Freshness: ${decayScore}%`}
                          aria-label={`Freshness ${decayScore}%`}
                        >
                          <TrendingDown
                            size={16}
                            className={getFreshnessBand(decayScore).textColor}
                          />
                          <span className="text-sm text-gray-700">
                            Freshness:{" "}
                            <span
                              className={`font-semibold ${getFreshnessBand(decayScore).textColor}`}
                            >
                              {getFreshnessBand(decayScore).label}
                            </span>
                          </span>
                        </div>

                        {/* Consistency Metric */}
                        <div
                          className="flex items-center gap-2 cursor-help"
                          title={`Consistency: ${consistencyScore}%`}
                          aria-label={`Consistency ${consistencyScore}%`}
                        >
                          <Target
                            size={16}
                            className={
                              getConsistencyBand(consistencyScore).textColor
                            }
                          />
                          <span className="text-sm text-gray-700">
                            Consistency:{" "}
                            <span
                              className={`font-semibold ${getConsistencyBand(consistencyScore).textColor}`}
                            >
                              {getConsistencyBand(consistencyScore).label}
                            </span>
                          </span>
                        </div>

                        {/* Drift Warning */}
                        {drift > 10 && (
                          <div className="flex items-center gap-2">
                            <AlertCircle
                              size={16}
                              className="text-orange-500"
                            />
                            <span className="text-sm text-orange-600 font-semibold">
                              Drifting
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Lock/Unlock Button - Team Leads Only */}
                      {isLead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleLock(decision.id, decision.lockedAt, decision.title);
                          }}
                          className={`p-2 rounded-lg transition-colors ${
                            decision.lockedAt
                              ? 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                          }`}
                          title={decision.lockedAt ? "Unlock decision (allow editing)" : "Lock decision (prevent editing)"}
                        >
                          <Lock size={18} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDecisionForVersions(decision);
                        }}
                        className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="View version history"
                      >
                        <History size={18} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEvaluateNow(decision.id, decision.title);
                        }}
                        disabled={decision.lifecycle === "RETIRED" || (decision.lockedAt && !isLead)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={
                          decision.lifecycle === "RETIRED"
                            ? "Cannot evaluate retired decisions"
                            : decision.lockedAt && !isLead
                            ? "Decision is locked (team lead access only)"
                            : "Evaluate now"
                        }
                      >
                        <RefreshCw size={18} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkReviewed(decision.id, decision.title);
                        }}
                        disabled={
                          (decision.lockedAt && !isLead) ||
                          decision.lifecycle === "RETIRED" ||
                          (decision.expiryDate &&
                            (() => {
                              const expiryDate = new Date(decision.expiryDate);
                              const now = currentTime;
                              const daysUntilExpiry =
                                (expiryDate - now) / (1000 * 60 * 60 * 24);
                              return daysUntilExpiry < -30;
                            })())
                        }
                        className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={
                          decision.lockedAt && !isLead
                            ? "Decision is locked (team lead access only)"
                            : decision.lifecycle === "RETIRED"
                            ? "Cannot review retired decisions"
                            : "Mark as reviewed"
                        }
                      >
                        <Check size={18} />
                      </button>
                      {decision.lifecycle !== "RETIRED" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRetireDecision(decision.id, decision.title);
                          }}
                          disabled={decision.lockedAt && !isLead}
                          className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={
                            decision.lockedAt && !isLead
                              ? "Decision is locked (team lead access only)"
                              : "Retire decision (mark as deprecated)"
                          }
                        >
                          <Archive size={18} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDecision(decision.id, decision.title);
                        }}
                        disabled={decision.lockedAt && !isLead}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={
                          decision.lockedAt && !isLead
                            ? "Decision is locked (team lead access only)"
                            : "Delete decision"
                        }
                      >
                        <Trash2 size={18} />
                      </button>
                      <button
                        onClick={() => toggleExpand(decision.id)}
                        className="text-gray-400 hover:text-blue-500 transition-colors"
                      >
                        {expandedDecision === decision.id ? (
                          <ChevronUp size={24} />
                        ) : (
                          <ChevronDown size={24} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Quick Info */}
                  <div className="mt-4 flex gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} className="text-gray-400" />
                      Created:{" "}
                      {new Date(decision.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} className="text-gray-400" />
                      Last Review:{" "}
                      {new Date(decision.lastReviewedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedDecision === decision.id && (
                  <div className="border-t border-gray-200 bg-gray-50 p-6 space-y-6">
                    {/* Feature 1: Lifecycle Progress */}
                    <div>
                      <h4 className="font-semibold text-black mb-3 flex items-center gap-2">
                        <Activity size={18} className="text-blue-600" />
                        Lifecycle Stage
                      </h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        {[
                          "planning",
                          "implementation",
                          "active",
                          "review",
                          "deprecated",
                        ].map((stage, index) => {
                          const stageLower = decision.lifecycle
                            .toLowerCase()
                            .replace("_", " ");
                          const isCurrent =
                            stageLower === stage ||
                            (decision.lifecycle === "STABLE" &&
                              stage === "active") ||
                            (decision.lifecycle === "UNDER_REVIEW" &&
                              stage === "review") ||
                            (decision.lifecycle === "RETIRED" &&
                              stage === "deprecated");
                          const currentStageIndex = [
                            "planning",
                            "implementation",
                            "active",
                            "review",
                            "deprecated",
                          ].indexOf(
                            decision.lifecycle === "STABLE"
                              ? "active"
                              : decision.lifecycle === "UNDER_REVIEW"
                                ? "review"
                                : decision.lifecycle === "RETIRED"
                                  ? "deprecated"
                                  : decision.lifecycle === "AT_RISK"
                                    ? "review"
                                    : "planning",
                          );
                          const isPast = index < currentStageIndex;

                          return (
                            <React.Fragment key={stage}>
                              <div
                                className={`px-4 py-2 rounded-lg text-xs font-medium ${
                                  isCurrent
                                    ? "bg-blue-500 text-white"
                                    : isPast
                                      ? "bg-teal-500 text-white"
                                      : "bg-white text-gray-400 border border-gray-200"
                                }`}
                              >
                                {stage}
                              </div>
                              {index < 4 && (
                                <div
                                  className={`h-0.5 w-6 ${isPast || isCurrent ? "bg-teal-400" : "bg-gray-200"}`}
                                />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>

                    {/* Feature 2: Dependencies */}
                    <div>
                      <h4 className="font-semibold text-black mb-3 flex items-center gap-2">
                        <Link2 size={18} className="text-blue-600" />
                        Dependencies
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white border border-gray-200 p-4 rounded-lg">
                          <p className="text-xs text-gray-500 mb-2 font-medium">
                            Depends On:
                          </p>
                          {decisionData[decision.id]?.dependencies?.dependsOn
                            ?.length > 0 ? (
                            <div className="space-y-1">
                              {decisionData[
                                decision.id
                              ].dependencies.dependsOn.map((dep) => {
                                const isDeprecated =
                                  dep.isDeprecated ||
                                  dep.decisions?.lifecycle === "INVALIDATED" ||
                                  dep.decisions?.lifecycle === "RETIRED";
                                return (
                                  <div key={dep.id} className="space-y-1">
                                    <div
                                      className={`text-xs px-2 py-1 rounded font-mono flex items-center gap-1 ${
                                        isDeprecated
                                          ? "bg-red-100 text-red-700 border border-red-300"
                                          : "bg-blue-100 text-blue-700"
                                      }`}
                                    >
                                      {isDeprecated && (
                                        <span title="Deprecated decision">
                                          ⚠️
                                        </span>
                                      )}
                                      {dep.decisions?.title ||
                                        dep.target_decision_id.slice(0, 8)}
                                    </div>
                                    {isDeprecated && (
                                      <p className="text-xs text-red-600 italic pl-2">
                                        {dep.deprecationWarning ||
                                          "This decision is deprecated"}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600">
                              No dependencies
                            </p>
                          )}
                        </div>
                        <div className="bg-white border border-gray-200 p-4 rounded-lg">
                          <p className="text-xs text-gray-500 mb-2 font-medium">
                            Blocks:
                          </p>
                          {decisionData[decision.id]?.dependencies?.blocks
                            ?.length > 0 ? (
                            <div className="space-y-1">
                              {decisionData[
                                decision.id
                              ].dependencies.blocks.map((dep) => {
                                const isDeprecated =
                                  dep.isDeprecated ||
                                  dep.decisions?.lifecycle === "INVALIDATED" ||
                                  dep.decisions?.lifecycle === "RETIRED";
                                return (
                                  <div key={dep.id} className="space-y-1">
                                    <div
                                      className={`text-xs px-2 py-1 rounded font-mono flex items-center gap-1 ${
                                        isDeprecated
                                          ? "bg-red-100 text-red-700 border border-red-300"
                                          : "bg-orange-100 text-orange-700"
                                      }`}
                                    >
                                      {isDeprecated && (
                                        <span title="Deprecated decision">
                                          ⚠️
                                        </span>
                                      )}
                                      {dep.decisions?.title ||
                                        dep.source_decision_id.slice(0, 8)}
                                    </div>
                                    {isDeprecated && (
                                      <p className="text-xs text-red-600 italic pl-2">
                                        {dep.deprecationWarning ||
                                          "This decision is deprecated"}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600">
                              No dependencies
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Feature 3: Assumptions Tracking */}
                    <div>
                      <h4 className="font-semibold text-black mb-3 flex items-center gap-2">
                        <Shield size={18} className="text-blue-600" />
                        Assumptions
                      </h4>

                      {/* Organizational Rules (Universal Assumptions) */}
                      {decisionData[decision.id]?.assumptions?.filter(
                        (a) => a.scope === "UNIVERSAL",
                      ).length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Shield size={14} className="text-purple-600" />
                            <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                              🌐 Universal Rules (Apply to all decisions)
                            </p>
                          </div>
                          <div className="space-y-2">
                            {decisionData[decision.id].assumptions
                              .filter((a) => a.scope === "UNIVERSAL")
                              .map((assumption) => {
                                const isValid =
                                  assumption.status === "VALID" ||
                                  assumption.status === "HOLDING"; // Support both
                                const isShaky = assumption.status === "SHAKY";
                                const isBroken = assumption.status === "BROKEN";
                                const hasConflicts =
                                  assumption.conflicts &&
                                  assumption.conflicts.length > 0;

                                return (
                                  <div key={assumption.id}>
                                    <div
                                      className={`border p-3 rounded-lg ${
                                        isBroken
                                          ? "border-red-200 bg-red-50"
                                          : isShaky
                                            ? "border-orange-200 bg-orange-50"
                                            : "bg-purple-50 border-purple-200"
                                      }`}
                                    >
                                      <div className="flex items-start gap-2">
                                        {isValid ? (
                                          <CheckCircle
                                            size={16}
                                            className="text-purple-600 mt-0.5 flex-shrink-0"
                                          />
                                        ) : isShaky ? (
                                          <AlertCircle
                                            size={16}
                                            className="text-orange-500 mt-0.5 flex-shrink-0"
                                          />
                                        ) : (
                                          <XCircle
                                            size={16}
                                            className="text-red-500 mt-0.5 flex-shrink-0"
                                          />
                                        )}
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-gray-800">
                                            {assumption.description}
                                          </p>
                                          <div className="flex items-center gap-3 mt-1">
                                            <span
                                              className={`text-xs font-semibold ${
                                                isValid
                                                  ? "text-purple-600"
                                                  : isShaky
                                                    ? "text-orange-600"
                                                    : "text-red-600"
                                              }`}
                                            >
                                              {isValid
                                                ? "✓ Valid"
                                                : isShaky
                                                  ? "⚠ Shaky"
                                                  : "✗ Broken"}
                                            </span>
                                            <span className="text-xs text-purple-600 font-medium">
                                              🔒 Universal
                                            </span>
                                            {assumption.validated_at && (
                                              <span className="text-xs text-gray-500">
                                                Checked:{" "}
                                                {new Date(
                                                  assumption.validated_at,
                                                ).toLocaleDateString()}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Show conflicts */}
                                      {hasConflicts && (
                                        <div className="mt-2 pt-2 border-t border-red-300">
                                          <div className="flex items-start gap-2 bg-red-100 p-2 rounded">
                                            <AlertCircle
                                              size={14}
                                              className="text-red-600 mt-0.5 flex-shrink-0"
                                            />
                                            <div className="flex-1">
                                              <p className="text-xs font-semibold text-red-700">
                                                ⚠️ Conflicts detected:
                                              </p>
                                              {assumption.conflicts.map(
                                                (conflict) => (
                                                  <p
                                                    key={conflict.conflict_id}
                                                    className="text-xs text-red-600 mt-1"
                                                  >
                                                    • Contradicts: "
                                                    {
                                                      conflict.conflicting_description
                                                    }
                                                    "
                                                    <br />
                                                    <span className="text-red-500 text-xs">
                                                      Reason:{" "}
                                                      {conflict.conflict_reason}
                                                    </span>
                                                  </p>
                                                ),
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Decision-Specific Assumptions */}
                      {decisionData[decision.id]?.assumptions?.filter(
                        (a) => a.scope === "DECISION_SPECIFIC" || !a.scope,
                      ).length > 0 ? (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Activity size={14} className="text-blue-600" />
                            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                              📌 Decision-Specific
                            </p>
                          </div>
                          <div className="space-y-2">
                            {decisionData[decision.id].assumptions
                              .filter(
                                (a) =>
                                  a.scope === "DECISION_SPECIFIC" || !a.scope,
                              )
                              .map((assumption) => {
                                const isValid =
                                  assumption.status === "VALID" ||
                                  assumption.status === "HOLDING"; // Support both
                                const isShaky = assumption.status === "SHAKY";
                                const isBroken = assumption.status === "BROKEN";
                                const hasConflicts =
                                  assumption.conflicts &&
                                  assumption.conflicts.length > 0;

                                return (
                                  <div key={assumption.id}>
                                    <div
                                      className={`bg-white border p-3 rounded-lg ${
                                        isBroken
                                          ? "border-red-200 bg-red-50"
                                          : isShaky
                                            ? "border-orange-200 bg-orange-50"
                                            : "border-gray-200"
                                      }`}
                                    >
                                      <div className="flex items-start gap-2">
                                        {isValid ? (
                                          <CheckCircle
                                            size={16}
                                            className="text-teal-600 mt-0.5 flex-shrink-0"
                                          />
                                        ) : isShaky ? (
                                          <AlertCircle
                                            size={16}
                                            className="text-orange-500 mt-0.5 flex-shrink-0"
                                          />
                                        ) : (
                                          <XCircle
                                            size={16}
                                            className="text-red-500 mt-0.5 flex-shrink-0"
                                          />
                                        )}
                                        <div className="flex-1">
                                          <p className="text-sm text-gray-800">
                                            {assumption.description}
                                          </p>
                                          <div className="flex items-center gap-3 mt-1">
                                            <span
                                              className={`text-xs font-semibold ${
                                                isValid
                                                  ? "text-teal-600"
                                                  : isShaky
                                                    ? "text-orange-600"
                                                    : "text-red-600"
                                              }`}
                                            >
                                              {isValid
                                                ? "✓ Valid"
                                                : isShaky
                                                  ? "⚠ Shaky"
                                                  : "✗ Broken"}
                                            </span>
                                            {assumption.validated_at && (
                                              <span className="text-xs text-gray-500">
                                                Checked:{" "}
                                                {new Date(
                                                  assumption.validated_at,
                                                ).toLocaleDateString()}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Show conflicts */}
                                      {hasConflicts && (
                                        <div className="mt-2 pt-2 border-t border-red-300">
                                          <div className="flex items-start gap-2 bg-red-100 p-2 rounded">
                                            <AlertCircle
                                              size={14}
                                              className="text-red-600 mt-0.5 flex-shrink-0"
                                            />
                                            <div className="flex-1">
                                              <p className="text-xs font-semibold text-red-700">
                                                ⚠️ Conflicts detected:
                                              </p>
                                              {assumption.conflicts.map(
                                                (conflict) => (
                                                  <p
                                                    key={conflict.conflict_id}
                                                    className="text-xs text-red-600 mt-1"
                                                  >
                                                    • Contradicts: "
                                                    {
                                                      conflict.conflicting_description
                                                    }
                                                    "
                                                    <br />
                                                    <span className="text-red-500 text-xs">
                                                      Reason:{" "}
                                                      {conflict.conflict_reason}
                                                    </span>
                                                  </p>
                                                ),
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      ) : (
                        !decisionData[decision.id]?.assumptions?.filter(
                          (a) => a.scope === "UNIVERSAL",
                        ).length && (
                          <div className="bg-white border border-gray-200 p-4 rounded-lg">
                            <p className="text-sm text-gray-600">
                              No assumptions tracked yet
                            </p>
                          </div>
                        )
                      )}
                    </div>

                    {/* Decision Conflicts */}
                    {decisionData[decision.id]?.decisionConflicts?.length >
                      0 && (
                      <div className="mt-4 bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="w-5 h-5 text-orange-600" />
                          <h4 className="font-semibold text-orange-900">
                            Decision Conflicts
                          </h4>
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                            {decisionData[decision.id].decisionConflicts.length}
                          </span>
                        </div>
                        <p className="text-sm text-orange-700 mb-3">
                          This decision conflicts with other decisions in your
                          organization. Review and resolve these conflicts to
                          maintain consistency.
                        </p>
                        <div className="space-y-3">
                          {decisionData[decision.id].decisionConflicts.map(
                            (conflict) => (
                              <div
                                key={conflict.id}
                                className="bg-white rounded-lg p-3 border border-orange-200"
                              >
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded-full font-semibold">
                                        {conflict.conflict_type?.replace(
                                          /_/g,
                                          " ",
                                        )}
                                      </span>
                                      <span className="text-xs text-orange-600 font-bold">
                                        {Math.round(
                                          conflict.confidence_score * 100,
                                        )}
                                        % confidence
                                      </span>
                                    </div>
                                    <p className="font-medium text-orange-900 mb-2">
                                      Conflicts with:{" "}
                                      {conflict.other_decision?.title ||
                                        "Unknown Decision"}
                                    </p>
                                    <div className="mb-2">
                                      {conflict.metadata?.aiGenerated && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-semibold rounded-full mb-1">
                                          <Sparkles size={10} />
                                          AI Enhanced
                                        </span>
                                      )}
                                      <p className="text-sm text-gray-700">
                                        {conflict.explanation}
                                      </p>
                                    </div>
                                    <p className="text-xs text-gray-600">
                                      Detected:{" "}
                                      {new Date(
                                        conflict.detected_at,
                                      ).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                        <div className="mt-3 pt-3 border-t border-orange-200">
                          <button
                            onClick={() =>
                              (window.location.href = "#decision-conflicts")
                            }
                            className="text-sm text-orange-600 hover:text-orange-800 font-medium"
                          >
                            → View all decision conflicts
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Constraint Violations */}
                    {decisionData[decision.id]?.violations?.length > 0 && (
                      <div className="mt-4 bg-red-50 border-2 border-red-300 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertCircle className="w-5 h-5 text-red-600" />
                          <h4 className="font-semibold text-red-900">
                            Constraint Violations
                          </h4>
                        </div>
                        <div className="space-y-3">
                          {decisionData[decision.id].violations.map(
                            (violation) => (
                              <div
                                key={violation.id}
                                className="bg-white rounded-lg p-3 border border-red-200"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <p className="font-medium text-red-800 mb-1">
                                      {violation.constraints?.name ||
                                        "Constraint"}
                                    </p>
                                    <p className="text-sm text-red-700 mb-2">
                                      {violation.violation_reason}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                      Detected:{" "}
                                      {new Date(
                                        violation.detected_at,
                                      ).toLocaleString()}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() =>
                                      handleResolveViolation(
                                        violation.id,
                                        decision.id,
                                      )
                                    }
                                    className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors whitespace-nowrap"
                                  >
                                    Resolve
                                  </button>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                    {/* Organizational Constraints */}
                    {decisionData[decision.id]?.constraints?.length > 0 && (
                      <div className="mt-4 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Shield className="w-5 h-5 text-blue-600" />
                          <h4 className="font-semibold text-blue-900">
                            Organizational Constraints
                          </h4>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {decisionData[decision.id].constraints.length}
                          </span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-auto">
                            Auto-Applied
                          </span>
                        </div>
                        <p className="text-sm text-blue-700 mb-3">
                          All organizational constraints automatically apply to
                          every decision. These are non-negotiable
                          organizational facts.
                        </p>
                        <div className="space-y-2">
                          {decisionData[decision.id].constraints.map(
                            (constraint) => (
                              <div
                                key={constraint.id}
                                className="bg-white rounded-lg p-3 border border-blue-200"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <p className="font-medium text-blue-900 mb-1">
                                      {constraint.name}
                                    </p>
                                    {constraint.description && (
                                      <p className="text-sm text-gray-700 mb-2">
                                        {constraint.description}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-3 text-xs text-gray-600">
                                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                        {constraint.constraint_type || "OTHER"}
                                      </span>
                                      {constraint.is_immutable && (
                                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded flex items-center gap-1">
                                          <Lock className="w-3 h-3" />
                                          Immutable
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                    {/* Feature 4: Conflicts */}
                    <div>
                      <h4 className="font-semibold text-black mb-3 flex items-center gap-2">
                        <AlertCircle size={18} className="text-orange-500" />
                        Any conflicts?
                      </h4>
                      {effectiveLifecycle === "AT_RISK" ? (
                        <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                          <div className="flex items-start gap-2 text-orange-700">
                            <AlertCircle
                              size={16}
                              className="flex-shrink-0 mt-0.5"
                            />
                            <div>
                              <span className="text-sm font-medium">
                                Decision at risk
                              </span>
                              <p className="text-xs text-orange-600 mt-1">
                                This decision's health is degraded. Review
                                assumptions and dependencies.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-teal-50 border border-teal-200 p-4 rounded-lg">
                          <div className="flex items-center gap-2 text-teal-700">
                            <CheckCircle size={16} />
                            <span className="text-sm font-medium">
                              All clear! No conflicts found
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Feature 5: Time-based Decay Details */}
                    <div>
                      <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        <TrendingDown size={18} className="text-cyan-500" />
                        How fresh is this?
                      </h4>
                      <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-3">
                        {/* Expiry Date Display */}
                        {decision.expiryDate &&
                          (() => {
                            const expiryDate = new Date(decision.expiryDate);
                            const now = currentTime;
                            const daysUntilExpiry = Math.floor(
                              (expiryDate - now) / (1000 * 60 * 60 * 24),
                            );
                            const isExpired = daysUntilExpiry < 0;
                            const daysPastExpiry = Math.abs(daysUntilExpiry);

                            return (
                              <>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-slate-600">
                                    Expiry Date:
                                  </span>
                                  <span className="text-sm font-semibold text-slate-800">
                                    {expiryDate.toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-slate-600">
                                    {isExpired
                                      ? "Days Past Expiry:"
                                      : "Days Until Expiry:"}
                                  </span>
                                  <span
                                    className={`text-sm font-bold ${
                                      isExpired
                                        ? "text-red-600"
                                        : daysUntilExpiry <= 30
                                          ? "text-orange-600"
                                          : daysUntilExpiry <= 90
                                            ? "text-yellow-600"
                                            : "text-green-600"
                                    }`}
                                  >
                                    {isExpired
                                      ? daysPastExpiry
                                      : daysUntilExpiry}{" "}
                                    days
                                  </span>
                                </div>
                                {isExpired && (
                                  <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                                    <div className="flex items-center gap-2 text-red-700">
                                      <AlertCircle size={16} />
                                      <span className="text-sm font-semibold">
                                        ⚠️ EXPIRED - Decision is past deadline
                                      </span>
                                    </div>
                                  </div>
                                )}
                                <div className="border-t border-slate-200 my-2"></div>
                              </>
                            );
                          })()}

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">
                            Days since last check:
                          </span>
                          <span className="text-sm font-semibold text-slate-800">
                            {Math.floor(
                              (new Date() - new Date(decision.lastReviewedAt)) /
                                (1000 * 60 * 60 * 24),
                            )}{" "}
                            days
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">
                            Status:
                          </span>
                          <span
                            className={`text-sm font-semibold ${getFreshnessBand(decayScore).textColor} cursor-help`}
                            title={`${decayScore}% fresh`}
                          >
                            {getFreshnessBand(decayScore).label}
                          </span>
                        </div>
                        <div
                          className="w-full bg-slate-100 rounded-full h-3 overflow-hidden cursor-help"
                          title={`Freshness: ${decayScore}%`}
                          role="progressbar"
                          aria-label={`Freshness ${decayScore}%`}
                          aria-valuenow={decayScore}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        >
                          <div
                            className={`h-3 rounded-full transition-all ${
                              decayScore >= 80
                                ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                                : decayScore >= 60
                                  ? "bg-gradient-to-r from-amber-400 to-amber-500"
                                  : "bg-gradient-to-r from-rose-400 to-rose-500"
                            }`}
                            style={{ width: `${decayScore}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-2 bg-indigo-50 p-2 rounded-lg">
                          💡 Decisions get stale over time. Check them regularly
                          to keep them healthy!
                        </p>
                      </div>
                    </div>

                    {/* Feature 6: Linked Cause (Mock data) */}
                    <div>
                      <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        <Target size={18} className="text-rose-500" />
                        Is this part of a bigger issue?
                      </h4>
                      <div className="bg-white border border-slate-200 p-4 rounded-xl">
                        {effectiveLifecycle === "AT_RISK" ||
                        effectiveLifecycle === "INVALIDATED" ? (
                          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                            <p className="text-sm text-amber-800 font-medium flex items-center gap-2">
                              <AlertCircle size={16} />
                              This might be connected to other problems
                            </p>
                            <p className="text-xs text-amber-700 mt-1">
                              Check related decisions to see if there's a common
                              cause
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-emerald-700">
                            <CheckCircle size={16} />
                            <span className="text-sm">
                              Looking good! No bigger issues spotted
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Feature 7: Consistency/Drift Details */}
                    <div>
                      <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        <Activity size={18} className="text-purple-500" />
                        Is this staying on track?
                      </h4>
                      <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">
                            Status:
                          </span>
                          <span
                            className={`text-sm font-semibold ${getConsistencyBand(consistencyScore).textColor} cursor-help`}
                            title={`Consistency: ${consistencyScore}%`}
                          >
                            {getConsistencyBand(consistencyScore).label}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">Drift:</span>
                          <span
                            className={`text-sm font-semibold ${drift > 10 ? "text-amber-700" : "text-emerald-700"} cursor-help`}
                            title={`${drift}% drift from expected`}
                          >
                            {drift > 10 ? "Drifting" : "Stable"}
                          </span>
                        </div>
                        {drift > 10 && (
                          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                            <p className="text-xs text-amber-800 flex items-center gap-2">
                              <AlertCircle size={14} />
                              Things are drifting a bit. Might want to take
                              another look!
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    {decision.description && (
                      <div>
                        <h4 className="font-semibold text-slate-800 mb-3">
                          What's this about?
                        </h4>
                        <div className="bg-white border border-slate-200 p-4 rounded-xl">
                          <p className="text-sm text-slate-700 leading-relaxed">
                            {decision.description}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredDecisions.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
          <Activity size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No decisions here yet
          </h3>
          <p className="text-gray-500">
            Try changing your filters or create your first decision!
          </p>
        </div>
      )}

      {/* Version History Modal */}
      {selectedDecisionForVersions && (
        <DecisionVersionsModal
          decision={selectedDecisionForVersions}
          onClose={() => setSelectedDecisionForVersions(null)}
        />
      )}

      {/* Review Decision Modal */}
      {reviewDecision && (
        <ReviewDecisionModal
          decision={reviewDecision}
          onClose={() => setReviewDecision(null)}
          onSubmit={handleSubmitReview}
        />
      )}
    </div>
  );
};

export default DecisionMonitoring;
