import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { 
  Shield, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  TrendingDown,
  CheckCircle,
  Archive
} from "lucide-react";

/**
 * Enhanced Decision Card for Swimlane DAG Layout
 * 
 * Features:
 * - Professional card design with visual hierarchy
 * - Status badge with icon
 * - Type label (category/swimlane)
 * - Health indicator
 * - Glowing border for at-risk decisions
 * - Minimalist, flat design
 */
const SwimLaneDecisionCard = memo(({ data, selected }) => {
  const getStatusConfig = (lifecycle) => {
    switch (lifecycle) {
      case "STABLE":
        return {
          bgColor: "bg-white",
          borderColor: "border-green-500",
          statusBg: "bg-green-500",
          statusText: "text-white",
          icon: Shield,
          label: "Stable",
          glow: false,
        };
      case "UNDER_REVIEW":
        return {
          bgColor: "bg-white",
          borderColor: "border-yellow-500",
          statusBg: "bg-yellow-500",
          statusText: "text-white",
          icon: Clock,
          label: "Under Review",
          glow: false,
        };
      case "AT_RISK":
        return {
          bgColor: "bg-white",
          borderColor: "border-red-500",
          statusBg: "bg-red-500",
          statusText: "text-white",
          icon: AlertTriangle,
          label: "At Risk",
          glow: true, // Red glow for at-risk
        };
      case "INVALIDATED":
        return {
          bgColor: "bg-red-50",
          borderColor: "border-red-600",
          statusBg: "bg-red-600",
          statusText: "text-white",
          icon: XCircle,
          label: "Invalidated",
          glow: true,
        };
      case "RETIRED":
        return {
          bgColor: "bg-gray-50",
          borderColor: "border-gray-400",
          statusBg: "bg-gray-400",
          statusText: "text-white",
          icon: Archive,
          label: "Retired",
          glow: false,
        };
      default:
        return {
          bgColor: "bg-white",
          borderColor: "border-blue-500",
          statusBg: "bg-blue-500",
          statusText: "text-white",
          icon: Shield,
          label: lifecycle || "Unknown",
          glow: false,
        };
    }
  };

  const config = getStatusConfig(data.lifecycle);
  const StatusIcon = config.icon;

  // Get type label from metadata or swimlane
  const typeLabel = data.category || data.metadata?.category || data.swimlane || "Decision";

  // Get health indicator color
  const getHealthColor = (health) => {
    if (health >= 80) return "bg-green-500";
    if (health >= 60) return "bg-yellow-500";
    if (health >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const healthColor = getHealthColor(data.health_signal || 100);

  // Apply glow effect for at-risk decisions
  const glowClass = config.glow 
    ? "shadow-lg shadow-red-500/50 ring-2 ring-red-500 ring-opacity-50 animate-pulse" 
    : "";

  return (
    <div
      className={`
        ${config.bgColor} 
        ${config.borderColor}
        relative
        rounded-lg 
        border-2 
        shadow-md
        transition-all
        duration-300
        cursor-pointer
        hover:shadow-xl
        hover:scale-105
        ${glowClass}
        ${selected ? "ring-4 ring-blue-400 scale-105" : ""}
      `}
      style={{
        width: 280,
        minHeight: 120,
      }}
    >
      {/* Input Handle (Left) */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-blue-500 border-2 border-white"
        style={{ left: -6 }}
      />

      {/* Card Header */}
      <div className="p-3 border-b border-gray-200">
        {/* Type Label */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {typeLabel}
          </span>
          {/* Health Indicator */}
          {data.health_signal !== undefined && (
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${healthColor}`} />
              <span className="text-xs text-gray-500">{data.health_signal}%</span>
            </div>
          )}
        </div>

        {/* Decision Title */}
        <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
          {data.title || "Untitled Decision"}
        </h3>
      </div>

      {/* Card Body */}
      <div className="p-3">
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`
              ${config.statusBg} 
              ${config.statusText}
              px-2.5 
              py-1 
              rounded-full 
              flex 
              items-center 
              gap-1.5 
              text-xs 
              font-semibold
              shadow-sm
            `}
          >
            <StatusIcon size={14} strokeWidth={2.5} />
            <span>{config.label}</span>
          </div>
        </div>

        {/* Optional: Description Preview */}
        {data.description && (
          <p className="text-xs text-gray-600 mt-2 line-clamp-2">
            {data.description}
          </p>
        )}
      </div>

      {/* Output Handle (Right) */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-blue-500 border-2 border-white"
        style={{ right: -6 }}
      />

      {/* Disabled Handles for Top/Bottom (prevents messy connections) */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
    </div>
  );
});

SwimLaneDecisionCard.displayName = "SwimLaneDecisionCard";

export default SwimLaneDecisionCard;
