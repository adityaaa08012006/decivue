import React, { useState } from 'react';
import { X, CheckCircle, XCircle, GitMerge, Archive, Eye } from 'lucide-react';

const ConflictResolutionModal = ({ conflict, onResolve, onClose }) => {
  const [selectedAction, setSelectedAction] = useState(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!conflict) return null;

  const resolutionOptions = [
    {
      action: 'VALIDATE_A',
      icon: CheckCircle,
      title: 'Keep First Assumption',
      description: 'Mark the first assumption as validated and the second as broken',
      color: 'green',
      label: conflict.assumption_a?.description || 'Assumption A'
    },
    {
      action: 'VALIDATE_B',
      icon: CheckCircle,
      title: 'Keep Second Assumption',
      description: 'Mark the second assumption as validated and the first as broken',
      color: 'green',
      label: conflict.assumption_b?.description || 'Assumption B'
    },
    {
      action: 'MERGE',
      icon: GitMerge,
      title: 'Merge Both',
      description: 'Combine both assumptions into a single revised assumption (requires manual merge)',
      color: 'blue',
    },
    {
      action: 'DEPRECATE_BOTH',
      icon: XCircle,
      title: 'Deprecate Both',
      description: 'Mark both assumptions as broken (neither is valid)',
      color: 'red',
    },
    {
      action: 'KEEP_BOTH',
      icon: Eye,
      title: 'Keep Both (False Positive)',
      description: 'Both assumptions are valid, no real conflict exists',
      color: 'gray',
    },
  ];

  const handleSubmit = async () => {
    if (!selectedAction) return;

    setSubmitting(true);
    try {
      await onResolve(conflict.id, selectedAction, notes);
      onClose();
    } catch (error) {
      console.error('Resolution failed:', error);
      alert('Failed to resolve conflict: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedOption = resolutionOptions.find(opt => opt.action === selectedAction);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-orange-50 to-red-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Resolve Assumption Conflict</h2>
            <p className="text-sm text-gray-600 mt-1">
              Confidence: <span className="font-semibold text-orange-600">{Math.round((conflict.confidence_score || 0) * 100)}%</span>
              {' '} • Type: <span className="font-semibold">{conflict.conflict_type}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-lg transition-colors"
            disabled={submitting}
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Conflicting Assumptions */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Conflicting Assumptions
            </h3>
            <div className="space-y-3">
              <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-lg">
                <div className="text-xs font-semibold text-blue-600 mb-1">ASSUMPTION A</div>
                <p className="text-sm text-gray-800">{conflict.assumption_a?.description || 'No description'}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                  <span className={`px-2 py-0.5 rounded-full ${
                    conflict.assumption_a?.status === 'VALIDATED' ? 'bg-green-100 text-green-700' :
                    conflict.assumption_a?.status === 'BROKEN' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {conflict.assumption_a?.status || 'UNKNOWN'}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span>{conflict.assumption_a?.scope || 'UNIVERSAL'}</span>
                </div>
              </div>

              <div className="p-4 bg-purple-50 border-l-4 border-purple-400 rounded-lg">
                <div className="text-xs font-semibold text-purple-600 mb-1">ASSUMPTION B</div>
                <p className="text-sm text-gray-800">{conflict.assumption_b?.description || 'No description'}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                  <span className={`px-2 py-0.5 rounded-full ${
                    conflict.assumption_b?.status === 'VALIDATED' ? 'bg-green-100 text-green-700' :
                    conflict.assumption_b?.status === 'BROKEN' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {conflict.assumption_b?.status || 'UNKNOWN'}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span>{conflict.assumption_b?.scope || 'UNIVERSAL'}</span>
                </div>
              </div>
            </div>

            {conflict.conflict_reason && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-xs font-semibold text-gray-600 mb-1">CONFLICT REASON</div>
                <p className="text-sm text-gray-700">{conflict.conflict_reason}</p>
              </div>
            )}
          </div>

          {/* Resolution Options */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Choose Resolution Action
            </h3>
            <div className="space-y-2">
              {resolutionOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedAction === option.action;
                
                return (
                  <button
                    key={option.action}
                    onClick={() => setSelectedAction(option.action)}
                    disabled={submitting}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? `border-${option.color}-500 bg-${option.color}-50 shadow-md`
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        isSelected ? `bg-${option.color}-100` : 'bg-gray-100'
                      }`}>
                        <Icon size={20} className={isSelected ? `text-${option.color}-600` : 'text-gray-600'} />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 mb-1">{option.title}</div>
                        <div className="text-sm text-gray-600">{option.description}</div>
                        {option.label && (
                          <div className="mt-2 text-xs text-gray-500 italic truncate">
                            "{option.label.substring(0, 80)}..."
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <CheckCircle size={20} className={`text-${option.color}-600 flex-shrink-0`} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resolution Notes */}
          {selectedAction && (
            <div className="mt-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Resolution Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes or context about this resolution..."
                disabled={submitting}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50 disabled:bg-gray-50"
                rows={3}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedOption ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Ready to resolve with: <span className="font-semibold">{selectedOption.title}</span>
              </span>
            ) : (
              <span>Select a resolution action above</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedAction || submitting}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                selectedAction && !submitting
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {submitting ? 'Resolving...' : 'Confirm Resolution'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConflictResolutionModal;
