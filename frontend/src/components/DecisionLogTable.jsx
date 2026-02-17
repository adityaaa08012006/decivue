import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Eye,
  Clock,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";

const rowVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (custom) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: custom * 0.05,
      duration: 0.3,
    },
  }),
};

const DecisionLogTable = ({ onNavigate }) => {
  const { isLead, loading: authLoading, user } = useAuth();
  const [decisions, setDecisions] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approving, setApproving] = useState(null);

  useEffect(() => {
    // Wait for auth to load and user to be available
    if (authLoading || !user) {
      console.log("Waiting for auth to load...", {
        authLoading,
        hasUser: !!user,
      });
      return;
    }

    console.log("Auth loaded, fetching data...", { isLead, userId: user.id });

    if (isLead) {
      fetchPendingApprovals();
    } else {
      fetchDecisions();
    }
  }, [isLead, authLoading, user]);

  const fetchDecisions = async () => {
    try {
      setLoading(true);
      const data = await api.getDecisions();
      setDecisions(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch decisions:", err);
      setError(
        "Failed to load decisions. Please make sure the backend is running.",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      console.log("Fetching pending approvals as team lead...");
      const data = await api.getPendingApprovals();
      console.log("Pending approvals fetched:", data);
      setPendingApprovals(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch pending approvals:", err);
      console.error("Error details:", err.message);
      setError(`Failed to load pending approvals: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (auditId, approved) => {
    try {
      setApproving(auditId);
      await api.resolveEditRequest(auditId, approved);
      // Refresh the list
      await fetchPendingApprovals();
      setApproving(null);
    } catch (err) {
      console.error("Failed to approve/reject request:", err);
      alert(
        `Failed to ${approved ? "approve" : "reject"} request. Please try again.`,
      );
      setApproving(null);
    }
  };

  const handleView = (decisionId) => {
    // Navigate to decision monitoring page
    if (onNavigate) {
      onNavigate("monitoring");
    }
  };

  const mapLifecycleToStatus = (lifecycle) => {
    const statusMap = {
      STABLE: "Approved",
      UNDER_REVIEW: "Pending",
      AT_RISK: "Declined",
      INVALIDATED: "Disregarded",
      RETIRED: "Disregarded",
    };
    return statusMap[lifecycle] || "Pending";
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      Approved: "bg-status-green text-white",
      Pending: "bg-status-gray dark:bg-neutral-gray-600 text-white",
      Declined: "bg-primary-red text-white",
      Disregarded: "bg-primary-blue text-white",
    };

    return (
      <span
        className={`px-3 py-1 rounded text-xs font-semibold ${statusStyles[status]}`}
      >
        {status}
      </span>
    );
  };

  const getTierBadge = (tier) => {
    const tierStyles = {
      standard: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
      high_impact:
        "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
      critical: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    };

    const tierLabels = {
      standard: "Standard",
      high_impact: "High Impact",
      critical: "Critical",
    };

    return (
      <span
        className={`px-2 py-1 rounded text-xs font-semibold ${tierStyles[tier] || tierStyles.standard}`}
      >
        {tierLabels[tier] || tier}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-neutral-gray-800 rounded-2xl border border-neutral-gray-200 dark:border-neutral-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-neutral-black dark:text-white">
          {isLead ? "Pending Approvals" : "Decision log"}
        </h2>
        <button
          onClick={isLead ? fetchPendingApprovals : fetchDecisions}
          className="px-3 py-2 text-sm text-primary-blue dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center gap-2"
        >
          <RotateCcw size={16} />
          Refresh
        </button>
      </div>

      {(loading || authLoading) && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue dark:border-blue-400"></div>
          <p className="mt-2 text-neutral-gray-600 dark:text-neutral-gray-400">
            {authLoading ? "Initializing..." : "Loading..."}
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* TEAM LEAD VIEW - Pending Approvals */}
      {isLead &&
        !authLoading &&
        !loading &&
        !error &&
        pendingApprovals.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle
              className="mx-auto text-green-500 dark:text-green-400 mb-3"
              size={48}
            />
            <p className="text-neutral-gray-600 dark:text-neutral-gray-400 font-medium">
              No pending approvals
            </p>
            <p className="text-sm text-neutral-gray-500 dark:text-neutral-gray-500 mt-1">
              All edit requests have been processed
            </p>
          </div>
        )}

      {isLead &&
        !authLoading &&
        !loading &&
        !error &&
        pendingApprovals.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-gray-300 dark:border-neutral-gray-600">
                  <th className="text-left py-4 px-4 text-sm font-semibold text-neutral-black dark:text-white">
                    Decision
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-neutral-black dark:text-white">
                    Tier
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-neutral-black dark:text-white">
                    Requested By
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-neutral-black dark:text-white">
                    Justification
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-neutral-black dark:text-white">
                    Requested
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-neutral-black dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {pendingApprovals.map((approval) => (
                  <tr
                    key={approval.auditId}
                    className="border-b border-neutral-gray-200 dark:border-neutral-gray-700 last:border-b-0 hover:bg-neutral-gray-50 dark:hover:bg-neutral-gray-700 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div>
                        <span className="text-sm font-medium text-neutral-black dark:text-white bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded block mb-1">
                          {approval.decisionTitle}
                        </span>
                        {approval.decisionDescription && (
                          <span className="text-xs text-neutral-gray-600 dark:text-neutral-gray-400">
                            {approval.decisionDescription.substring(0, 60)}
                            {approval.decisionDescription.length > 60
                              ? "..."
                              : ""}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {getTierBadge(approval.governanceTier)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm">
                        <div className="font-medium text-neutral-black dark:text-white">
                          {approval.requestedBy}
                        </div>
                        <div className="text-xs text-neutral-gray-600 dark:text-neutral-gray-400">
                          {approval.requestedByEmail}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 max-w-xs">
                      <p className="text-sm text-neutral-gray-700 dark:text-neutral-gray-300 line-clamp-2">
                        {approval.justification}
                      </p>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1 text-xs text-neutral-gray-600 dark:text-neutral-gray-400">
                        <Clock size={12} />
                        {new Date(approval.requestedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(approval.auditId, true)}
                          disabled={approving === approval.auditId}
                          className="px-4 py-1.5 bg-status-green text-white text-sm font-semibold rounded-md hover:bg-green-600 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle size={14} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleView(approval.decisionId)}
                          className="px-4 py-1.5 bg-primary-blue text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1"
                        >
                          <Eye size={14} />
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {/* MEMBER VIEW - Decision Log (no action buttons) */}
      {!isLead &&
        !authLoading &&
        !loading &&
        !error &&
        decisions.length === 0 && (
          <div className="text-center py-8">
            <p className="text-neutral-gray-600 dark:text-neutral-gray-400">
              No decisions found. Create your first decision!
            </p>
          </div>
        )}

      {!isLead &&
        !authLoading &&
        !loading &&
        !error &&
        decisions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-gray-300 dark:border-neutral-gray-600">
                  <th className="text-left py-4 px-4 text-sm font-semibold text-neutral-black dark:text-white">
                    Decision
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-neutral-black dark:text-white">
                    Status
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-neutral-black dark:text-white">
                    Description
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-neutral-black dark:text-white">
                    Creator
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-neutral-black dark:text-white">
                    Last Reviewed
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-gray-200 dark:divide-neutral-gray-700">
                {decisions.map((decision, index) => (
                  <motion.tr
                    key={decision.id}
                    custom={index}
                    initial="hidden"
                    animate="visible"
                    variants={rowVariants}
                    onClick={() => handleView(decision.id)}
                    className="hover:bg-neutral-gray-50 dark:hover:bg-neutral-gray-700 transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-4">
                      <span className="text-sm font-medium text-neutral-black dark:text-white bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded inline-block">
                        {decision.title}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {getStatusBadge(mapLifecycleToStatus(decision.lifecycle))}
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-neutral-gray-700 dark:text-neutral-gray-300 block max-w-xs truncate">
                        {decision.description || "No description"}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-neutral-gray-700 dark:text-neutral-gray-300">
                        {decision.creator?.fullName ||
                          decision.creator?.email ||
                          "Unknown"}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-neutral-black dark:text-white">
                        {new Date(decision.lastReviewedAt).toLocaleDateString()}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
};

export default DecisionLogTable;
