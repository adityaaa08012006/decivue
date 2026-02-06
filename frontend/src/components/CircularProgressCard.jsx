import React, { useEffect, useState } from 'react';

const CircularProgress = ({
  percentage,
  color,
  size = 120,
  strokeWidth = 12,
  animate = true
}) => {
  const [progress, setProgress] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => {
        setProgress(percentage);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setProgress(percentage);
    }
  }, [percentage, animate]);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#E5E7EB"
        strokeWidth={strokeWidth}
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  );
};

const CircularProgressCard = ({ title, value, total, status = 'neutral', animate = true }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  const statusColors = {
    danger: '#E53761',
    success: '#10B981',
    warning: '#F59E0B',
    neutral: '#6B7280',
  };

  const color = statusColors[status] || statusColors.neutral;

  return (
    <div className="bg-white rounded-2xl border border-neutral-gray-200 p-6 flex flex-col items-center justify-center min-h-[240px] hover:shadow-lg transition-shadow">
      <div className="relative flex items-center justify-center mb-4">
        <CircularProgress
          percentage={percentage}
          color={color}
          animate={animate}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold text-neutral-black">{value}</span>
        </div>
      </div>
      <h3 className="text-center text-base font-semibold text-neutral-black max-w-[180px]">
        {title}
      </h3>
    </div>
  );
};

export default CircularProgressCard;
