import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Shield, AlertTriangle, CheckCircle, Lock, Pause } from 'lucide-react';

const DecisionNode = ({ cx, cy, color = '#3b82f6', delay = 0, size = 'medium' }) => {
  const radius = size === 'large' ? 12 : 8;
  const innerRadius = size === 'large' ? 7 : 5;
  
  return (
    <g>
      {/* Outer ring with subtle glow */}
      <motion.circle
        cx={cx}
        cy={cy}
        r={radius + 4}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.15"
        initial={{ scale: 1, opacity: 0.15 }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 3, repeat: Infinity, delay }}
      />
      {/* Middle soft ring */}
      <circle 
        cx={cx} 
        cy={cy} 
        r={radius} 
        fill={`${color}15`} 
        stroke={`${color}40`} 
        strokeWidth="1"
      />
      {/* Inner solid circle */}
      <circle 
        cx={cx} 
        cy={cy} 
        r={innerRadius} 
        fill={color} 
        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.08))"
      />
    </g>
  );
};

const EventLabel = ({ labelX, labelY, nodeX, nodeY, text, icon, color = 'blue', delay = 0, containerWidth, containerHeight }) => {
  const colorMap = {
    green: { dot: '#86EFAC', stroke: '#86EFAC' },
    blue: { dot: '#93C5FD', stroke: '#93C5FD' },
    red: { dot: '#FCA5A5', stroke: '#FCA5A5' },
    orange: { dot: '#FCD34D', stroke: '#FCD34D' },
    gray: { dot: '#CBD5E1', stroke: '#CBD5E1' },
  };

  const dotColor = colorMap[color]?.dot || colorMap.blue.dot;
  const stemColor = colorMap[color]?.stroke || colorMap.blue.stroke;

  // Calculate absolute positions for connector
  const labelAbsX = (labelX / 100) * containerWidth;
  const labelAbsY = (labelY / 100) * containerHeight;
  
  // Calculate distance to determine if we need a connector
  const distance = Math.abs(labelAbsY - nodeY);
  const showConnector = distance > 20;

  return (
    <>
      {/* Connector Stem - subtle 2px vertical line */}
      {showConnector && (
        <motion.div
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 0.3, scaleY: 1 }}
          transition={{ delay: delay + 0.2, duration: 0.4, ease: "easeOut" }}
          className="absolute z-10"
          style={{
            left: `${labelX}%`,
            top: labelAbsY < nodeY ? `${labelY}%` : `${(nodeY / containerHeight) * 100}%`,
            width: '2px',
            height: `${Math.abs(labelAbsY - nodeY)}px`,
            backgroundColor: stemColor,
            transform: 'translateX(-50%)',
            transformOrigin: 'top',
          }}
        />
      )}
      
      {/* Label Pill */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.5, ease: "easeOut" }}
        className="absolute bg-white rounded-full shadow-md py-2 px-3.5 flex items-center gap-2 border border-gray-200 z-20"
        style={{
          left: `${labelX}%`,
          top: `${labelY}%`,
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.06)',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        }}
      >
        <div 
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
        <span className="text-xs font-medium whitespace-nowrap text-gray-800" style={{ letterSpacing: '0.01em' }}>
          {text}
        </span>
        {icon && <div className="text-gray-500" style={{ fontSize: '13px' }}>{icon}</div>}
      </motion.div>
    </>
  );
};

// Helper function to generate smooth, organic Bézier curves between points
const getCurvyPath = (points) => {
  if (points.length < 2) return '';
  
  let path = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    
    // Create smooth, natural curves with calculated control points
    // Control points are positioned to create flowing, organic arcs
    const tension = 0.5; // Control the curve smoothness
    
    // First control point: offset horizontally from p1
    const cp1x = p1.x + dx * tension;
    const cp1y = p1.y;
    
    // Second control point: offset horizontally from p2
    const cp2x = p2.x - dx * tension;
    const cp2y = p2.y;
    
    // Draw cubic Bézier curve
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  
  return path;
};

