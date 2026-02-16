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
import EditDecisionModal from "./EditDecisionModal";
import RetireDecisionModal from "./RetireDecisionModal";

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
  const [editDecision, setEditDecision] = useState(null); // For edit modal
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

  const handleRetireDecision = (decision) => {
    setRetireConfirmation(decision);
  };

  const confirmRetire = async (decisionId, reason, outcome, conclusions) => {
    try {
      await api.retireDecision(decisionId, reason, outcome, conclusions);
      await fetchDecisions(); // Refresh the list
      showToast(
        "success",
        `Decision has been retired${outcome === "failed" ? " and marked as failed - future similar decisions will be warned" : ""}`,
      );
      setRetireConfirmation(null);
    } catch (err) {
      console.error("Failed to retire decision:", err);
      showToast("error", "Failed to retire decision. Please try again.");
      throw err; // Re-throw so modal knows it failed
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
    <div className="min-h-screen bg-neutral-white dark:bg-neutral-gray-900 p-8">
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
          <div className="bg-white dark:bg-neutral-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mx-auto mb-4">
              <AlertCircle className="text-red-600 dark:text-red-400" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-neutral-black dark:text-white mb-2 text-center">
              Delete Decision?
            </h2>
            <p className="text-neutral-gray-600 dark:text-neutral-gray-400 mb-6 text-center">
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                "{deleteConfirmation.title}"
              </span>
              ?
            </p>
            <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-lg p-4 mb-6">
              <p className="text-sm text-orange-800 dark:text-orange-300">
                <strong>Warning:</strong> This action cannot be undone. All
                related assumptions, dependencies, and constraints will be
                unlinked.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="flex-1 px-6 py-3 bg-neutral-gray-100 dark:bg-neutral-gray-700 text-neutral-gray-700 dark:text-neutral-gray-300 font-semibold rounded-xl hover:bg-neutral-gray-200 dark:hover:bg-neutral-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-6 py-3 bg-red-600 dark:bg-red-500 text-white font-semibold rounded-xl hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Retire Decision Modal */}
      {retireConfirmation && (
        <RetireDecisionModal
          decision={retireConfirmation}
          onClose={() => setRetireConfirmation(null)}
          onSubmit={confirmRetire}
        />
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black dark:text-white mb-2">
              Decision Monitoring
            </h1>
            <p className="text-gray-600 dark:text-neutral-gray-400">
              Keep track of how your decisions are doing
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onAddDecision}
              className="px-4 py-2 bg-primary-blue dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors flex items-center gap-2 shadow-sm font-medium"
            >
              <Plus size={18} />
              Add Decision
            </button>
            <button
              onClick={fetchDecisions}
              className="px-4 py-2 bg-white dark:bg-neutral-gray-700 border border-gray-300 dark:border-neutral-gray-600 text-gray-700 dark:text-neutral-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-gray-600 transition-colors flex items-center gap-2 shadow-sm"
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
                ? "bg-blue-500 dark:bg-blue-600 text-white shadow-md"
                : "bg-white dark:bg-neutral-gray-700 text-gray-700 dark:text-neutral-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-gray-600 border border-gray-200 dark:border-neutral-gray-600"
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
        <div className="bg-white dark:bg-neutral-gray-800 rounded-lg border border-gray-200 dark:border-neutral-gray-700 p-12 text-center shadow-sm">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 dark:border-neutral-gray-700 border-t-blue-500 mb-4"></div>
          <p className="text-gray-700 dark:text-neutral-gray-300">Loading your decisions...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-4 shadow-sm">
          <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
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
                className="bg-white dark:bg-neutral-gray-800 rounded-lg border border-gray-200 dark:border-neutral-gray-700 overflow-hidden hover:shadow-lg transition-all"
              >
                {/* Decision Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => toggleExpand(decision.id)}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-mono text-gray-500 dark:text-neutral-gray-400">
                          {decision.id.slice(0, 8)}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-md text-xs font-semibold ${getStatusColor(effectiveLifecycle)}`}
                        >
                          {effectiveLifecycle.replace("_", " ")}
                        </span>
                        {/* Assumption Conflict Warning Badge */}
                        {decisionData[decision.id]?.conflicts?.length > 0 && (
                          <span className="px-3 py-1 rounded-md text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 flex items-center gap-1">
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
                          <span className="px-3 py-1 rounded-md text-xs font-bold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700 flex items-center gap-1">
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
                          <span className="px-3 py-1 rounded-md text-xs font-bold bg-gray-100 dark:bg-neutral-gray-700 text-gray-700 dark:text-neutral-gray-300 border border-gray-300 dark:border-neutral-gray-600 flex items-center gap-1">
                            <Lock size={12} />
                            Locked
                          </span>
                        )}
                        {/* Governance Tier Badge */}
                        {decision.governanceTier && decision.governanceTier !== 'standard' && (
                          <span className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1 ${
                            decision.governanceTier === 'critical' 
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700'
                              : decision.governanceTier === 'high_impact'
                              ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
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
                                <span className="px-3 py-1 rounded-md text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 animate-pulse">
                                  ⚠️ EXPIRED
                                </span>
                              );
                            } else if (daysUntilExpiry <= 30) {
                              return (
                                <span className="px-3 py-1 rounded-md text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700">
                                  ⏰ {daysUntilExpiry}d to expiry
                                </span>
                              );
                            }
                            return null;
                          })()}
                        <span className="text-xs text-gray-500 dark:text-neutral-gray-400">
                          {effectiveLifecycle === "STABLE"
                            ? "active"
                            : effectiveLifecycle === "RETIRED"
                              ? "deprecated"
                              : "planning"}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-black dark:text-white mb-3">
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
                          <span className="text-sm text-gray-700 dark:text-neutral-gray-300">
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
                          <span className="text-sm text-gray-700 dark:text-neutral-gray-300">
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
                          <span className="text-sm text-gray-700 dark:text-neutral-gray-300">
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
                              ? 'text-gray-700 dark:text-neutral-gray-300 bg-gray-100 dark:bg-neutral-gray-700 hover:bg-gray-200 dark:hover:bg-neutral-gray-600'
                              : 'text-gray-600 dark:text-neutral-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-gray-700'
                          }`}
                          title={decision.lockedAt ? "Unlock decision (allow editing)" : "Lock decision (prevent editing)"}
                        >
                          <Lock size={18} />
                        </button>
                      )}
                      
                      {/* Edit Button - Shows for all users, but behavior differs */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditDecision(decision);
                        }}
                        disabled={decision.lifecycle === "RETIRED" || (decision.lockedAt && !isLead)}
                        className="p-2 text-gray-600 dark:text-neutral-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={
                          decision.lifecycle === "RETIRED"
                            ? "Cannot edit retired decisions"
                            : decision.lockedAt && !isLead
                            ? "Decision is locked (team lead access only)"
                            : isLead
                            ? "Edit decision (direct - no approval needed)"
                            : "Edit decision (requires approval)"
                        }
                      >
                        <Edit size={18} />
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDecisionForVersions(decision);
                        }}
                        className="p-2 text-gray-600 dark:text-neutral-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
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
                        className="p-2 text-gray-600 dark:text-neutral-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className="p-2 text-gray-600 dark:text-neutral-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetireDecision(decision);
                        }}
                        disabled={decision.lifecycle === "RETIRED" || (decision.lockedAt && !isLead)}
                        className="p-2 text-gray-600 dark:text-neutral-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={
                          decision.lifecycle === "RETIRED"
                            ? "Decision is already retired"
                            : decision.lockedAt && !isLead
                            ? "Decision is locked (team lead access only)"
                            : "Retire decision (mark as deprecated)"
                        }
                      >
                        <Archive size={18} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDecision(decision.id, decision.title);
                        }}
                        disabled={decision.lockedAt && !isLead}
                        className="p-2 text-gray-600 dark:text-neutral-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className="text-gray-400 dark:text-neutral-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
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
                  <div className="mt-4 flex gap-4 text-sm text-gray-500 dark:text-neutral-gray-400">
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} className="text-gray-400 dark:text-neutral-gray-500" />
                      Created:{" "}
                      {new Date(decision.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} className="text-gray-400 dark:text-neutral-gray-500" />
                      Last Review:{" "}
                      {new Date(decision.lastReviewedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedDecision === decision.id && (
                  <div className="border-t border-gray-200 dark:border-neutral-gray-700 bg-gray-50 dark:bg-neutral-gray-800 p-6 space-y-6">
                    {/* Feature 1: Lifecycle Progress */}
                    <div>
                      <h4 className="font-semibold text-black dark:text-white mb-3 flex items-center gap-2">
                        <Activity size={18} className="text-blue-600 dark:text-blue-400" />
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
                                      : "bg-white dark:bg-neutral-gray-700 text-gray-400 dark:text-neutral-gray-500 border border-gray-200 dark:border-neutral-gray-600"
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
                      <h4 className="font-semibold text-black dark:text-white mb-3 flex items-center gap-2">
                        <Link2 size={18} className="text-blue-600 dark:text-blue-400" />
                        Dependencies
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-neutral-gray-800 border border-gray-200 dark:border-neutral-gray-700 p-4 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-neutral-gray-400 mb-2 font-medium">
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
                                          ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700"
                                          : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
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
                                      <p className="text-xs text-red-600 dark:text-red-400 italic pl-2">
                                        {dep.deprecationWarning ||
                                          "This decision is deprecated"}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600 dark:text-neutral-gray-400">
                              No dependencies
                            </p>
                          )}
                        </div>
                        <div className="bg-white dark:bg-neutral-gray-800 border border-gray-200 dark:border-neutral-gray-700 p-4 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-neutral-gray-400 mb-2 font-medium">
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
                                          ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700"
                                          : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
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
                                      <p className="text-xs text-red-600 dark:text-red-400 italic pl-2">
                                        {dep.deprecationWarning ||
                                          "This decision is deprecated"}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600 dark:text-neutral-gray-400">
                              No dependencies
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Feature 3: Assumptions Tracking */}
                    <div>
                      <h4 className="font-semibold text-black dark:text-white mb-3 flex items-center gap-2">
                        <Shield size={18} className="text-blue-600 dark:text-blue-400" />
                        Assumptions
                      </h4>

                      {/* Organizational Rules (Universal Assumptions) */}
                      {decisionData[decision.id]?.assumptions?.filter(
                        (a) => a.scope === "UNIVERSAL",
                      ).length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Shield size={14} className="text-purple-600 dark:text-purple-400" />
                            <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
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
                                          ? "border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/30"
                                          : isShaky
                                            ? "border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/30"
                                            : "bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700"
                                      }`}
                                    >
                                      <div className="flex items-start gap-2">
                                        {isValid ? (
                                          <CheckCircle
                                            size={16}
                                            className="text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0"
                                          />
                                        ) : isShaky ? (
                                          <AlertCircle
                                            size={16}
                                            className="text-orange-500 dark:text-orange-400 mt-0.5 flex-shrink-0"
                                          />
                                        ) : (
                                          <XCircle
                                            size={16}
                                            className="text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0"
                                          />
                                        )}
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-gray-800 dark:text-neutral-gray-200">
                                            {assumption.description}
                                          </p>
                                          <div className="flex items-center gap-3 mt-1">
                                            <span
                                              className={`text-xs font-semibold ${
                                                isValid
                                                  ? "text-purple-600 dark:text-purple-400"
                                                  : isShaky
                                                    ? "text-orange-600 dark:text-orange-400"
                                                    : "text-red-600 dark:text-red-400"
                                              }`}
                                            >
                                              {isValid
                                                ? "✓ Valid"
                                                : isShaky
                                                  ? "⚠ Shaky"
                                                  : "✗ Broken"}
                                            </span>
                                            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                              🔒 Universal
                                            </span>
                                            {assumption.validated_at && (
                                              <span className="text-xs text-gray-500 dark:text-neutral-gray-400">
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
                            <Activity size={14} className="text-blue-600 dark:text-blue-400" />
                            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
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
                                      className={`bg-white dark:bg-neutral-gray-800 border p-3 rounded-lg ${
                                        isBroken
                                          ? "border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/30"
                                          : isShaky
                                            ? "border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/30"
                                            : "border-gray-200 dark:border-neutral-gray-700"
                                      }`}
                                    >
                                      <div className="flex items-start gap-2">
                                        {isValid ? (
                                          <CheckCircle
                                            size={16}
                                            className="text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0"
                                          />
                                        ) : isShaky ? (
                                          <AlertCircle
                                            size={16}
                                            className="text-orange-500 dark:text-orange-400 mt-0.5 flex-shrink-0"
                                          />
                                        ) : (
                                          <XCircle
                                            size={16}
                                            className="text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0"
                                          />
                                        )}
                                        <div className="flex-1">
                                          <p className="text-sm text-gray-800 dark:text-neutral-gray-200">
                                            {assumption.description}
                                          </p>
                                          <div className="flex items-center gap-3 mt-1">
                                            <span
                                              className={`text-xs font-semibold ${
                                                isValid
                                                  ? "text-teal-600 dark:text-teal-400"
                                                  : isShaky
                                                    ? "text-orange-600 dark:text-orange-400"
                                                    : "text-red-600 dark:text-red-400"
                                              }`}
                                            >
                                              {isValid
                                                ? "✓ Valid"
                                                : isShaky
                                                  ? "⚠ Shaky"
                                                  : "✗ Broken"}
                                            </span>
                                            {assumption.validated_at && (
                                              <span className="text-xs text-gray-500 dark:text-neutral-gray-400">
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
                                        <div className="mt-2 pt-2 border-t border-red-300 dark:border-red-700">
                                          <div className="flex items-start gap-2 bg-red-100 dark:bg-red-900/30 p-2 rounded">
                                            <AlertCircle
                                              size={14}
                                              className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0"
                                            />
                                            <div className="flex-1">
                                              <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                                                ⚠️ Conflicts detected:
                                              </p>
                                              {assumption.conflicts.map(
                                                (conflict) => (
                                                  <p
                                                    key={conflict.conflict_id}
                                                    className="text-xs text-red-600 dark:text-red-400 mt-1"
                                                  >
                                                    • Contradicts: "
                                                    {
                                                      conflict.conflicting_description
                                                    }
                                                    "
                                                    <br />
                                                    <span className="text-red-500 dark:text-red-400 text-xs">
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
                          <div className="bg-white dark:bg-neutral-gray-800 border border-gray-200 dark:border-neutral-gray-700 p-4 rounded-lg">
                            <p className="text-sm text-gray-600 dark:text-neutral-gray-400">
                              No assumptions tracked yet
                            </p>
                          </div>
                        )
                      )}
                    </div>

                    {/* Decision Conflicts */}
                    {decisionData[decision.id]?.decisionConflicts?.length >
                      0 && (
                      <div className="mt-4 bg-orange-50 dark:bg-orange-900/30 border-2 border-orange-300 dark:border-orange-700 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                          <h4 className="font-semibold text-orange-900 dark:text-orange-200">
                            Decision Conflicts
                          </h4>
                          <span className="text-xs bg-orange-100 dark:bg-orange-800/50 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full">
                            {decisionData[decision.id].decisionConflicts.length}
                          </span>
                        </div>
                        <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
                          This decision conflicts with other decisions in your
                          organization. Review and resolve these conflicts to
                          maintain consistency.
                        </p>
                        <div className="space-y-3">
                          {decisionData[decision.id].decisionConflicts.map(
                            (conflict) => (
                              <div
                                key={conflict.id}
                                className="bg-white dark:bg-neutral-gray-800 rounded-lg p-3 border border-orange-200 dark:border-orange-700"
                              >
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-800/50 text-orange-800 dark:text-orange-300 rounded-full font-semibold">
                                        {conflict.conflict_type?.replace(
                                          /_/g,
                                          " ",
                                        )}
                                      </span>
                                      <span className="text-xs text-orange-600 dark:text-orange-400 font-bold">
                                        {Math.round(
                                          conflict.confidence_score * 100,
                                        )}
                                        % confidence
                                      </span>
                                    </div>
                                    <p className="font-medium text-orange-900 dark:text-orange-200 mb-2">
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
                                      <p className="text-sm text-gray-700 dark:text-neutral-gray-300">
                                        {conflict.explanation}
                                      </p>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-neutral-gray-400">
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
                        <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-700">
                          <button
                            onClick={() =>
                              (window.location.href = "#decision-conflicts")
                            }
                            className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 font-medium"
                          >
                            → View all decision conflicts
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Constraint Violations */}
                    {decisionData[decision.id]?.violations?.length > 0 && (
                      <div className="mt-4 bg-red-50 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                          <h4 className="font-semibold text-red-900 dark:text-red-200">
                            Constraint Violations
                          </h4>
                        </div>
                        <div className="space-y-3">
                          {decisionData[decision.id].violations.map(
                            (violation) => (
                              <div
                                key={violation.id}
                                className="bg-white dark:bg-neutral-gray-800 rounded-lg p-3 border border-red-200 dark:border-red-700"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <p className="font-medium text-red-800 dark:text-red-300 mb-1">
                                      {violation.constraints?.name ||
                                        "Constraint"}
                                    </p>
                                    <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                                      {violation.violation_reason}
                                    </p>
                                    <p className="text-xs text-gray-600 dark:text-neutral-gray-400">
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
                                    className="px-3 py-1 text-xs bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 transition-colors whitespace-nowrap"
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
                      <div className="mt-4 bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-700 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <h4 className="font-semibold text-blue-900 dark:text-blue-200">
                            Organizational Constraints
                          </h4>
                          <span className="text-xs bg-blue-100 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                            {decisionData[decision.id].constraints.length}
                          </span>
                          <span className="text-xs bg-green-100 dark:bg-green-800/50 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full ml-auto">
                            Auto-Applied
                          </span>
                        </div>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                          All organizational constraints automatically apply to
                          every decision. These are non-negotiable
                          organizational facts.
                        </p>
                        <div className="space-y-2">
                          {decisionData[decision.id].constraints.map(
                            (constraint) => (
                              <div
                                key={constraint.id}
                                className="bg-white dark:bg-neutral-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <p className="font-medium text-blue-900 dark:text-blue-200 mb-1">
                                      {constraint.name}
                                    </p>
                                    {constraint.description && (
                                      <p className="text-sm text-gray-700 dark:text-neutral-gray-300 mb-2">
                                        {constraint.description}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-neutral-gray-400">
                                      <span className="bg-blue-100 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                                        {constraint.constraint_type || "OTHER"}
                                      </span>
                                      {constraint.is_immutable && (
                                        <span className="bg-gray-100 dark:bg-neutral-gray-700 text-gray-700 dark:text-neutral-gray-300 px-2 py-0.5 rounded flex items-center gap-1">
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
                      <h4 className="font-semibold text-black dark:text-white mb-3 flex items-center gap-2">
                        <AlertCircle size={18} className="text-orange-500 dark:text-orange-400" />
                        Any conflicts?
                      </h4>
                      {effectiveLifecycle === "AT_RISK" ? (
                        <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 p-4 rounded-lg">
                          <div className="flex items-start gap-2 text-orange-700 dark:text-orange-300">
                            <AlertCircle
                              size={16}
                              className="flex-shrink-0 mt-0.5"
                            />
                            <div>
                              <span className="text-sm font-medium">
                                Decision at risk
                              </span>
                              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                This decision's health is degraded. Review
                                assumptions and dependencies.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-700 p-4 rounded-lg">
                          <div className="flex items-center gap-2 text-teal-700 dark:text-teal-300">
                            <CheckCircle size={16} />
                            <span className="text-sm font-medium">
                              All clear! No conflicts found
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Feature 6: Linked Cause (Mock data) */}
                    <div>
                      <h4 className="font-semibold text-slate-800 dark:text-neutral-gray-200 mb-3 flex items-center gap-2">
                        <Target size={18} className="text-rose-500 dark:text-rose-400" />
                        Is this part of a bigger issue?
                      </h4>
                      <div className="bg-white dark:bg-neutral-gray-800 border border-slate-200 dark:border-neutral-gray-700 p-4 rounded-xl">
                        {effectiveLifecycle === "AT_RISK" ||
                        effectiveLifecycle === "INVALIDATED" ? (
                          <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 p-3 rounded-xl">
                            <p className="text-sm text-amber-800 dark:text-amber-300 font-medium flex items-center gap-2">
                              <AlertCircle size={16} />
                              This might be connected to other problems
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                              Check related decisions to see if there's a common
                              cause
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
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
                      <h4 className="font-semibold text-slate-800 dark:text-neutral-gray-200 mb-3 flex items-center gap-2">
                        <Activity size={18} className="text-purple-500 dark:text-purple-400" />
                        Is this staying on track?
                      </h4>
                      <div className="bg-white dark:bg-neutral-gray-800 border border-slate-200 dark:border-neutral-gray-700 p-4 rounded-xl space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600 dark:text-neutral-gray-400">
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
                          <span className="text-sm text-slate-600 dark:text-neutral-gray-400">Drift:</span>
                          <span
                            className={`text-sm font-semibold ${drift > 10 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"} cursor-help`}
                            title={`${drift}% drift from expected`}
                          >
                            {drift > 10 ? "Drifting" : "Stable"}
                          </span>
                        </div>
                        {drift > 10 && (
                          <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 p-3 rounded-xl">
                            <p className="text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
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
                        <h4 className="font-semibold text-slate-800 dark:text-neutral-gray-200 mb-3">
                          What's this about?
                        </h4>
                        <div className="bg-white dark:bg-neutral-gray-800 border border-slate-200 dark:border-neutral-gray-700 p-4 rounded-xl">
                          <p className="text-sm text-slate-700 dark:text-neutral-gray-300 leading-relaxed">
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
        <div className="bg-white dark:bg-neutral-gray-800 rounded-lg border border-gray-200 dark:border-neutral-gray-700 p-12 text-center shadow-sm">
          <Activity size={48} className="text-gray-300 dark:text-neutral-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-neutral-gray-300 mb-2">
            No decisions here yet
          </h3>
          <p className="text-gray-500 dark:text-neutral-gray-400">
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

      {/* Edit Decision Modal */}
      {editDecision && (
        <EditDecisionModal
          decision={editDecision}
          isLead={isLead}
          onClose={() => setEditDecision(null)}
          onSuccess={(message) => {
            showToast('success', message);
            fetchDecisions(); // Refresh the list
          }}
        />
      )}
    </div>
  );
};

export default DecisionMonitoring;
