import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Shield, AlertTriangle, CheckCircle, Lock, Pause } from 'lucide-react';

const DecisionNode = ({ cx, cy, color = '#3b82f6', delay = 0, size = 'medium', onHover }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const radius = size === 'large' ? 12 : 8;
  const innerRadius = size === 'large' ? 7 : 5;
  
  return (
    <g 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      {/* Outer ripple effect - enhanced breathing */}
      <motion.circle
        cx={cx}
        cy={cy}
        r={radius + 4}
        fill="none"
        stroke={color}
        strokeWidth="2"
        opacity="0.15"
        initial={{ scale: 1, opacity: 0.15 }}
        animate={{ 
          scale: isHovered ? [1.5, 2, 1.5] : [1, 1.4, 1], 
          opacity: isHovered ? [0.3, 0.5, 0.3] : [0.15, 0.3, 0.15] 
        }}
        transition={{ duration: isHovered ? 1.5 : 3, repeat: Infinity, delay }}
      />
      
      {/* Second ripple layer */}
      <motion.circle
        cx={cx}
        cy={cy}
        r={radius + 8}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.1"
        initial={{ scale: 1, opacity: 0.1 }}
        animate={{ 
          scale: [1, 1.6, 1], 
          opacity: [0.1, 0.25, 0.1] 
        }}
        transition={{ duration: 4, repeat: Infinity, delay: delay + 0.5 }}
      />
      
      {/* Middle glow ring with enhanced hover */}
      <motion.circle 
        cx={cx} 
        cy={cy} 
        r={radius} 
        fill={`${color}20`} 
        stroke={`${color}50`} 
        strokeWidth="1.5"
        animate={isHovered ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.6, repeat: isHovered ? Infinity : 0 }}
      />
      
      {/* Inner solid circle with enhanced glow */}
      <motion.circle 
        cx={cx} 
        cy={cy} 
        r={innerRadius} 
        fill={color}
        filter={isHovered ? "drop-shadow(0 0 12px rgba(147, 197, 253, 0.6))" : "drop-shadow(0 2px 4px rgba(0,0,0,0.08))"}
        animate={isHovered ? { scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 0.8, repeat: isHovered ? Infinity : 0 }}
      />
      
      {/* Hover star burst effect */}
      {isHovered && (
        <>
          {[0, 60, 120, 180, 240, 300].map((angle, i) => (
            <motion.line
              key={i}
              x1={cx}
              y1={cy}
              x2={cx + Math.cos(angle * Math.PI / 180) * (radius + 20)}
              y2={cy + Math.sin(angle * Math.PI / 180) * (radius + 20)}
              stroke={color}
              strokeWidth="1"
              opacity="0.4"
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: [0, 0.4, 0], pathLength: [0, 1, 1] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
            />
          ))}
        </>
      )}
    </g>
  );
};

