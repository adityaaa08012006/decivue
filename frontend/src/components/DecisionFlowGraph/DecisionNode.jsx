import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Shield, AlertTriangle, XCircle } from "lucide-react";

/**
 * Custom Decision Node for React Flow
 * - Rectangular shape
 * - Shows title and status badge
 * - Color-coded border based on lifecycle status
 */
const DecisionNode = memo(({ data, selected }) => {
  const getStatusConfig = (lifecycle) => {
    switch (lifecycle) {
      case "STABLE":
        return {
          color: "border-green-500 bg-green-50",
          badge: "bg-green-500 text-white",
          icon: Shield,
          label: "STABLE",
        };
      case "UNDER_REVIEW":
        return {
          color: "border-yellow-500 bg-yellow-50",
          badge: "bg-yellow-500 text-white",
          icon: AlertTriangle,
          label: "UNDER REVIEW",
        };
      case "AT_RISK":
        return {
          color: "border-orange-500 bg-orange-50",
          badge: "bg-orange-500 text-white",
          icon: AlertTriangle,
          label: "AT RISK",
        };
      case "INVALIDATED":
        return {
          color: "border-red-500 bg-red-50",
          badge: "bg-red-500 text-white",
          icon: XCircle,
          label: "INVALIDATED",
        };
      case "RETIRED":
        return {
          color: "border-gray-500 bg-gray-50",
          badge: "bg-gray-500 text-white",
          icon: XCircle,
          label: "RETIRED",
        };
      default:
        return {
          color: "border-blue-500 bg-blue-50",
          badge: "bg-blue-500 text-white",
          icon: Shield,
          label: lifecycle || "UNKNOWN",
        };
    }
  };

  const config = getStatusConfig(data.lifecycle);
  const StatusIcon = config.icon;

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 ${config.color} shadow-md min-w-[200px] max-w-[300px] cursor-pointer transition-all ${
        selected ? "ring-4 ring-blue-400 shadow-lg" : ""
      }`}
    >
      {/* Input handle (top) - for incoming connections */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-blue-500"
      />

      {/* Status Badge */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`${config.badge} px-2 py-1 rounded-full flex items-center gap-1 text-xs font-bold`}
        >
          <StatusIcon size={12} />
          <span>{config.label}</span>
        </div>
      </div>

      {/* Decision Title */}
      <div className="font-semibold text-gray-800 text-sm mb-1">
        {data.title}
      </div>

      {/* Optional: Description preview */}
      {data.description && (
        <div className="text-xs text-gray-600 line-clamp-2">
          {data.description}
        </div>
      )}

      {/* Output handle (bottom) - for outgoing connections */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-blue-500"
      />
    </div>
  );
});

DecisionNode.displayName = "DecisionNode";

export default DecisionNode;
