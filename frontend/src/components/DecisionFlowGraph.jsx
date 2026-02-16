import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Shield, AlertTriangle, CheckCircle, Lock, Pause } from 'lucide-react';

const DecisionNode = ({ cx, cy, color = '#3b82f6', delay = 0, size = 'medium' }) => {
  const radius = size === 'large' ? 10 : 6;
  const innerRadius = size === 'large' ? 6 : 4;
  
  return (
    <g>
      {/* Outer glow/pulse */}
      <motion.circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={color}
        initial={{ opacity: 0.2, scale: 1 }}
        animate={{ opacity: [0.2, 0.6, 0.2], scale: [1, 1.8, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, delay }}
      />
      {/* Inner strong circle */}
      <circle cx={cx} cy={cy} r={innerRadius} fill={color} stroke="#1a1f2e" strokeWidth="2" />
    </g>
  );
};

const EventLabel = ({ x, y, text, icon, color = 'blue', delay = 0 }) => {
  const colorMap = {
    green: { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.4)', text: '#34d399', dot: '#10b981' },
    blue: { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.4)', text: '#60a5fa', dot: '#3b82f6' },
    red: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.4)', text: '#f87171', dot: '#ef4444' },
    yellow: { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.4)', text: '#fbbf24', dot: '#f59e0b' },
  };

  const colors = colorMap[color] || colorMap.blue;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: "easeOut" }}
      className="absolute backdrop-blur-sm rounded-lg shadow-lg py-1.5 px-2.5 flex items-center gap-1.5 border z-20"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div 
        className="w-1.5 h-1.5 rounded-full shadow-sm"
        style={{ backgroundColor: colors.dot, boxShadow: `0 0 6px ${colors.dot}` }}
      />
      <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: colors.text }}>
        {text}
      </span>
      {icon && <div className="ml-0.5" style={{ color: colors.text }}>{icon}</div>}
    </motion.div>
  );
};

export const DecisionFlowGraph = () => {
  const width = 900;
  const height = 280;
  
  // Smoother wave path that flows through decision lifecycle
  const pathD = `M 60 ${height - 40} 
                 C 150 ${height - 45}, 
                   220 ${height - 100}, 
                   300 ${height - 95} 
                 C 380 ${height - 90},
                   450 ${height - 140},
                   540 ${height - 135}
                 C 620 ${height - 130},
                   720 ${height - 85},
                   840 ${height - 80}`;

  // Timeline dates - cleaner spacing
  const timelineDates = [
    { text: "11 Oct" },
    { text: "12 Oct" },
    { text: "Today" },
    { text: "Future" },
  ];

  // Events with better positioning for cleaner layout
  const events = [
    { x: 7, y: 78, text: 'Decision Created', color: 'green', delay: 0.2, nodeX: 60, nodeY: height - 40, size: 'large' },
    { x: 18, y: 55, text: 'Assumption Finalized', color: 'blue', delay: 0.5, nodeX: 180, nodeY: height - 75, icon: <Lock size={11} /> },
    { x: 30, y: 32, text: 'Stakeholder Review', color: 'blue', delay: 0.8, nodeX: 280, nodeY: height - 105 },
    { x: 42, y: 68, text: 'Risk Detected', color: 'red', delay: 1.1, nodeX: 400, nodeY: height - 85, icon: <AlertTriangle size={11} /> },
    { x: 56, y: 28, text: 'Decision Updated', color: 'blue', delay: 1.4, nodeX: 520, nodeY: height - 140 },
    { x: 68, y: 32, text: 'AI Insight Triggered', color: 'blue', delay: 1.7, nodeX: 640, nodeY: height - 130, icon: <Brain size={11} /> },
    { x: 82, y: 58, text: 'Audit Logged', color: 'blue', delay: 2.0, nodeX: 760, nodeY: height - 83, icon: <Shield size={11} /> },
    { x: 93, y: 65, text: 'Decision Deprecated', color: 'blue', delay: 2.3, nodeX: 840, nodeY: height - 80, icon: <Pause size={11} /> },
  ];

  return (
    <div className="w-full bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#111827] rounded-3xl border border-blue-900/30 shadow-2xl relative overflow-visible h-[380px] flex flex-col p-6">
      
      {/* Header with "Decision Flow" title */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xs font-medium text-gray-400 tracking-wider">Decision Flow</h3>
      </div>

      {/* Timeline Date Markers */}
      <div className="flex justify-between px-6 mb-5 text-[11px] text-gray-500 font-medium">
        {timelineDates.map((date, i) => (
          <span key={i}>{date.text}</span>
        ))}
      </div>

      {/* Graph Area */}
      <div className="relative w-full flex-grow">
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          {/* Base Path (Dark) */}
          <path
            d={pathD}
            fill="none"
            stroke="#1e3a5f"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Animated Active Line (Blue Gradient) */}
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="30%" stopColor="#3b82f6" />
              <stop offset="70%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          
          <motion.path
            d={pathD}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, ease: "easeInOut" }}
          />

          {/* Event Nodes */}
          {events.map((event, i) => (
            <DecisionNode 
              key={i}
              cx={event.nodeX} 
              cy={event.nodeY} 
              color={event.color === 'green' ? '#10b981' : event.color === 'red' ? '#ef4444' : '#3b82f6'}
              delay={event.delay}
              size={event.size}
            />
          ))}

          {/* Glowing Moving Particle */}
          <motion.circle
            r="3"
            fill="#fff"
            filter="drop-shadow(0 0 6px rgba(59, 130, 246, 0.9))"
          >
            <motion.animateMotion
              dur="4s"
              repeatCount="indefinite"
              path={pathD}
            />
          </motion.circle>
        </svg>

        {/* Event Labels (Positioned outside SVG for better styling) */}
        {events.map((event, i) => (
          <EventLabel
            key={i}
            x={event.x}
            y={event.y}
            text={event.text}
            icon={event.icon}
            color={event.color}
            delay={event.delay + 0.5}
          />
        ))}
      </div>

      {/* Status Badges at Bottom */}
      <div className="flex justify-center gap-2.5 mt-5">
        <div className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[10px] font-medium">
          Stable
        </div>
        <div className="px-3 py-1 rounded-full bg-yellow-500/15 border border-yellow-500/40 text-yellow-400 text-[10px] font-medium">
          At Risk
        </div>
        <div className="px-3 py-1 rounded-full bg-red-500/15 border border-red-500/40 text-red-400 text-[10px] font-medium">
          Critical
        </div>
      </div>
    </div>
  );
};
