import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Shield,
  RefreshCw,
  CheckCircle,
  XCircle,
  Search,
  X,
  Sparkles,
} from "lucide-react";
import api from "../services/api";
import DecisionConflictModal from "./DecisionConflictModal";

const DecisionConflictsPage = () => {
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detectingConflicts, setDetectingConflicts] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchConflicts();
  }, []);

  const fetchConflicts = async () => {
    try {
      setLoading(true);
      const data = await api.getDecisionConflicts(false); // Only unresolved
      setConflicts(data || []);
    } catch (error) {
      console.error("Failed to fetch decision conflicts:", error);
      showToast("error", "Failed to load conflicts");
    } finally {
      setLoading(false);
    }
  };

  const handleDetectConflicts = async () => {
    console.log("🔍 Detect Conflicts button clicked!");
    try {
      setDetectingConflicts(true);
      console.log("📡 Calling api.detectDecisionConflicts()...");
      const result = await api.detectDecisionConflicts();
      console.log("✅ Detection result:", result);
      showToast(
        "success",
        `Conflict detection complete! Found ${result.conflictsDetected} new conflict(s)`,
      );
      await fetchConflicts();
    } catch (error) {
      console.error("❌ Failed to detect conflicts:", error);
      showToast("error", "Failed to detect conflicts");
    } finally {
      setDetectingConflicts(false);
    }
  };

  const handleOpenResolutionModal = (conflict) => {
    setSelectedConflict(conflict);
    setShowResolutionModal(true);
  };

  const handleCloseResolutionModal = () => {
    setShowResolutionModal(false);
    setSelectedConflict(null);
  };

  const handleConflictResolved = async () => {
    showToast("success", "Conflict resolved successfully!");
    await fetchConflicts();
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const getConflictTypeLabel = (type) => {
    const labels = {
      CONTRADICTORY: "Contradictory",
      RESOURCE_COMPETITION: "Resource Competition",
      OBJECTIVE_UNDERMINING: "Objective Undermining",
      PREMISE_INVALIDATION: "Premise Invalidation",
      MUTUALLY_EXCLUSIVE: "Mutually Exclusive",
    };
    return labels[type] || type;
  };

  const getConflictTypeBadge = (type) => {
    const colors = {
      CONTRADICTORY: "bg-red-100 text-red-800 border-red-200",
      RESOURCE_COMPETITION: "bg-orange-100 text-orange-800 border-orange-200",
      OBJECTIVE_UNDERMINING: "bg-yellow-100 text-yellow-800 border-yellow-200",
      PREMISE_INVALIDATION: "bg-purple-100 text-purple-800 border-purple-200",
      MUTUALLY_EXCLUSIVE: "bg-pink-100 text-pink-800 border-pink-200",
    };
    return colors[type] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getConfidenceColor = (score) => {
    if (score >= 0.9) return "text-red-600";
    if (score >= 0.7) return "text-orange-600";
    return "text-yellow-600";
  };

  const filteredConflicts = conflicts.filter((conflict) => {
    if (filterType !== "all" && conflict.conflict_type !== filterType) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        conflict.decision_a.title.toLowerCase().includes(query) ||
        conflict.decision_b.title.toLowerCase().includes(query) ||
        conflict.explanation.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="flex h-screen bg-neutral-white overflow-hidden">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 transition-all duration-300 ease-out">
          <div
            className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg max-w-md ${
              toast.type === "success"
                ? "bg-teal-500 text-white"
                : "bg-red-500 text-white"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle size={20} className="flex-shrink-0" />
            ) : (
              <XCircle size={20} className="flex-shrink-0" />
            )}
            <span className="flex-1 font-medium">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="flex-shrink-0 hover:opacity-80 transition-opacity"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-black mb-2">
                    Decision Conflicts
                  </h1>
                  <p className="text-gray-600">
                    Monitor and resolve contradictions between decisions
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDetectConflicts}
                    disabled={detectingConflicts}
                    className="px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    <Shield size={18} />
                    {detectingConflicts ? "Detecting..." : "Detect Conflicts"}
                  </button>
                  <button
                    onClick={fetchConflicts}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <RefreshCw
                      size={18}
                      className={loading ? "animate-spin" : ""}
                    />
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="mb-6 space-y-4">
              {/* Type Filter */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFilterType("all")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filterType === "all"
                      ? "bg-blue-500 text-white shadow-md"
                      : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                  }`}
                >
                  All Types
                </button>
                <button
                  onClick={() => setFilterType("CONTRADICTORY")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filterType === "CONTRADICTORY"
                      ? "bg-red-500 text-white shadow-md"
                      : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                  }`}
                >
                  Contradictory
                </button>
                <button
                  onClick={() => setFilterType("RESOURCE_COMPETITION")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filterType === "RESOURCE_COMPETITION"
                      ? "bg-orange-500 text-white shadow-md"
                      : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                  }`}
                >
                  Resource Competition
                </button>
                <button
                  onClick={() => setFilterType("OBJECTIVE_UNDERMINING")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filterType === "OBJECTIVE_UNDERMINING"
                      ? "bg-yellow-500 text-white shadow-md"
                      : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                  }`}
                >
                  Objective Undermining
                </button>
                <button
                  onClick={() => setFilterType("PREMISE_INVALIDATION")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filterType === "PREMISE_INVALIDATION"
                      ? "bg-purple-500 text-white shadow-md"
                      : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                  }`}
                >
                  Premise Invalidation
                </button>
              </div>

              {/* Search */}
              <div className="relative max-w-md">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search decisions or explanations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Statistics */}
            {conflicts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <div className="text-2xl font-bold text-neutral-black">
                    {conflicts.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Conflicts</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200 shadow-sm">
                  <div className="text-2xl font-bold text-red-600">
                    {
                      conflicts.filter(
                        (c) => c.conflict_type === "CONTRADICTORY",
                      ).length
                    }
                  </div>
                  <div className="text-sm text-red-700">Contradictory</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 shadow-sm">
                  <div className="text-2xl font-bold text-orange-600">
                    {
                      conflicts.filter(
                        (c) => c.conflict_type === "RESOURCE_COMPETITION",
                      ).length
                    }
                  </div>
                  <div className="text-sm text-orange-700">
                    Resource Competition
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 shadow-sm">
                  <div className="text-2xl font-bold text-yellow-600">
                    {conflicts.filter((c) => c.confidence_score >= 0.8).length}
                  </div>
                  <div className="text-sm text-yellow-700">
                    High Confidence (&gt;80%)
                  </div>
                </div>
              </div>
            )}

            {/* Conflicts List */}
            {loading ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-500 mb-4"></div>
                <p className="text-gray-700">Loading conflicts...</p>
              </div>
            ) : filteredConflicts.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
                <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  {conflicts.length === 0
                    ? "No conflicts detected"
                    : "No matching conflicts"}
                </h3>
                <p className="text-gray-500 mb-6">
                  {conflicts.length === 0
                    ? "Run conflict detection to check for contradictions between decisions"
                    : "Try adjusting your filters or search query"}
                </p>
                {conflicts.length === 0 && (
                  <button
                    onClick={handleDetectConflicts}
                    disabled={detectingConflicts}
                    className="px-6 py-3 bg-primary-blue text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm font-medium disabled:opacity-50"
                  >
                    <Shield className="inline mr-2" size={18} />
                    Detect Conflicts
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredConflicts.map((conflict) => (
                  <div
                    key={conflict.id}
                    className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all overflow-hidden"
                  >
                    {/* Conflict Header */}
                    <div className="bg-orange-50 border-b border-orange-100 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AlertTriangle
                            className="text-orange-600"
                            size={20}
                          />
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold border ${getConflictTypeBadge(conflict.conflict_type)}`}
                          >
                            {getConflictTypeLabel(conflict.conflict_type)}
                          </span>
                          <span
                            className={`text-sm font-bold ${getConfidenceColor(conflict.confidence_score)}`}
                          >
                            {Math.round(conflict.confidence_score * 100)}%
                            confidence
                          </span>
                        </div>
                        <button
                          onClick={() => handleOpenResolutionModal(conflict)}
                          className="px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                        >
                          Resolve
                        </button>
                      </div>
                    </div>

                    {/* Conflict Body */}
                    <div className="p-6">
                      {/* Explanation */}
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-700">
                            Conflict Explanation:
                          </p>
                          {conflict.metadata?.aiGenerated && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-semibold rounded-full">
                              <Sparkles size={12} />
                              AI Enhanced
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-800">
                          {conflict.explanation}
                        </p>
                      </div>

                      {/* Decisions */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Decision A */}
                        <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              A
                            </div>
                            <span className="text-xs font-semibold text-blue-900">
                              Decision A
                            </span>
                          </div>
                          <h4 className="font-bold text-neutral-black mb-1">
                            {conflict.decision_a.title}
                          </h4>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {conflict.decision_a.description}
                          </p>
                          <div className="mt-2 flex gap-2">
                            <span className="text-xs px-2 py-0.5 bg-blue-200 text-blue-800 rounded-full">
                              {conflict.decision_a.state}
                            </span>
                          </div>
                        </div>

                        {/* Decision B */}
                        <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              B
                            </div>
                            <span className="text-xs font-semibold text-purple-900">
                              Decision B
                            </span>
                          </div>
                          <h4 className="font-bold text-neutral-black mb-1">
                            {conflict.decision_b.title}
                          </h4>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {conflict.decision_b.description}
                          </p>
                          <div className="mt-2 flex gap-2">
                            <span className="text-xs px-2 py-0.5 bg-purple-200 text-purple-800 rounded-full">
                              {conflict.decision_b.state}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                        <span>
                          Detected:{" "}
                          {new Date(conflict.detected_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resolution Modal */}
      {showResolutionModal && selectedConflict && (
        <DecisionConflictModal
          conflict={selectedConflict}
          onClose={handleCloseResolutionModal}
          onResolved={handleConflictResolved}
        />
      )}
    </div>
  );
};

export default DecisionConflictsPage;
