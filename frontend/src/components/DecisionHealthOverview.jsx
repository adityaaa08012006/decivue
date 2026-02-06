import React from 'react';
import { ChevronDown } from 'lucide-react';
import CircularProgressCard from './CircularProgressCard';

const DecisionHealthOverview = () => {
  const healthData = [
    {
      id: 1,
      title: 'Major Insight needed:',
      value: 3,
      total: 10,
      status: 'danger',
    },
    {
      id: 2,
      title: 'In good health:',
      value: 10,
      total: 10,
      status: 'success',
    },
    {
      id: 3,
      title: 'Review Pending:',
      value: 7,
      total: 10,
      status: 'warning',
    },
  ];

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
          <CircularProgressCard
            key={item.id}
            title={item.title}
            value={item.value}
            total={item.total}
            status={item.status}
            animate={true}
          />
        ))}
      </div>
    </div>
  );
};

export default DecisionHealthOverview;