const EventLabel = ({ labelX, labelY, nodeX, nodeY, text, icon, color = 'blue', delay = 0, containerWidth, containerHeight }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  
  const colorMap = {
    green: { dot: '#86EFAC', stroke: '#86EFAC', glow: 'rgba(134, 239, 172, 0.2)' },
    blue: { dot: '#93C5FD', stroke: '#93C5FD', glow: 'rgba(147, 197, 253, 0.2)' },
    red: { dot: '#FCA5A5', stroke: '#FCA5A5', glow: 'rgba(252, 165, 165, 0.2)' },
    orange: { dot: '#FCD34D', stroke: '#FCD34D', glow: 'rgba(252, 211, 77, 0.2)' },
    gray: { dot: '#CBD5E1', stroke: '#CBD5E1', glow: 'rgba(203, 213, 225, 0.2)' },
  };

  const dotColor = colorMap[color]?.dot || colorMap.blue.dot;
  const stemColor = colorMap[color]?.stroke || colorMap.blue.stroke;
  const glowColor = colorMap[color]?.glow || colorMap.blue.glow;

  // Calculate absolute positions for connector
  const labelAbsX = (labelX / 100) * containerWidth;
  const labelAbsY = (labelY / 100) * containerHeight;
  
  // Calculate distance to determine if we need a connector
  const distance = Math.abs(labelAbsY - nodeY);
  const showConnector = distance > 20;

  return (
    <>
      {/* Connector Stem - enhanced with gradient */}
      {showConnector && (
        <motion.div
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: isHovered ? 0.6 : 0.3, scaleY: 1 }}
          transition={{ delay: delay + 0.2, duration: 0.4, ease: "easeOut" }}
          className="absolute z-10"
          style={{
            left: `${labelX}%`,
            top: labelAbsY < nodeY ? `${labelY}%` : `${(nodeY / containerHeight) * 100}%`,
            width: '2px',
            height: `${Math.abs(labelAbsY - nodeY)}px`,
            background: `linear-gradient(to bottom, ${stemColor}, transparent)`,
            transform: 'translateX(-50%)',
            transformOrigin: 'top',
          }}
        />
      )}
      
      {/* Glassmorphism Label Pill */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.05, y: -2 }}
        transition={{ delay, duration: 0.5, ease: "easeOut" }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="absolute rounded-full py-2 px-3.5 flex items-center gap-2 z-20"
        style={{
          left: `${labelX}%`,
          top: `${labelY}%`,
          transform: 'translate(-50%, -50%)',
          background: isHovered 
            ? `linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85))` 
            : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1.5px solid ${isHovered ? stemColor : 'rgba(255, 255, 255, 0.5)'}`,
          boxShadow: isHovered 
            ? `0 8px 32px ${glowColor}, 0 2px 8px rgba(0, 0, 0, 0.1)` 
            : '0 4px 16px rgba(15, 23, 42, 0.08)',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          cursor: 'pointer',
        }}
      >
        {/* Pulsing dot */}
        <motion.div 
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: dotColor }}
          animate={isHovered ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.8, repeat: isHovered ? Infinity : 0 }}
        />
        <span className="text-xs font-medium whitespace-nowrap text-gray-800" style={{ letterSpacing: '0.01em' }}>
          {text}
        </span>
        {icon && (
          <motion.div 
            className="text-gray-500" 
            style={{ fontSize: '13px' }}
            animate={isHovered ? { rotate: [0, 5, -5, 0] } : {}}
            transition={{ duration: 0.5, repeat: isHovered ? Infinity : 0 }}
          >
            {icon}
          </motion.div>
        )}
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
  const width = 1800;
  const height = 500;
  
  // Define milestone points spanning full width edge-to-edge with dramatic, elegant curves
  const milestonePoints = [
    { x: 0, y: height - 220 },        // Start absolute left edge
    { x: 225, y: height - 320 },      // First peak - high
    { x: 450, y: height - 180 },      // Valley - lower
    { x: 675, y: height - 100 },      // Deep valley - lowest
    { x: 900, y: height - 250 },      // Rising - center
    { x: 1125, y: height - 350 },     // High peak - highest
    { x: 1350, y: height - 250 },     // Descent
    { x: 1575, y: height - 200 },     // Mid descent
    { x: 1800, y: height - 280 },     // End absolute right edge
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
  const labelOffset = 85; // pixels offset for labels from nodes
  
  const events = [
    // Node 1: Start - label BELOW
    { 
      nodeX: 0, nodeY: height - 220, 
      labelX: 3, 
      labelY: ((height - 220 + labelOffset) / height) * 100, 
      text: 'Decision Created', color: 'green', delay: 0.3, size: 'large' 
    },
    // Node 2: First peak - label ABOVE
    { 
      nodeX: 225, nodeY: height - 320,
      labelX: (225 / width) * 100,
      labelY: ((height - 320 - labelOffset) / height) * 100,
      text: 'Assumption Finalized', color: 'orange', delay: 0.6, icon: <Lock size={13} /> 
    },
    // Node 3: Valley - label ABOVE
    { 
      nodeX: 450, nodeY: height - 180,
      labelX: (450 / width) * 100,
      labelY: ((height - 180 - labelOffset) / height) * 100,
      text: 'Stakeholder Review', color: 'blue', delay: 0.9 
    },
    // Node 4: Deep valley - label BELOW
    { 
      nodeX: 675, nodeY: height - 100,
      labelX: (675 / width) * 100,
      labelY: ((height - 100 + labelOffset) / height) * 100,
      text: 'Risk Detected', color: 'red', delay: 1.2, icon: <AlertTriangle size={13} /> 
    },
    // Node 5: Rising - label BELOW
    { 
      nodeX: 900, nodeY: height - 250,
      labelX: (900 / width) * 100,
      labelY: ((height - 250 + labelOffset) / height) * 100,
      text: 'Decision Updated', color: 'orange', delay: 1.5 
    },
    // Node 6: High peak - label ABOVE
    { 
      nodeX: 1125, nodeY: height - 350,
      labelX: (1125 / width) * 100,
      labelY: ((height - 350 - labelOffset) / height) * 100,
      text: 'AI Insight Triggered', color: 'blue', delay: 1.8, icon: <Brain size={13} /> 
    },
    // Node 7: Descent - label ABOVE
    { 
      nodeX: 1350, nodeY: height - 250,
      labelX: (1350 / width) * 100,
      labelY: ((height - 250 - labelOffset) / height) * 100,
      text: 'Audit Logged', color: 'blue', delay: 2.1, icon: <Shield size={13} /> 
    },
    // Node 8: End - label ABOVE
    { 
      nodeX: 1800, nodeY: height - 280,
      labelX: 97,
      labelY: ((height - 280 - labelOffset) / height) * 100,
      text: 'Decision Deprecated', color: 'gray', delay: 2.4, icon: <Pause size={13} /> 
    },
  ];

  return (
    <div className="w-full relative overflow-visible py-8">
      
      {/* Animated Gradient Mesh Background */}
      <div className="absolute inset-0 overflow-hidden rounded-3xl" style={{ zIndex: 0 }}>
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 20% 50%, rgba(134, 239, 172, 0.08), transparent 50%), radial-gradient(circle at 80% 50%, rgba(147, 197, 253, 0.08), transparent 50%), radial-gradient(circle at 50% 80%, rgba(196, 181, 253, 0.08), transparent 50%)',
          }}
          animate={{
            background: [
              'radial-gradient(circle at 20% 50%, rgba(134, 239, 172, 0.08), transparent 50%), radial-gradient(circle at 80% 50%, rgba(147, 197, 253, 0.08), transparent 50%), radial-gradient(circle at 50% 80%, rgba(196, 181, 253, 0.08), transparent 50%)',
              'radial-gradient(circle at 40% 60%, rgba(134, 239, 172, 0.12), transparent 50%), radial-gradient(circle at 60% 40%, rgba(147, 197, 253, 0.12), transparent 50%), radial-gradient(circle at 50% 70%, rgba(196, 181, 253, 0.12), transparent 50%)',
              'radial-gradient(circle at 20% 50%, rgba(134, 239, 172, 0.08), transparent 50%), radial-gradient(circle at 80% 50%, rgba(147, 197, 253, 0.08), transparent 50%), radial-gradient(circle at 50% 80%, rgba(196, 181, 253, 0.08), transparent 50%)',
            ],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      
        {/* Timeline Date Markers */}
        <div className="flex justify-between px-12 mb-8 relative" style={{ zIndex: 10 }}>
          {timelineDates.map((date, i) => (
            <motion.span 
              key={i} 
              className="text-sm font-medium text-gray-400 tracking-wide"
              style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              {date.text}
            </motion.span>
          ))}
        </div>

        {/* Graph Area */}
        <div className="relative w-full" style={{ height: `${height}px`, zIndex: 10 }}>
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
              
              {/* Enhanced glow filter */}
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              
              {/* Shimmer gradient for particles */}
              <linearGradient id="particleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#A5B4FC" stopOpacity="1" />
                <stop offset="100%" stopColor="#C4B5FD" stopOpacity="0.6" />
              </linearGradient>
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

            {/* Multiple Flowing Particles - Constellation Effect */}
            {[0, 1.2, 2.5, 4, 5.5].map((startDelay, i) => (
              <motion.circle
                key={i}
                r={i === 0 ? 5 : 3}
                fill={i === 0 ? "#93C5FD" : "url(#particleGradient)"}
                filter="drop-shadow(0 0 8px rgba(147, 197, 253, 0.8))"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{ 
                  delay: startDelay, 
                  duration: 6,
                  times: [0, 0.1, 0.9, 1],
                  repeat: Infinity,
                  repeatDelay: 1
                }}
              >
                <motion.animateMotion
                  dur={`${6 + i}s`}
                  repeatCount="indefinite"
                  path={pathD}
                  begin={`${startDelay}s`}
                />
              </motion.circle>
            ))}
            
            {/* Reverse flowing particles for dynamic effect */}
            {[0.8, 3.2].map((startDelay, i) => (
              <motion.circle
                key={`reverse-${i}`}
                r={2.5}
                fill="#C4B5FD"
                filter="drop-shadow(0 0 6px rgba(196, 181, 253, 0.7))"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.8, 0.8, 0] }}
                transition={{ 
                  delay: startDelay, 
                  duration: 7,
                  times: [0, 0.1, 0.9, 1],
                  repeat: Infinity,
                  repeatDelay: 2
                }}
              >
                <motion.animateMotion
                  dur="8s"
                  repeatCount="indefinite"
                  path={pathD}
                  begin={`${startDelay}s`}
                  keyPoints="1;0"
                  keyTimes="0;1"
                  calcMode="linear"
                />
              </motion.circle>
            ))}
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

        {/* Enhanced Status Badges at Bottom */}
        <div className="flex justify-center gap-4 mt-16 relative" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', zIndex: 10 }}>
          {[
            { label: 'Stable', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', glow: 'rgba(134, 239, 172, 0.3)' },
            { label: 'At Risk', bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', glow: 'rgba(252, 211, 77, 0.3)' },
            { label: 'Critical', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', glow: 'rgba(252, 165, 165, 0.3)' }
          ].map((badge, i) => (
            <motion.div
              key={badge.label}
              className={`px-5 py-2 rounded-full ${badge.bg} border ${badge.border} ${badge.text} text-sm font-medium`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ 
                scale: 1.05,
                boxShadow: `0 4px 20px ${badge.glow}`,
              }}
              transition={{ delay: 2.8 + i * 0.1, duration: 0.5 }}
              style={{ cursor: 'pointer' }}
            >
              {badge.label}
            </motion.div>
          ))}
        </div>
    </div>
  );
};
