import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowRight,
  ArrowLeft,
  Plus,
  Link2,
  Target,
  Shield,
  CheckCircle,
} from 'lucide-react';
import api from '../services/api';

const AddDecisionModal = ({ isOpen, onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    selectedAssumptions: [], // Existing assumption IDs
    newAssumptions: [], // New assumptions to create
    dependsOn: [], // Decision IDs this decision depends on
    blocks: [], // Decision IDs this decision blocks
    selectedConstraints: [], // Constraint IDs to link
  });

  // Data for dropdowns
  const [existingAssumptions, setExistingAssumptions] = useState([]);
  const [existingDecisions, setExistingDecisions] = useState([]);
  const [existingConstraints, setExistingConstraints] = useState([]);
  const [newAssumptionText, setNewAssumptionText] = useState('');

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadData();
      resetForm();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [assumptions, decisions, constraints] = await Promise.all([
        api.getAssumptions().catch(() => []),
        api.getDecisions().catch(() => []),
        api.getAllConstraints().catch(() => []),
      ]);
      setExistingAssumptions(assumptions);
      setExistingDecisions(decisions);
      setExistingConstraints(constraints);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setFormData({
      title: '',
      description: '',
      selectedAssumptions: [],
      newAssumptions: [],
      dependsOn: [],
      blocks: [],
      selectedConstraints: [],
    });
    setNewAssumptionText('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleNext = () => {
    if (currentStep === 1 && !formData.title.trim()) {
      setError('Title is required');
      return;
    }
    setError(null);
    setCurrentStep(2);
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep(1);
  };

  const toggleSelection = (key, id) => {
    setFormData((prev) => ({
      ...prev,
      [key]: prev[key].includes(id)
        ? prev[key].filter((item) => item !== id)
        : [...prev[key], id],
    }));
  };

  const addNewAssumption = () => {
    if (newAssumptionText.trim()) {
      setFormData((prev) => ({
        ...prev,
        newAssumptions: [...prev.newAssumptions, newAssumptionText.trim()],
      }));
      setNewAssumptionText('');
    }
  };

  const removeNewAssumption = (index) => {
    setFormData((prev) => ({
      ...prev,
      newAssumptions: prev.newAssumptions.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Step 1: Create the decision
      const decision = await api.createDecision({
        title: formData.title.trim(),
        description: formData.description.trim(),
      });

      const decisionId = decision.id;

      // Step 2: Link existing assumptions
      if (formData.selectedAssumptions.length > 0) {
        await Promise.all(
          formData.selectedAssumptions.map((assumptionId) =>
            api.linkAssumptionToDecision(assumptionId, decisionId)
          )
        );
      }

      // Step 3: Create and link new assumptions
      if (formData.newAssumptions.length > 0) {
        await Promise.all(
          formData.newAssumptions.map((description) =>
            api.createAssumption({
              description,
              scope: 'DECISION_SPECIFIC',
              linkToDecisionId: decisionId,
            })
          )
        );
      }

      // Step 4: Create dependencies (depends on)
      if (formData.dependsOn.length > 0) {
        await Promise.all(
          formData.dependsOn.map((targetDecisionId) =>
            api.createDependency({
              sourceDecisionId: decisionId,
              targetDecisionId,
            })
          )
        );
      }

      // Step 5: Create dependencies (blocks)
      if (formData.blocks.length > 0) {
        await Promise.all(
          formData.blocks.map((sourceDecisionId) =>
            api.createDependency({
              sourceDecisionId,
              targetDecisionId: decisionId,
            })
          )
        );
      }

      // Step 6: Link constraints
      if (formData.selectedConstraints.length > 0) {
        await Promise.all(
          formData.selectedConstraints.map((constraintId) =>
            api.linkConstraintToDecision(constraintId, decisionId)
          )
        );
      }

      // Success!
      if (onSuccess) {
        onSuccess();
      }
      handleClose();
    } catch (err) {
      console.error('Failed to create decision:', err);
      setError(err.message || 'Failed to create decision. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-3xl w-full mx-4 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-neutral-black mb-2">
              {currentStep === 1 ? 'Add New Decision' : 'Link Relationships'}
            </h2>
            <p className="text-neutral-gray-600">
              {currentStep === 1
                ? 'Provide basic information about your decision'
                : 'Link assumptions, dependencies, and constraints (optional)'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-neutral-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-neutral-gray-500" />
          </button>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-8">
          <div
            className={`flex-1 h-1.5 rounded-full ${
              currentStep >= 1 ? 'bg-primary-blue' : 'bg-neutral-gray-200'
            }`}
          />
          <div
            className={`flex-1 h-1.5 rounded-full ${
              currentStep >= 2 ? 'bg-primary-blue' : 'bg-neutral-gray-200'
            }`}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-neutral-gray-700 mb-2">
                Decision Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full p-4 border border-neutral-gray-300 rounded-xl focus:border-primary-blue focus:ring-1 focus:ring-primary-blue transition-all"
                placeholder="e.g., Migrate to Microservices Architecture"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-gray-700 mb-2">
                Description
              </label>
              <textarea
                className="w-full p-4 border border-neutral-gray-300 rounded-xl focus:border-primary-blue focus:ring-1 focus:ring-primary-blue transition-all resize-none"
                rows="5"
                placeholder="Provide context, rationale, and expected outcomes for this decision..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={handleClose}
                className="px-6 py-2.5 text-neutral-gray-600 font-medium hover:bg-neutral-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleNext}
                disabled={!formData.title.trim()}
                className="px-6 py-2.5 bg-primary-blue text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Next: Link Relationships
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Link Relationships */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {/* Assumptions Section */}
            <div className="p-6 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-2 mb-4">
                <Target className="text-primary-blue" size={20} />
                <h3 className="font-bold text-neutral-black">Assumptions</h3>
              </div>

              {/* Existing assumptions */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-neutral-gray-700 mb-2">
                  Link Existing Assumptions
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {existingAssumptions.map((assumption) => (
                    <label
                      key={assumption.id}
                      className="flex items-start gap-2 p-3 bg-white rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={formData.selectedAssumptions.includes(
                          assumption.id
                        )}
                        onChange={() =>
                          toggleSelection('selectedAssumptions', assumption.id)
                        }
                        className="mt-1"
                      />
                      <span className="text-sm text-neutral-gray-700">
                        {assumption.description}
                      </span>
                    </label>
                  ))}
                  {existingAssumptions.length === 0 && (
                    <p className="text-sm text-neutral-gray-500 italic">
                      No existing assumptions available
                    </p>
                  )}
                </div>
              </div>

              {/* Add new assumptions */}
              <div>
                <label className="block text-sm font-semibold text-neutral-gray-700 mb-2">
                  Add New Assumptions
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 p-3 border border-neutral-gray-300 rounded-lg focus:border-primary-blue focus:ring-1 focus:ring-primary-blue transition-all text-sm"
                    placeholder="Enter new assumption..."
                    value={newAssumptionText}
                    onChange={(e) => setNewAssumptionText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addNewAssumption();
                      }
                    }}
                  />
                  <button
                    onClick={addNewAssumption}
                    className="px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {formData.newAssumptions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {formData.newAssumptions.map((assumption, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-white rounded-lg text-sm"
                      >
                        <span className="text-neutral-gray-700">
                          {assumption}
                        </span>
                        <button
                          onClick={() => removeNewAssumption(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Dependencies Section */}
            <div className="p-6 bg-orange-50 rounded-xl border border-orange-100">
              <div className="flex items-center gap-2 mb-4">
                <Link2 className="text-status-orange" size={20} />
                <h3 className="font-bold text-neutral-black">Dependencies</h3>
              </div>

              {/* Depends On */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-neutral-gray-700 mb-2">
                  This decision depends on
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {existingDecisions.map((decision) => (
                    <label
                      key={decision.id}
                      className="flex items-start gap-2 p-3 bg-white rounded-lg hover:bg-orange-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={formData.dependsOn.includes(decision.id)}
                        onChange={() => toggleSelection('dependsOn', decision.id)}
                        className="mt-1"
                      />
                      <span className="text-sm text-neutral-gray-700">
                        {decision.title}
                      </span>
                    </label>
                  ))}
                  {existingDecisions.length === 0 && (
                    <p className="text-sm text-neutral-gray-500 italic">
                      No existing decisions available
                    </p>
                  )}
                </div>
              </div>

              {/* Blocks */}
              <div>
                <label className="block text-sm font-semibold text-neutral-gray-700 mb-2">
                  This decision blocks
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {existingDecisions.map((decision) => (
                    <label
                      key={decision.id}
                      className="flex items-start gap-2 p-3 bg-white rounded-lg hover:bg-orange-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={formData.blocks.includes(decision.id)}
                        onChange={() => toggleSelection('blocks', decision.id)}
                        className="mt-1"
                      />
                      <span className="text-sm text-neutral-gray-700">
                        {decision.title}
                      </span>
                    </label>
                  ))}
                  {existingDecisions.length === 0 && (
                    <p className="text-sm text-neutral-gray-500 italic">
                      No existing decisions available
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Constraints Section */}
            <div className="p-6 bg-purple-50 rounded-xl border border-purple-100">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="text-purple-600" size={20} />
                <h3 className="font-bold text-neutral-black">Constraints</h3>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-gray-700 mb-2">
                  Organizational Constraints
                </label>
                {existingConstraints.length > 0 ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-2 text-blue-800 mb-3">
                      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-1">
                          All organizational constraints automatically apply
                        </p>
                        <p className="text-xs text-blue-700">
                          These {existingConstraints.length} constraint{existingConstraints.length !== 1 ? 's' : ''} will be validated when you create this decision. They represent non-negotiable organizational facts.
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {existingConstraints.map((constraint) => (
                        <div
                          key={constraint.id}
                          className="flex items-start gap-2 p-2 bg-white rounded border border-blue-100"
                        >
                          <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="flex-1">
                            <div className="text-xs font-medium text-neutral-black">
                              {constraint.name}
                            </div>
                            {constraint.description && (
                              <div className="text-xs text-neutral-gray-600 mt-0.5">
                                {constraint.description}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-neutral-gray-500 border-2 border-dashed border-neutral-gray-200 rounded-xl">
                    <p className="text-sm">No constraints available</p>
                    <p className="text-xs mt-1">You can add constraints in Organization Profile</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-between gap-3 pt-4">
              <button
                onClick={handleBack}
                className="px-6 py-2.5 text-neutral-gray-600 font-medium hover:bg-neutral-gray-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-primary-blue text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Create Decision
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddDecisionModal;
