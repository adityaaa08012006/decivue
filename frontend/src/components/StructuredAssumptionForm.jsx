import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import api from '../services/api';

/**
 * StructuredAssumptionForm
 * Dropdown-based form for creating assumptions with structured data
 * Enables reliable conflict detection through consistent parameter matching
 */
const StructuredAssumptionForm = ({ 
  onSubmit, 
  onCancel, 
  linkToDecisionId = null,
  existingAssumption = null 
}) => {
  const [templates, setTemplates] = useState({});
  const [formData, setFormData] = useState({
    category: existingAssumption?.category || '',
    description: existingAssumption?.description || '',
    parameters: existingAssumption?.parameters || {},
    customCategory: '',
    showCustomCategory: false,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await api.getParameterTemplates();
      setTemplates(response.grouped || {});
      setLoading(false);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setLoading(false);
    }
  };

  const handleCategoryChange = (category) => {
    if (category === '__CUSTOM__') {
      setFormData({ ...formData, showCustomCategory: true, category: '' });
    } else {
      setFormData({ ...formData, category, showCustomCategory: false, parameters: {} });
    }
  };

  const handleCustomCategoryAdd = async () => {
    if (formData.customCategory.trim()) {
      try {
        await api.addCustomTemplate('assumption_category', formData.customCategory);
        setFormData({ 
          ...formData, 
          category: formData.customCategory, 
          showCustomCategory: false,
          customCategory: ''
        });
        // Reload templates
        await loadTemplates();
      } catch (err) {
        console.error('Failed to add custom category:', err);
      }
    }
  };

  const updateParameter = (key, value) => {
    setFormData({
      ...formData,
      parameters: { ...formData.parameters, [key]: value }
    });
  };

  const handleSubmit = async () => {
    const assumptionData = {
      description: formData.description,
      category: formData.category,
      parameters: formData.parameters,
      status: 'VALID',
    };

    if (linkToDecisionId) {
      assumptionData.linkToDecisionId = linkToDecisionId;
    }

    await onSubmit(assumptionData);
  };

  const renderParameterFields = () => {
    if (!formData.category) return null;

    const category = formData.category;

    // Budget & Financial parameters
    if (category === 'Budget & Financial') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (Optional)</label>
            <input
              type="number"
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., 500000"
              value={formData.parameters.amount || ''}
              onChange={(e) => updateParameter('amount', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Timeframe</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.parameters.timeframe || ''}
              onChange={(e) => updateParameter('timeframe', e.target.value)}
            >
              <option value="">Select timeframe...</option>
              {(templates.timeframe || []).map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Expected Outcome</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.parameters.outcome || ''}
              onChange={(e) => updateParameter('outcome', e.target.value)}
            >
              <option value="">Select outcome...</option>
              {(templates.outcome_type || []).map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
      );
    }

    // Timeline & Schedule parameters
    if (category === 'Timeline & Schedule') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Timeframe</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.parameters.timeframe || ''}
              onChange={(e) => updateParameter('timeframe', e.target.value)}
            >
              <option value="">Select timeframe...</option>
              {(templates.timeframe || []).map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Expected Outcome</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.parameters.outcome || ''}
              onChange={(e) => updateParameter('outcome', e.target.value)}
            >
              <option value="">Select outcome...</option>
              {(templates.outcome_type || []).map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
      );
    }

    // Resource & Staffing parameters
    if (category === 'Resource & Staffing') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Resource Type</label>
            <input
              type="text"
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., Senior Developer, AWS Infrastructure"
              value={formData.parameters.resourceType || ''}
              onChange={(e) => updateParameter('resourceType', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Timeframe</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.parameters.timeframe || ''}
              onChange={(e) => updateParameter('timeframe', e.target.value)}
            >
              <option value="">Select timeframe...</option>
              {(templates.timeframe || []).map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Availability</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.parameters.outcome || ''}
              onChange={(e) => updateParameter('outcome', e.target.value)}
            >
              <option value="">Select...</option>
              <option value="Resource Available">Available</option>
              <option value="Resource Unavailable">Unavailable</option>
            </select>
          </div>
        </div>
      );
    }

    // Generic impact area parameter for other categories
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Impact Area (Optional)</label>
          <select
            className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={formData.parameters.impactArea || ''}
            onChange={(e) => updateParameter('impactArea', e.target.value)}
          >
            <option value="">Select impact area...</option>
            {(templates.impact_area || []).map((t) => (
              <option key={t.id} value={t.name}>{t.name}</option>
            ))}
          </select>
        </div>
        
        {/* Show direction field if impact area is selected */}
        {formData.parameters.impactArea && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Expected Impact Direction <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.parameters.direction || ''}
              onChange={(e) => updateParameter('direction', e.target.value)}
            >
              <option value="">Select direction...</option>
              <option value="increase">Increase / Improve</option>
              <option value="decrease">Decrease / Worsen</option>
              <option value="positive">Positive Impact</option>
              <option value="negative">Negative Impact</option>
              <option value="stable">Remain Stable</option>
            </select>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading templates...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Category Selection */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Assumption Category <span className="text-red-500">*</span>
        </label>
        {!formData.showCustomCategory ? (
          <select
            className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={formData.category}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            <option value="">Select category...</option>
            {(templates.assumption_category || []).map((t) => (
              <option key={t.id} value={t.name}>{t.name}</option>
            ))}
            <option value="__CUSTOM__">+ Add Custom Category</option>
          </select>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Enter custom category..."
              value={formData.customCategory}
              onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
            />
            <button
              onClick={handleCustomCategoryAdd}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Plus size={20} />
            </button>
            <button
              onClick={() => setFormData({ ...formData, showCustomCategory: false, customCategory: '' })}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              <X size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Parameter Fields (dynamic based on category) */}
      {renderParameterFields()}

      {/* Description (still free text for context) */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          rows="3"
          placeholder="Provide additional context about this assumption..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
        <p className="text-xs text-gray-500 mt-1">
          This helps with readability and provides context for conflict resolution
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        <button
          onClick={onCancel}
          className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!formData.category || !formData.description.trim()}
          className="px-6 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {existingAssumption ? 'Update' : 'Add'} Assumption
        </button>
      </div>
    </div>
  );
};

export default StructuredAssumptionForm;
