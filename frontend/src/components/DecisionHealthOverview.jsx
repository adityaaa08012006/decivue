import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import api from '../services/api';

const HorizontalProgressCard = ({ title, value, total, status }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  const statusColors = {
    danger: {
      filled: 'bg-gradient-to-r from-red-400 to-red-500',
      empty: 'bg-red-100',
      text: 'text-neutral-black'
    },
    success: {
      filled: 'bg-gradient-to-r from-green-400 to-green-500',
      empty: 'bg-green-100',
      text: 'text-neutral-black'
    },
    warning: {
      filled: 'bg-gradient-to-r from-amber-400 to-amber-500',
      empty: 'bg-amber-100',
      text: 'text-neutral-black'
    }
  };

  const colors = statusColors[status] || statusColors.success;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-gray-200">
      {/* Progress Bar */}
      <div className="flex gap-2 mb-4">
        <div className={`h-2 rounded-full ${colors.filled}`} style={{ width: `${percentage}%` }}></div>
        <div className={`h-2 rounded-full ${colors.empty} flex-1`}></div>
      </div>
      
      {/* Label */}
      <div className="text-sm font-medium text-neutral-gray-600 mb-2">
        {title}
      </div>
      
      {/* Value */}
      <div className={`text-4xl font-bold ${colors.text}`}>
        {value}
      </div>
    </div>
  );
};

const DecisionHealthOverview = () => {
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDecisions();
  }, []);

  const fetchDecisions = async () => {
    try {
      setLoading(true);
      const data = await api.getDecisions();
      setDecisions(data);
    } catch (err) {
      console.error('Failed to fetch decisions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate health statistics from real data
  const calculateHealthStats = () => {
    const total = decisions.length;
    const atRisk = decisions.filter(d => d.lifecycle === 'AT_RISK' || d.lifecycle === 'INVALIDATED').length;
    const stable = decisions.filter(d => d.lifecycle === 'STABLE').length;
    const underReview = decisions.filter(d => d.lifecycle === 'UNDER_REVIEW').length;

    return [
      {
        id: 1,
        title: 'Major Insight needed:',
        value: atRisk,
        total: total || 10,
        status: 'danger',
      },
      {
        id: 2,
        title: 'In good health:',
        value: stable,
        total: total || 10,
        status: 'success',
      },
      {
        id: 3,
        title: 'Review Pending:',
        value: underReview,
        total: total || 10,
        status: 'warning',
      },
    ];
  };

  const healthData = calculateHealthStats();

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button className="px-4 py-2 bg-white border border-neutral-gray-300 rounded-lg text-sm font-medium text-neutral-black hover:bg-neutral-gray-50 transition-colors">
          Decision Health Overview
        </button>
        <button className="px-4 py-2 bg-white border border-neutral-gray-300 rounded-lg text-sm font-medium text-neutral-black hover:bg-neutral-gray-50 transition-colors flex items-center gap-2">
          Daily
          <ChevronDown size={16} />
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {healthData.map((item) => (
          <HorizontalProgressCard
            key={item.id}
            title={item.title}
            value={item.value}
            total={item.total}
            status={item.status}
          />
        ))}
      </div>
    </div>
  );
};

export default DecisionHealthOverview;
