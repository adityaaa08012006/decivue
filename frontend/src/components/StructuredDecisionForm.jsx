import React, { useState, useEffect } from 'react';
import { Plus, X, Trash2, AlertTriangle } from 'lucide-react';
import api from '../services/api';

/**
 * StructuredDecisionForm
 * Dropdown-based form for creating decisions with structured data
 * Enables decision parameter tracking and conflict detection
 * Supports upcoming features: versioning, contradictions, review intelligence, governance
 */
const StructuredDecisionForm = ({ 
  onSubmit, 
  onCancel, 
  existingDecision = null 
}) => {
  const [templates, setTemplates] = useState({});
  const [formData, setFormData] = useState({
    title: existingDecision?.title || '',
    description: existingDecision?.description || '',
    category: existingDecision?.category || existingDecision?.metadata?.category || '',
    parameters: existingDecision?.parameters || existingDecision?.metadata?.parameters || {},
    expiryDate: existingDecision?.expiry_date ? new Date(existingDecision.expiry_date).toISOString().split('T')[0] : '',
    customCategory: '',
    showCustomCategory: false,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [managingCategories, setManagingCategories] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [checkingWarnings, setCheckingWarnings] = useState(false);

  // Decision-specific categories
  const DECISION_CATEGORIES = [
    'Strategic Initiative',
    'Budget & Financial',
    'Resource Allocation',
    'Technical Architecture',
    'Timeline & Milestones',
    'Operational Process',
    'Product Direction',
    'Market & Competitive',
    'Risk & Compliance',
    'Organizational Change'
  ];

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await api.getParameterTemplates();
      console.log('📥 Loaded templates for decisions:', response);
      
      if (!response || !response.grouped) {
        console.error('Invalid response format:', response);
        setError('Failed to load templates. Invalid response format.');
        setLoading(false);
        return;
      }
      
      setTemplates(response.grouped);
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError('Failed to load templates. Please try again.');
      setLoading(false);
    }
  };

  const handleCategoryChange = (category) => {
    if (category === '__CUSTOM__') {
      setFormData({ ...formData, showCustomCategory: true, category: '' });
    } else {
      const newFormData = { ...formData, category, showCustomCategory: false, parameters: {} };
      setFormData(newFormData);
      // Check for similar failures when category changes
      checkSimilarFailures(category, {});
    }
  };

  const handleCustomCategoryAdd = () => {
    if (!formData.customCategory.trim()) {
      setError('Please enter a category name');
      return;
    }

    const categoryName = formData.customCategory.trim();
    const newFormData = {
      ...formData, 
      category: categoryName, 
      showCustomCategory: false,
      customCategory: '',
      parameters: {}
    };
    setFormData(newFormData);
    // Check for similar failures when custom category is added
    checkSimilarFailures(categoryName, {});
  };

  const updateParameter = (key, value) => {
    const newParameters = { ...formData.parameters, [key]: value };
    setFormData({
      ...formData,
      parameters: newParameters
    });
    // Check for similar failures when parameters change significantly
    // Debounce this to avoid too many API calls
    if (formData.category) {
      checkSimilarFailures(formData.category, newParameters);
    }
  };

  // Check for similar deprecated decisions that failed
  const checkSimilarFailures = async (category, parameters) => {
    // Skip if no category or if it's an existing decision (editing)
    if (!category || existingDecision) {
      setWarnings([]);
      return;
    }

    // Skip if parameters are empty
    if (!parameters || Object.keys(parameters).length === 0) {
      setWarnings([]);
      return;
    }

    try {
      setCheckingWarnings(true);
      const response = await api.checkSimilarFailures(category, parameters);
      
      if (response.warnings && response.warnings.length > 0) {
        setWarnings(response.warnings);
        console.log('⚠️ Similar failed decisions detected:', response.warnings);
      } else {
        setWarnings([]);
      }
    } catch (err) {
      console.error('Failed to check for similar failures:', err);
      // Don't block the user if checking fails
      setWarnings([]);
    } finally {
      setCheckingWarnings(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (!formData.category) {
      setError('Please select a decision category');
      return;
    }

    const decisionData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      category: formData.category,
      parameters: formData.parameters
    };

    // Add expiry date if provided
    if (formData.expiryDate) {
      decisionData.expiry_date = new Date(formData.expiryDate).toISOString();
    }

    await onSubmit(decisionData);
  };

  const renderParameterFields = () => {
    if (!formData.category) return null;

    const category = formData.category;

    // Strategic Initiative parameters
    if (category === 'Strategic Initiative') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Strategic Goal <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.parameters.goal || ''}
              onChange={(e) => updateParameter('goal', e.target.value)}
              required
            >
              <option value="">Select strategic goal...</option>
              <option value="Revenue Growth">Revenue Growth</option>
              <option value="Market Expansion">Market Expansion</option>
              <option value="Cost Reduction">Cost Reduction</option>
              <option value="Customer Satisfaction">Customer Satisfaction</option>
              <option value="Innovation">Innovation</option>
              <option value="Operational Excellence">Operational Excellence</option>
              <option value="Risk Mitigation">Risk Mitigation</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Expected Impact</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.parameters.impact || ''}
              onChange={(e) => updateParameter('impact', e.target.value)}
            >
              <option value="">Select impact level...</option>
              <option value="Transformational">Transformational</option>
              <option value="Significant">Significant</option>
              <option value="Moderate">Moderate</option>
              <option value="Incremental">Incremental</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Target Timeframe</label>
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
        </div>
      );
    }

    // Budget & Financial parameters
    if (category === 'Budget & Financial') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Budget Type <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.parameters.budgetType || ''}
              onChange={(e) => updateParameter('budgetType', e.target.value)}
              required
            >
              <option value="">Select budget type...</option>
              <option value="CAPEX">Capital Expenditure (CAPEX)</option>
              <option value="OPEX">Operational Expenditure (OPEX)</option>
              <option value="Investment">Investment</option>
              <option value="Cost Reduction">Cost Reduction</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Amount (USD)
            </label>
            <input
              type="number"
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., 500000"
              value={formData.parameters.amount || ''}
              onChange={(e) => updateParameter('amount', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Budget Allocation
            </label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.parameters.allocation || ''}
              onChange={(e) => updateParameter('allocation', e.target.value)}
            >
              <option value="">Select allocation...</option>
              <option value="Fixed">Fixed Budget</option>
              <option value="Range">Budget Range</option>
              <option value="Not to Exceed">Not to Exceed</option>
              <option value="Minimum Required">Minimum Required</option>
            </select>
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
        </div>
      );
    }

    // Resource Allocation parameters
    if (category === 'Resource Allocation') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Resource Type <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.parameters.resourceType || ''}
              onChange={(e) => updateParameter('resourceType', e.target.value)}
              required
            >
              <option value="">Select resource type...</option>
              <option value="Engineering">Engineering</option>
              <option value="Product">Product</option>
              <option value="Design">Design</option>
              <option value="Marketing">Marketing</option>
              <option value="Sales">Sales</option>
              <option value="Infrastructure">Infrastructure</option>
              <option value="Support">Support</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Headcount Required
            </label>
            <input
              type="number"
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., 5"
              value={formData.parameters.headcount || ''}
              onChange={(e) => updateParameter('headcount', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Allocation Type</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.parameters.allocationType || ''}
              onChange={(e) => updateParameter('allocationType', e.target.value)}
            >
              <option value="">Select allocation type...</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Temporary">Temporary Reallocation</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Duration</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.parameters.timeframe || ''}
              onChange={(e) => updateParameter('timeframe', e.target.value)}
            >
              <option value="">Select duration...</option>
              {(templates.timeframe || []).map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
      );
    }

    // Technical Architecture parameters
    if (category === 'Technical Architecture') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Architecture Domain <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.parameters.domain || ''}
              onChange={(e) => updateParameter('domain', e.target.value)}
              required
            >
              <option value="">Select domain...</option>
              <option value="Frontend">Frontend</option>
              <option value="Backend">Backend</option>
              <option value="Database">Database</option>
              <option value="Infrastructure">Infrastructure</option>
              <option value="DevOps">DevOps</option>
              <option value="Security">Security</option>
              <option value="Integration">Integration</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Technology/Tool
            </label>
            <input
              type="text"
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., React, PostgreSQL, AWS"
              value={formData.parameters.technology || ''}
              onChange={(e) => updateParameter('technology', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Change Scope</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.parameters.scope || ''}
              onChange={(e) => updateParameter('scope', e.target.value)}
            >
              <option value="">Select scope...</option>
              <option value="New Implementation">New Implementation</option>
              <option value="Migration">Migration</option>
              <option value="Upgrade">Upgrade</option>
              <option value="Replacement">Replacement</option>
              <option value="Decommission">Decommission</option>
            </select>
          </div>
        </div>
      );
    }

    // Timeline & Milestones parameters
    if (category === 'Timeline & Milestones') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Timeline Type <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.parameters.timelineType || ''}
              onChange={(e) => updateParameter('timelineType', e.target.value)}
              required
            >
              <option value="">Select timeline type...</option>
              <option value="Fixed Deadline">Fixed Deadline</option>
              <option value="Target Date">Target Date</option>
              <option value="Flexible Timeline">Flexible Timeline</option>
              <option value="Milestone-based">Milestone-based</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Duration</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.parameters.timeframe || ''}
              onChange={(e) => updateParameter('timeframe', e.target.value)}
            >
              <option value="">Select duration...</option>
              {(templates.timeframe || []).map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Urgency</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.parameters.urgency || ''}
              onChange={(e) => updateParameter('urgency', e.target.value)}
            >
              <option value="">Select urgency...</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      );
    }

    // Generic parameters for other categories
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Impact Area</label>
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
        
        {formData.parameters.impactArea && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Expected Direction</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.parameters.direction || ''}
              onChange={(e) => updateParameter('direction', e.target.value)}
            >
              <option value="">Select direction...</option>
              <option value="Increase">Increase</option>
              <option value="Decrease">Decrease</option>
              <option value="Maintain">Maintain</option>
              <option value="Optimize">Optimize</option>
            </select>
          </div>
        )}

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
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Decision Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="e.g., Migrate to Cloud Infrastructure"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      {/* Category Selection */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Decision Category <span className="text-red-500">*</span>
        </label>
        
        {formData.showCustomCategory ? (
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Enter custom category name"
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
              onClick={handleCustomCategoryAdd}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
            </button>
            <button
              onClick={() => setFormData({ ...formData, showCustomCategory: false, customCategory: '' })}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <select
            className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={formData.category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            required
          >
            <option value="">Select a category...</option>
            {DECISION_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
            <option value="__CUSTOM__">+ Add Custom Category</option>
          </select>
        )}
        <p className="mt-1 text-sm text-gray-500">
          This helps with conflict detection and decision monitoring
        </p>
      </div>

      {/* Category-specific Parameters */}
      {formData.category && !formData.showCustomCategory && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-3">
            {formData.category} Parameters
          </h4>
          {renderParameterFields()}
        </div>
      )}

      {/* Warnings about Similar Failed Decisions */}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-1" size={24} />
            <div className="flex-1">
              <h4 className="font-bold text-yellow-900 mb-2">
                ⚠️ Warning: Similar Decisions Failed in the Past
              </h4>
              <p className="text-sm text-yellow-800 mb-3">
                We found {warnings.length} similar decision{warnings.length > 1 ? 's' : ''} that failed previously. Please review before proceeding:
              </p>
              
              {warnings.map((warning, idx) => (
                <div key={idx} className="bg-white border border-yellow-300 rounded-lg p-3 mb-3 last:mb-0">
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="font-semibold text-gray-900">
                      "{warning.deprecatedDecisionTitle}"
                    </h5>
                    <span className="text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                      {Math.round(warning.similarityScore * 100)}% similar
                    </span>
                  </div>
                  
                  {warning.matchingParameters.length > 0 && (
                    <div className="text-xs text-gray-600 mb-2">
                      <span className="font-medium">Matching:</span> {warning.matchingParameters.slice(0, 2).join(', ')}
                      {warning.matchingParameters.length > 2 && ` +${warning.matchingParameters.length - 2} more`}
                    </div>
                  )}
                  
                  {warning.failureReasons && warning.failureReasons.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-red-700 mb-1">Why it failed:</p>
                      <ul className="text-xs text-gray-700 space-y-1 ml-4">
                        {warning.failureReasons.slice(0, 3).map((reason, i) => (
                          <li key={i} className="list-disc">{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {warning.recommendations && warning.recommendations.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-blue-700 mb-1">Recommendations:</p>
                      <ul className="text-xs text-gray-700 space-y-1 ml-4">
                        {warning.recommendations.slice(0, 2).map((rec, i) => (
                          <li key={i} className="list-disc">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
              
              <p className="text-xs text-yellow-800 italic mt-2">
                💡 Consider adjusting your approach or parameters to avoid similar issues.
              </p>
            </div>
          </div>
        </div>
      )}

      {checkingWarnings && (
        <div className="text-sm text-gray-500 italic">
          Checking for similar failed decisions...
        </div>
      )}

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Description
        </label>
        <textarea
          className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          rows={4}
          placeholder="Provide context and details about this decision..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      {/* Expiry Date (Optional) */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Expiry Date (Optional)
        </label>
        <input
          type="date"
          className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          value={formData.expiryDate}
          onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
        />
        <p className="mt-1 text-sm text-gray-500">
          When should this decision be reviewed or reconsidered?
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={handleSubmit}
          disabled={!formData.title.trim() || !formData.category || loading}
          className="flex-1 bg-blue-600 dark:bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-neutral-gray-700 disabled:cursor-not-allowed font-semibold transition-colors"
        >
          Continue
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-3 bg-gray-200 dark:bg-neutral-gray-700 text-gray-700 dark:text-neutral-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-neutral-gray-600 font-semibold transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default StructuredDecisionForm;