export const DecisionFlowGraph = () => {
  const width = 1400;
  const height = 400;
  
  // Define milestone points spanning full width edge-to-edge with dramatic, elegant curves
  const milestonePoints = [
    { x: 0, y: height - 180 },        // Start absolute left edge
    { x: 175, y: height - 260 },      // First peak - high
    { x: 350, y: height - 140 },      // Valley - lower
    { x: 525, y: height - 80 },       // Deep valley - lowest
    { x: 700, y: height - 200 },      // Rising - center
    { x: 875, y: height - 280 },      // High peak - highest
    { x: 1050, y: height - 200 },     // Descent
    { x: 1225, y: height - 160 },     // Mid descent
    { x: 1400, y: height - 220 },     // End absolute right edge
  ];
  
  // Generate curve
  const pathD = getCurvyPath(milestonePoints);
  
  // Timeline dates with updated styling
  const timelineDates = [
    { text: "11 Oct", x: 5 },
    { text: "12 Oct", x: 32 },
    { text: "Today", x: 62 },
    { text: "Future", x: 92 },
  ];

  // Smart positioning logic with proper spacing
  const labelOffset = 70; // pixels offset for labels from nodes
  
  const events = [
    // Node 1: Start - label BELOW
    { 
      nodeX: 0, nodeY: height - 180, 
      labelX: 3, 
      labelY: ((height - 180 + labelOffset) / height) * 100, 
      text: 'Decision Created', color: 'green', delay: 0.3, size: 'large' 
    },
    // Node 2: First peak - label ABOVE
    { 
      nodeX: 175, nodeY: height - 260,
      labelX: (175 / width) * 100,
      labelY: ((height - 260 - labelOffset) / height) * 100,
      text: 'Assumption Finalized', color: 'orange', delay: 0.6, icon: <Lock size={13} /> 
    },
    // Node 3: Valley - label ABOVE
    { 
      nodeX: 350, nodeY: height - 140,
      labelX: (350 / width) * 100,
      labelY: ((height - 140 - labelOffset) / height) * 100,
      text: 'Stakeholder Review', color: 'blue', delay: 0.9 
    },
    // Node 4: Deep valley - label BELOW
    { 
      nodeX: 525, nodeY: height - 80,
      labelX: (525 / width) * 100,
      labelY: ((height - 80 + labelOffset) / height) * 100,
      text: 'Risk Detected', color: 'red', delay: 1.2, icon: <AlertTriangle size={13} /> 
    },
    // Node 5: Rising - label BELOW
    { 
      nodeX: 700, nodeY: height - 200,
      labelX: (700 / width) * 100,
      labelY: ((height - 200 + labelOffset) / height) * 100,
      text: 'Decision Updated', color: 'orange', delay: 1.5 
    },
    // Node 6: High peak - label ABOVE
    { 
      nodeX: 875, nodeY: height - 280,
      labelX: (875 / width) * 100,
      labelY: ((height - 280 - labelOffset) / height) * 100,
      text: 'AI Insight Triggered', color: 'blue', delay: 1.8, icon: <Brain size={13} /> 
    },
    // Node 7: Descent - label ABOVE
    { 
      nodeX: 1050, nodeY: height - 200,
      labelX: (1050 / width) * 100,
      labelY: ((height - 200 - labelOffset) / height) * 100,
      text: 'Audit Logged', color: 'blue', delay: 2.1, icon: <Shield size={13} /> 
    },
    // Node 8: End - label ABOVE
    { 
      nodeX: 1400, nodeY: height - 220,
      labelX: 97,
      labelY: ((height - 220 - labelOffset) / height) * 100,
      text: 'Decision Deprecated', color: 'gray', delay: 2.4, icon: <Pause size={13} /> 
    },
  ];

  return (
    <div className="w-full relative overflow-visible py-8">
      
        {/* Timeline Date Markers */}
        <div className="flex justify-between px-12 mb-8">
          {timelineDates.map((date, i) => (
            <span 
              key={i} 
              className="text-sm font-medium text-gray-400 tracking-wide"
              style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
            >
              {date.text}
            </span>
          ))}
        </div>

        {/* Graph Area */}
        <div className="relative w-full" style={{ height: `${height}px` }}>
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
            <defs>
              {/* Gradient for the main line - softer pastel colors */}
              <linearGradient id="lightLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#86EFAC" />
                <stop offset="20%" stopColor="#93C5FD" />
                <stop offset="50%" stopColor="#A5B4FC" />
                <stop offset="80%" stopColor="#C4B5FD" />
                <stop offset="100%" stopColor="#CBD5E1" />
              </linearGradient>
              
              {/* Subtle glow filter */}
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Base subtle line */}
            <path
              d={pathD}
              fill="none"
              stroke="#F1F5F9"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Main animated line with soft gradient */}
            <motion.path
              d={pathD}
              fill="none"
              stroke="url(#lightLineGradient)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 2.5, ease: "easeInOut" }}
            />

            {/* Event Nodes */}
            {events.map((event, i) => {
              const nodeColors = {
                green: '#86EFAC',
                blue: '#93C5FD',
                red: '#FCA5A5',
                orange: '#FCD34D',
                gray: '#CBD5E1',
              };
              return (
                <DecisionNode 
                  key={i}
                  cx={event.nodeX} 
                  cy={event.nodeY} 
                  color={nodeColors[event.color] || nodeColors.blue}
                  delay={event.delay}
                  size={event.size}
                />
              );
            })}

            {/* Glowing Moving Particle */}
            <motion.circle
              r="4"
              fill="#93C5FD"
              filter="drop-shadow(0 0 8px rgba(147, 197, 253, 0.6))"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <motion.animateMotion
                dur="5s"
                repeatCount="indefinite"
                path={pathD}
              />
            </motion.circle>
          </svg>

          {/* Event Labels (Positioned outside SVG for better styling) */}
          {events.map((event, i) => (
            <EventLabel
              key={i}
              labelX={event.labelX}
              labelY={event.labelY}
              nodeX={event.nodeX}
              nodeY={event.nodeY}
              text={event.text}
              icon={event.icon}
              color={event.color}
              delay={event.delay + 0.6}
              containerWidth={width}
              containerHeight={height}
            />
          ))}
        </div>

        {/* Status Badges at Bottom */}
        <div className="flex justify-center gap-4 mt-16" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
          <div className="px-5 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
            Stable
          </div>
          <div className="px-5 py-2 rounded-full bg-amber-50 border border-amber-300 text-amber-700 text-sm font-medium">
            At Risk
          </div>
          <div className="px-5 py-2 rounded-full bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            Critical
          </div>
        </div>
    </div>
  );
};
