import React, { useState, useEffect } from 'react';
import { CheckCircle, Eye, Clock, AlertTriangle, RotateCcw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const DecisionLogTable = ({ onNavigate }) => {
  const { isLead } = useAuth();
  const [decisions, setDecisions] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approving, setApproving] = useState(null);

  useEffect(() => {
    if (isLead) {
      fetchPendingApprovals();
    } else {
      fetchDecisions();
    }
  }, [isLead]);

  const fetchDecisions = async () => {
    try {
      setLoading(true);
      const data = await api.getDecisions();
      setDecisions(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch decisions:', err);
      setError('Failed to load decisions. Please make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const data = await api.getPendingApprovals();
      setPendingApprovals(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch pending approvals:', err);
      setError('Failed to load pending approvals.');
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
      console.error('Failed to approve/reject request:', err);
      alert(`Failed to ${approved ? 'approve' : 'reject'} request. Please try again.`);
      setApproving(null);
    }
  };

  const handleView = (decisionId) => {
    // Navigate to decision monitoring page
    if (onNavigate) {
      onNavigate('monitoring');
    }
  };

  const mapLifecycleToStatus = (lifecycle) => {
    const statusMap = {
      'STABLE': 'Approved',
      'UNDER_REVIEW': 'Pending',
      'AT_RISK': 'Declined',
      'INVALIDATED': 'Disregarded',
      'RETIRED': 'Disregarded'
    };
    return statusMap[lifecycle] || 'Pending';
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      Approved: 'bg-status-green text-white',
      Pending: 'bg-status-gray text-white',
      Declined: 'bg-primary-red text-white',
      Disregarded: 'bg-primary-blue text-white',
    };

    return (
      <span className={`px-3 py-1 rounded text-xs font-semibold ${statusStyles[status]}`}>
        {status}
      </span>
    );
  };

  const getTierBadge = (tier) => {
    const tierStyles = {
      'standard': 'bg-gray-100 text-gray-700',
      'high_impact': 'bg-orange-100 text-orange-700',
      'critical': 'bg-red-100 text-red-700',
    };

    const tierLabels = {
      'standard': 'Standard',
      'high_impact': 'High Impact',
      'critical': 'Critical',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${tierStyles[tier] || tierStyles.standard}`}>
        {tierLabels[tier] || tier}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-neutral-black">
          {isLead ? 'Pending Approvals' : 'Decision log'}
        </h2>
        <button 
          onClick={isLead ? fetchPendingApprovals : fetchDecisions}
          className="px-3 py-2 text-sm text-primary-blue hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
        >
          <RotateCcw size={16} />
          Refresh
        </button>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div>
          <p className="mt-2 text-neutral-gray-600">Loading...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* TEAM LEAD VIEW - Pending Approvals */}
      {isLead && !loading && !error && pendingApprovals.length === 0 && (
        <div className="text-center py-8">
          <CheckCircle className="mx-auto text-green-500 mb-3" size={48} />
          <p className="text-neutral-gray-600 font-medium">No pending approvals</p>
          <p className="text-sm text-neutral-gray-500 mt-1">All edit requests have been processed</p>
        </div>
      )}

      {isLead && !loading && !error && pendingApprovals.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-gray-300">
                <th className="text-left py-4 px-4 text-sm font-semibold text-neutral-black">
                  Decision
                </th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-neutral-black">
                  Tier
                </th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-neutral-black">
                  Requested By
                </th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-neutral-black">
                  Justification
                </th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-neutral-black">
                  Requested
                </th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-neutral-black">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {pendingApprovals.map((approval) => (
                <tr
                  key={approval.auditId}
                  className="border-b border-neutral-gray-200 last:border-b-0 hover:bg-neutral-gray-50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div>
                      <span className="text-sm font-medium text-neutral-black bg-blue-50 px-3 py-1.5 rounded block mb-1">
                        {approval.decisionTitle}
                      </span>
                      {approval.decisionDescription && (
                        <span className="text-xs text-neutral-gray-600">
                          {approval.decisionDescription.substring(0, 60)}
                          {approval.decisionDescription.length > 60 ? '...' : ''}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {getTierBadge(approval.governanceTier)}
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm">
                      <div className="font-medium text-neutral-black">{approval.requestedBy}</div>
                      <div className="text-xs text-neutral-gray-600">{approval.requestedByEmail}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4 max-w-xs">
                    <p className="text-sm text-neutral-gray-700 line-clamp-2">
                      {approval.justification}
                    </p>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1 text-xs text-neutral-gray-600">
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
      {!isLead && !loading && !error && decisions.length === 0 && (
        <div className="text-center py-8">
          <p className="text-neutral-gray-600">No decisions found. Create your first decision!</p>
        </div>
      )}

      {!isLead && !loading && !error && decisions.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-gray-300">
                <th className="text-left py-4 px-4 text-sm font-semibold text-neutral-black">
                  Decision
                </th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-neutral-black">
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
            <tbody>
              {decisions.map((decision) => (
                <tr
                  key={decision.id}
                  onClick={() => handleView(decision.id)}
                  className="border-b border-neutral-gray-200 last:border-b-0 hover:bg-neutral-gray-50 transition-colors cursor-pointer"
                >
                  <td className="py-4 px-4">
                    <span className="text-sm text-neutral-black bg-blue-50 px-3 py-1.5 rounded">
                      {decision.title}
                    </span>
                  </td>
                  <td className="py-4 px-4">{getStatusBadge(mapLifecycleToStatus(decision.lifecycle))}</td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-neutral-gray-700 dark:text-neutral-gray-300">{decision.description || 'No description'}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-neutral-gray-700 dark:text-neutral-gray-300">
                      {decision.creator?.fullName || decision.creator?.email || 'Unknown'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-neutral-black dark:text-white">
                      {new Date(decision.lastReviewedAt).toLocaleDateString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DecisionLogTable;
