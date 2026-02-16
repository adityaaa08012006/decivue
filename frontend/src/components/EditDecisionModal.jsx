import React, { useState, useEffect } from 'react';
import { X, Edit, AlertCircle, Check, Send, Link, Unlink, Plus } from 'lucide-react';
import api from '../services/api';

const EditDecisionModal = ({ decision, isLead, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: decision.title || '',
    description: decision.description || '',
    category: decision.category || '',
    parameters: decision.parameters || {},
  });
  
  const [editReason, setEditReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Assumption management state
  const [currentAssumptions, setCurrentAssumptions] = useState([]);
  const [allAssumptions, setAllAssumptions] = useState([]);
  const [assumptionsToUnlink, setAssumptionsToUnlink] = useState(new Set());
  const [assumptionsToLink, setAssumptionsToLink] = useState(new Set());
  const [selectedAssumptionId, setSelectedAssumptionId] = useState('');
  const [loadingAssumptions, setLoadingAssumptions] = useState(true);

  // Fetch assumptions on mount
  useEffect(() => {
    const fetchAssumptions = async () => {
      try {
        setLoadingAssumptions(true);
        // Fetch current assumptions for this decision
        const current = await api.getAssumptions(decision.id, false);
        setCurrentAssumptions(current || []);
        
        // Fetch all assumptions to show available ones
        const all = await api.getAllAssumptions();
        setAllAssumptions(all || []);
      } catch (err) {
        console.error('Failed to fetch assumptions:', err);
        setError('Failed to load assumptions');
      } finally {
        setLoadingAssumptions(false);
      }
    };

    fetchAssumptions();
  }, [decision.id]);

  // Track which fields have changed
  const hasChanges = () => {
    return (
      formData.title !== decision.title ||
      formData.description !== decision.description ||
      formData.category !== decision.category ||
      assumptionsToUnlink.size > 0 ||
      assumptionsToLink.size > 0
    );
  };

  const getChangedFields = () => {
    const changes = {};
    const oldValues = {};
    
    if (formData.title !== decision.title) {
      changes.title = formData.title;
      oldValues.title = decision.title;
    }
    if (formData.description !== decision.description) {
      changes.description = formData.description;
      oldValues.description = decision.description;
    }
    if (formData.category !== decision.category) {
      changes.category = formData.category;
      oldValues.category = decision.category;
    }
    
    return { ...changes, old_values: oldValues };
  };

  // Assumption management helpers
  const handleUnlinkAssumption = (assumptionId) => {
    const newUnlinked = new Set(assumptionsToUnlink);
    if (newUnlinked.has(assumptionId)) {
      newUnlinked.delete(assumptionId); // Cancel unlink
    } else {
      newUnlinked.add(assumptionId); // Mark for unlink
    }
    setAssumptionsToUnlink(newUnlinked);
  };

  const handleLinkAssumption = () => {
    if (!selectedAssumptionId) return;
    
    const newLinked = new Set(assumptionsToLink);
    newLinked.add(selectedAssumptionId);
    setAssumptionsToLink(newLinked);
    setSelectedAssumptionId(''); // Reset selection
  };

  const handleCancelLink = (assumptionId) => {
    const newLinked = new Set(assumptionsToLink);
    newLinked.delete(assumptionId);
    setAssumptionsToLink(newLinked);
  };

  // Get available assumptions to link (not already linked or pending link)
  const getAvailableAssumptions = () => {
    const currentIds = currentAssumptions.map(a => a.id);
    const linkedIds = Array.from(assumptionsToLink);
    return allAssumptions.filter(a => 
      !currentIds.includes(a.id) && 
      !linkedIds.includes(a.id)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!hasChanges()) {
      setError('No changes detected');
      return;
    }

    if (!editReason.trim() || editReason.trim().length < 10) {
      setError('Please provide a reason for this edit (minimum 10 characters)');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (isLead) {
        // Team lead can apply changes directly
        // 1. Update decision fields
        await api.updateDecision(decision.id, {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          parameters: formData.parameters, // Preserve parameters
        });

        // 2. Process assumption changes
        // Unlink assumptions marked for removal
        for (const assumptionId of assumptionsToUnlink) {
          await api.unlinkAssumptionFromDecision(
            assumptionId, 
            decision.id, 
            `Edit: ${editReason}`
          );
        }

        // Link new assumptions
        for (const assumptionId of assumptionsToLink) {
          await api.linkAssumptionToDecision(assumptionId, decision.id);
        }
        
        onSuccess(`Decision updated successfully with ${assumptionsToUnlink.size} assumption(s) unlinked and ${assumptionsToLink.size} assumption(s) linked`);
      } else {
        // Team member must request approval
        const proposedChanges = getChangedFields();

        // Include assumption changes in proposal
        if (assumptionsToUnlink.size > 0) {
          proposedChanges.assumptionsToUnlink = Array.from(assumptionsToUnlink);
        }
        if (assumptionsToLink.size > 0) {
          proposedChanges.assumptionsToLink = Array.from(assumptionsToLink);
        }

        await api.requestEditApproval(
          decision.id,
          editReason,
          proposedChanges
        );
        
        onSuccess(`Edit request submitted for approval by team lead`);
      }
      
      onClose();
    } catch (err) {
      console.error('Failed to submit edit:', err);
      setError(err.message || 'Failed to submit edit request');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    'Technical',
    'Business',
    'Operational',
    'Strategic',
    'Resource & Staffing',
    'Timeline & Scheduling',
    'Budget & Cost',
    'Risk Management',
    'Quality & Standards',
    'Other'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Edit className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">
              {isLead ? 'Edit Decision' : 'Request Decision Edit'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Info Banner */}
        <div className={`mx-6 mt-4 p-3 rounded-lg flex items-start gap-2 ${
          isLead ? 'bg-blue-50 border border-blue-200' : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <AlertCircle size={18} className={isLead ? 'text-blue-600 flex-shrink-0 mt-0.5' : 'text-yellow-600 flex-shrink-0 mt-0.5'} />
          <div className="text-sm">
            {isLead ? (
              <p className="text-blue-900">
                <strong>Team Lead:</strong> Your changes will be applied immediately without requiring approval.
              </p>
            ) : (
              <p className="text-yellow-900">
                <strong>Team Member:</strong> Your edit request will be sent to a team lead for review and approval before being applied.
              </p>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select category...</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Parameters Display (read-only for now) */}
          {formData.parameters && Object.keys(formData.parameters).length > 0 && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm font-semibold text-gray-700 mb-3">Structured Parameters:</p>
              <div className="space-y-2">
                {Object.entries(formData.parameters).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-gray-600">{key.replace(/_/g, ' ')}:</span>
                    <span className="text-gray-900 font-medium">
                      {typeof value === 'object' ? JSON.stringify(value) : value}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3 italic">
                Note: Parameters are preserved during edit. To change parameters, please create a new decision version.
              </p>
            </div>
          )}

          {/* Assumption Management */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Link className="w-5 h-5 text-blue-600" />
              <p className="text-sm font-semibold text-gray-900">Linked Assumptions</p>
            </div>

            {loadingAssumptions ? (
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Loading assumptions...
              </div>
            ) : (
              <>
                {/* Current Assumptions List */}
                {currentAssumptions.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {currentAssumptions.map((assumption) => {
                      const isMarkedForUnlink = assumptionsToUnlink.has(assumption.id);
                      return (
                        <div
                          key={assumption.id}
                          className={`p-3 rounded-lg border transition-all ${
                            isMarkedForUnlink
                              ? 'bg-red-50 border-red-300 opacity-60'
                              : 'bg-white border-blue-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${
                                isMarkedForUnlink ? 'text-red-900 line-through' : 'text-gray-900'
                              }`}>
                                {assumption.description}
                              </p>
                              {assumption.category && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Category: {assumption.category}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleUnlinkAssumption(assumption.id)}
                              className={`flex-shrink-0 p-1.5 rounded transition-colors ${
                                isMarkedForUnlink
                                  ? 'text-blue-600 hover:bg-blue-100'
                                  : 'text-red-600 hover:bg-red-100'
                              }`}
                              title={isMarkedForUnlink ? 'Cancel unlink' : 'Unlink assumption'}
                            >
                              {isMarkedForUnlink ? (
                                <X size={16} />
                              ) : (
                                <Unlink size={16} />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 mb-4">No assumptions currently linked.</p>
                )}

                {/* Pending New Links */}
                {assumptionsToLink.size > 0 && (
                  <div className="mb-4 space-y-2">
                    <p className="text-xs font-semibold text-green-700 mb-2">
                      ✓ To be linked ({assumptionsToLink.size}):
                    </p>
                    {Array.from(assumptionsToLink).map((assumptionId) => {
                      const assumption = allAssumptions.find(a => a.id === assumptionId);
                      if (!assumption) return null;
                      return (
                        <div
                          key={assumptionId}
                          className="p-3 bg-green-50 border border-green-300 rounded-lg"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-green-900">
                                {assumption.description}
                              </p>
                              {assumption.category && (
                                <p className="text-xs text-green-700 mt-1">
                                  Category: {assumption.category}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCancelLink(assumptionId)}
                              className="flex-shrink-0 p-1.5 text-green-700 hover:bg-green-100 rounded transition-colors"
                              title="Cancel link"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add New Assumption Link */}
                {getAvailableAssumptions().length > 0 && (
                  <div className="pt-3 border-t border-blue-200">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Link Additional Assumption:</p>
                    <div className="flex gap-2">
                      <select
                        value={selectedAssumptionId}
                        onChange={(e) => setSelectedAssumptionId(e.target.value)}
                        className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select an assumption...</option>
                        {getAvailableAssumptions().map((assumption) => (
                          <option key={assumption.id} value={assumption.id}>
                            {assumption.description.substring(0, 80)}
                            {assumption.description.length > 80 ? '...' : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleLinkAssumption}
                        disabled={!selectedAssumptionId}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                      >
                        <Plus size={16} />
                        <span className="text-sm">Link</span>
                      </button>
                    </div>
                  </div>
                )}

                {getAvailableAssumptions().length === 0 && assumptionsToLink.size === 0 && currentAssumptions.length > 0 && (
                  <p className="text-xs text-gray-500 italic pt-3 border-t border-blue-200">
                    All available assumptions are already linked.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Edit Reason */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Reason for Edit * <span className="text-gray-500 font-normal">(minimum 10 characters)</span>
            </label>
            <textarea
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              rows={3}
              placeholder="Explain why this edit is necessary..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-900">{error}</p>
            </div>
          )}

          {/* Changed Fields Summary */}
          {hasChanges() && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm font-semibold text-gray-700 mb-2">Changes detected:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                {formData.title !== decision.title && (
                  <li>• Title updated</li>
                )}
                {formData.description !== decision.description && (
                  <li>• Description updated</li>
                )}
                {formData.category !== decision.category && (
                  <li>• Category changed from "{decision.category}" to "{formData.category}"</li>
                )}
                {assumptionsToUnlink.size > 0 && (
                  <li>• {assumptionsToUnlink.size} assumption(s) will be unlinked</li>
                )}
                {assumptionsToLink.size > 0 && (
                  <li>• {assumptionsToLink.size} new assumption(s) will be linked</li>
                )}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !hasChanges()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  {isLead ? (
                    <>
                      <Check size={18} />
                      Apply Changes
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Submit for Approval
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditDecisionModal;
