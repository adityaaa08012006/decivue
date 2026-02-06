import React, { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import api from '../services/api';

const DecisionLogTable = () => {
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDecisions();
  }, []);

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

  return (
    <div className="bg-white rounded-2xl border border-neutral-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-neutral-black">Decision log</h2>
        <button 
          onClick={fetchDecisions}
          className="px-3 py-2 text-sm text-primary-blue hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
        >
          <RotateCcw size={16} />
          Refresh
        </button>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div>
          <p className="mt-2 text-neutral-gray-600">Loading decisions...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && decisions.length === 0 && (
        <div className="text-center py-8">
          <p className="text-neutral-gray-600">No decisions found. Create your first decision!</p>
        </div>
      )}

      {!loading && !error && decisions.length > 0 && (
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
                <th className="text-left py-4 px-4 text-sm font-semibold text-neutral-black">
                  Description
                </th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-neutral-black">
                  Last Reviewed
                </th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-neutral-black">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {decisions.map((decision) => (
                <tr
                  key={decision.id}
                  className="border-b border-neutral-gray-200 last:border-b-0 hover:bg-neutral-gray-50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <span className="text-sm text-neutral-black bg-blue-50 px-3 py-1.5 rounded">
                      {decision.title}
                    </span>
                  </td>
                  <td className="py-4 px-4">{getStatusBadge(mapLifecycleToStatus(decision.lifecycle))}</td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-neutral-gray-700">{decision.description || 'No description'}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-neutral-black">
                      {new Date(decision.lastReviewedAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-2">
                      <button className="px-4 py-1.5 bg-status-green text-white text-sm font-semibold rounded-md hover:bg-green-600 transition-colors">
                        Acknowledge
                      </button>
                      <button className="px-4 py-1.5 bg-status-orange text-white text-sm font-semibold rounded-md hover:bg-orange-600 transition-colors flex items-center gap-1">
                        Review
                        <RotateCcw size={14} />
                      </button>
                    </div>
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
