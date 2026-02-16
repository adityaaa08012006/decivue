import {
  X,
  Shield,
  Layers,
  CheckCircle,
  AlertCircle,
  XCircle,
} from "lucide-react";

/**
 * Decision Detail Panel
 * - Opens on the right side when a decision node is clicked
 * - Shows decision information
 * - Displays BOTH organizational and decision-specific assumptions
 * - Clearly separates both types with headings
 *
 * Data fetching:
 * - Organizational assumptions: Fetched via GET /assumptions?decisionId=X, filtered by scope=UNIVERSAL
 * - Decision-specific assumptions: Fetched via GET /assumptions?decisionId=X, filtered by scope=DECISION_SPECIFIC
 */
const DecisionDetailPanel = ({
  decision,
  orgAssumptions,
  decisionAssumptions,
  onClose,
}) => {
  if (!decision) return null;

  const getLifecycleColor = (lifecycle) => {
    switch (lifecycle) {
      case "STABLE":
        return "bg-green-500 text-white";
      case "UNDER_REVIEW":
        return "bg-yellow-500 text-white";
      case "AT_RISK":
        return "bg-orange-500 text-white";
      case "INVALIDATED":
        return "bg-red-500 text-white";
      case "RETIRED":
        return "bg-gray-500 text-white";
      default:
        return "bg-blue-500 text-white";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "VALID":
        return <CheckCircle size={16} className="text-green-600" />;
      case "SHAKY":
        return <AlertCircle size={16} className="text-yellow-600" />;
      case "BROKEN":
        return <XCircle size={16} className="text-red-600" />;
      default:
        return <Shield size={16} className="text-gray-600" />;
    }
  };

  const AssumptionCard = ({ assumption }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-3 mb-2 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-2">
        <div className="mt-1">{getStatusIcon(assumption.status)}</div>
        <div className="flex-1">
          <p className="text-sm text-gray-800">{assumption.description}</p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                assumption.status === "VALID"
                  ? "bg-green-100 text-green-700"
                  : assumption.status === "SHAKY"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
              }`}
            >
              {assumption.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-gray-50 shadow-2xl overflow-y-auto z-50 border-l border-gray-200">
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-md z-10">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-bold mb-1">{decision.title}</h2>
            {decision.description && (
              <p className="text-sm text-blue-100">{decision.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-2 p-1 hover:bg-blue-500 rounded transition-colors"
            aria-label="Close panel"
          >
            <X size={20} />
          </button>
        </div>

        {/* Status Badge */}
        <div className="mt-3">
          <span
            className={`${getLifecycleColor(decision.lifecycle)} px-3 py-1 rounded-full text-xs font-semibold`}
          >
            {decision.lifecycle}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* ORGANIZATIONAL ASSUMPTIONS SECTION */}
        <section>
          <div className="bg-purple-600 text-white rounded-lg p-3 mb-3 shadow-md">
            <div className="flex items-center gap-2">
              <Shield size={18} />
              <h3 className="font-bold text-sm">ORGANIZATIONAL ASSUMPTIONS</h3>
            </div>
            <p className="text-xs text-purple-100 mt-1">
              Shared across organization ({orgAssumptions.length})
            </p>
          </div>

          {orgAssumptions.length > 0 ? (
            <div>
              {orgAssumptions.map((assumption) => (
                <AssumptionCard key={assumption.id} assumption={assumption} />
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 text-sm bg-white rounded-lg border border-gray-200">
              <Shield size={24} className="mx-auto mb-2 text-gray-400" />
              <p>No organizational assumptions linked to this decision</p>
            </div>
          )}
        </section>

        {/* DECISION-SPECIFIC ASSUMPTIONS SECTION */}
        <section>
          <div className="bg-green-600 text-white rounded-lg p-3 mb-3 shadow-md">
            <div className="flex items-center gap-2">
              <Layers size={18} />
              <h3 className="font-bold text-sm">
                DECISION-SPECIFIC ASSUMPTIONS
              </h3>
            </div>
            <p className="text-xs text-green-100 mt-1">
              Unique to this decision ({decisionAssumptions.length})
            </p>
          </div>

          {decisionAssumptions.length > 0 ? (
            <div>
              {decisionAssumptions.map((assumption) => (
                <AssumptionCard key={assumption.id} assumption={assumption} />
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 text-sm bg-white rounded-lg border border-gray-200">
              <Layers size={24} className="mx-auto mb-2 text-gray-400" />
              <p>No decision-specific assumptions for this decision</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default DecisionDetailPanel;
