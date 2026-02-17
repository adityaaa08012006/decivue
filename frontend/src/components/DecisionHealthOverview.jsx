import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import api from '../services/api';

const HorizontalProgressCard = ({ title, value, total, status, index }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  const statusColors = {
    danger: {
      filled: 'bg-gradient-to-r from-red-400 to-red-500',
      empty: 'bg-red-100 dark:bg-red-900/20',
      text: 'text-neutral-black dark:text-white'
    },
    success: {
      filled: 'bg-gradient-to-r from-green-400 to-green-500',
      empty: 'bg-green-100 dark:bg-green-900/20',
      text: 'text-neutral-black dark:text-white'
    },
    warning: {
      filled: 'bg-gradient-to-r from-amber-400 to-amber-500',
      empty: 'bg-amber-100 dark:bg-amber-900/20',
      text: 'text-neutral-black dark:text-white'
    }
  };

  const colors = statusColors[status] || statusColors.success;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="bg-white dark:bg-neutral-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-lg border border-neutral-gray-200 dark:border-neutral-gray-700 transition-shadow cursor-pointer"
    >
      {/* Progress Bar */}
      <motion.div 
        className="flex gap-2 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.1 + 0.3 }}
      >
        <motion.div 
          className={`h-2 rounded-full ${colors.filled}`} 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ delay: index * 0.1 + 0.5, duration: 0.8, ease: "easeOut" }}
        ></motion.div>
        <div className={`h-2 rounded-full ${colors.empty} flex-1`}></div>
      </motion.div>
      
      {/* Label */}
      <div className="text-sm font-medium text-neutral-gray-600 dark:text-neutral-gray-400 mb-2">
        {title}
      </div>
      
      {/* Value */}
      <div className={`text-4xl font-bold ${colors.text}`}>
        {value}
      </div>
    </motion.div>
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
        <button className="px-4 py-2 bg-white dark:bg-neutral-gray-700 border border-neutral-gray-300 dark:border-neutral-gray-600 rounded-lg text-sm font-medium text-neutral-black dark:text-white hover:bg-neutral-gray-50 dark:hover:bg-neutral-gray-600 transition-colors">
          Decision Health Overview
        </button>
        <button className="px-4 py-2 bg-white dark:bg-neutral-gray-700 border border-neutral-gray-300 dark:border-neutral-gray-600 rounded-lg text-sm font-medium text-neutral-black dark:text-white hover:bg-neutral-gray-50 dark:hover:bg-neutral-gray-600 transition-colors flex items-center gap-2">
          Daily
          <ChevronDown size={16} />
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {healthData.map((item, index) => (
          <HorizontalProgressCard
            key={item.id}
            index={index}
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
