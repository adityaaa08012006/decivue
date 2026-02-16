import React from 'react';
import { motion } from 'framer-motion';

const DecisionNode = ({ cx, cy, delay = 0 }) => {
  return (
    <g>
      {/* Outer glow/pulse - Blue/Teal for dark theme */}
      <motion.circle
        cx={cx}
        cy={cy}
        r="8"
        fill="#3b82f6"
        initial={{ opacity: 0.2, scale: 1 }}
        animate={{ opacity: [0.2, 0.6, 0.2], scale: [1, 1.8, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, delay }}
      />
      {/* Inner strong circle */}
      <circle cx={cx} cy={cy} r="5" fill="#3b82f6" stroke="#0B0F19" strokeWidth="2" />
    </g>
  );
};

export const DecisionGraph = () => {
  const width = 800;
  const height = 300;
  
  // Create a smoother, wider wave for the large card
  // Start lower left, curve up, slight dip, then curve up to right
  const pathD = `M 50 ${height - 60} 
                 C 200 ${height - 60}, 
                   300 ${height - 180}, 
                   450 ${height - 150} 
                 S 650 ${height - 180}, 
                   750 ${height - 120}`;

  // Dates overlay configuration
  const labels = [
    { text: "10 Oct", x: "6%" },
    { text: "11 Oct", x: "20%" },
    { text: "11/1PM", x: "35%" },
    { text: "11 / 5PM", x: "50%" },
    { text: "11/10PM", x: "65%" },
    { text: "12/1AM", x: "80%" },
    { text: "13/1AM", x: "92%" },
  ];

  return (
    <div className="w-full bg-[#0B0F19] rounded-3xl border border-gray-800 shadow-2xl relative overflow-hidden h-[360px] flex flex-col items-center justify-center p-8 group">
      
      {/* Date Markers Row */}
      <div className="w-full flex justify-between px-8 mb-8 text-[11px] font-mono text-gray-400 uppercase tracking-widest opacity-60">
        {labels.map((label, i) => (
          <span key={i}>{label.text}</span>
        ))}
      </div>

      {/* Graph Area */}
      <div className="relative w-full h-[220px]">
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          {/* Base Path (Dark Blue/Gray) */}
          <path
            d={pathD}
            fill="none"
            stroke="#1e293b"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Animated Active Line (Blue) */}
          <motion.path
            d={pathD}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="4"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 3, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
          />

          {/* Moving Particle */}
          <motion.circle
            r="4"
            fill="#fff"
            filter="drop-shadow(0 0 4px rgba(59, 130, 246, 0.8))"
          >
            <motion.animateMotion
              dur="3s"
              repeatCount="indefinite"
              path={pathD}
            />
          </motion.circle>

          {/* Nodes at strategic points */}
          <DecisionNode cx={50} cy={height - 60} delay={0} />
          <DecisionNode cx={280} cy={height - 130} delay={0.8} />
          <DecisionNode cx={450} cy={height - 150} delay={1.6} />
          <DecisionNode cx={600} cy={height - 165} delay={2.4} />
          <DecisionNode cx={750} cy={height - 120} delay={3.2} />
        </svg>
      </div>
    </div>
  );
};
