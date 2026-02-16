import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Layers } from "lucide-react";

/**
 * Custom Organizational Assumption Node for React Flow
 * - Circular shape
 * - Shows label only (no status badge)
 * - Used to represent organizational assumptions in the graph
 *
 * NOTE: Decision-specific assumptions are NOT shown in the graph.
 * They are only displayed in the decision detail panel when clicking a decision.
 */
const OrgAssumptionNode = memo(({ data, selected }) => {
  const isHighlighted = data.isHighlighted;

  return (
    <div className="relative">
      {/* Output handle (right) - connects to decisions */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-2 h-2 !bg-purple-500"
      />

      {/* Circular node */}
      <div
        className={`w-32 h-32 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ${
          isHighlighted
            ? "border-purple-600 bg-purple-100 shadow-lg ring-4 ring-purple-300"
            : selected
              ? "border-purple-500 bg-purple-50 shadow-md ring-2 ring-purple-200"
              : "border-purple-400 bg-purple-50 shadow-sm hover:shadow-md"
        }`}
      >
        <div className="text-center px-3">
          <Layers
            size={20}
            className={`mx-auto mb-1 ${
              isHighlighted ? "text-purple-700" : "text-purple-600"
            }`}
          />
          <div
            className={`text-xs font-medium ${
              isHighlighted ? "text-purple-900" : "text-purple-800"
            } line-clamp-3`}
          >
            {data.label}
          </div>
        </div>
      </div>
    </div>
  );
});

OrgAssumptionNode.displayName = "OrgAssumptionNode";

export default OrgAssumptionNode;
