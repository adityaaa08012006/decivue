import React, { useState, useEffect } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
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
  const [error, setError] = useState(null);
  const [managingCategories, setManagingCategories] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await api.getParameterTemplates();
      console.log('📥 Loaded templates:', response);
      
      if (!response || !response.grouped) {
        console.error('Invalid response format:', response);
        setError('Failed to load categories. Invalid response format.');
        setLoading(false);
        return;
      }
      
      setTemplates(response.grouped);
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError('Failed to load categories. Please try again.');
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
    if (!formData.customCategory.trim()) {
      setError('Please enter a category name');
      return;
    }

    try {
      setError(null);
      const categoryName = formData.customCategory.trim();
      
      console.log('➕ Adding custom category:', categoryName);
      await api.addCustomTemplate('assumption_category', categoryName);
      
      console.log('🔄 Reloading templates...');
      // Reload templates first to ensure they're in state
      await loadTemplates();
      
      // Then update formData to use the new category
      setFormData({ 
        ...formData, 
        category: categoryName, 
        showCustomCategory: false,
        customCategory: '',
        parameters: {} // Reset parameters for the new category
      });
      
      console.log('✅ Custom category added successfully:', categoryName);
    } catch (err) {
      console.error('Failed to add custom category:', err);
      setError(err.message || 'Failed to add category. It may already exist.');
    }
  };

  const handleDeleteCategory = async (templateId, categoryName) => {
    if (!window.confirm(`Delete category "${categoryName}"? This will hide it from future selections.`)) {
      return;
    }

    try {
      setError(null);
      console.log('🗑️ Deleting category:', categoryName);
      await api.deleteParameterTemplate(templateId);
      
      // Reload templates first
      console.log('🔄 Reloading templates after deletion...');
      await loadTemplates();
      
      // Then update formData if needed
      if (formData.category === categoryName) {
        setFormData({ ...formData, category: '', parameters: {} });
      }
      
      console.log('✅ Category deleted successfully:', categoryName);
    } catch (err) {
      console.error('Failed to delete category:', err);
      setError(err.message || 'Failed to delete category.');
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
    console.log('🎨 Rendering parameter fields for category:', category);
    console.log('🎨 Available templates:', Object.keys(templates));

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
            onChange={(e) => {
              console.log('📍 Impact area selected:', e.target.value);
              console.log('📍 Available templates.impact_area:', templates.impact_area);
              updateParameter('impactArea', e.target.value);
            }}
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
      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Category Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold text-gray-700">
            Assumption Category <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => setManagingCategories(!managingCategories)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            {managingCategories ? 'Done' : 'Manage Categories'}
          </button>
        </div>

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
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCustomCategoryAdd();
                }
              }}
            />
            <button
              type="button"
              onClick={handleCustomCategoryAdd}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              title="Add Category"
            >
              <Plus size={20} />
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, showCustomCategory: false, customCategory: '' })}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              title="Cancel"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Category Management Section */}
        {managingCategories && (templates.assumption_category || []).length > 0 && (
          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-600 mb-2 font-medium">Click the trash icon to remove a category:</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {(templates.assumption_category || []).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2 bg-white rounded border border-gray-200 hover:border-gray-300"
                >
                  <span className="text-sm text-gray-700">{t.name}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(t.id, t.name)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                    title={`Delete "${t.name}"`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
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
