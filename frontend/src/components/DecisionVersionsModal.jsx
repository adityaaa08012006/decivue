import React, { useState, useEffect } from 'react';
import { X, History, Link, Activity, FileText, GitBranch, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react';
import api from '../services/api';

/**
 * Decision Version Control Modal
 * Shows complete history of decision changes including:
 * - Field changes (title, description, category, etc.)
 * - Assumption/constraint linking/unlinking
 * - Health signal changes with explanations
 */
const DecisionVersionsModal = ({ decision, onClose }) => {
  const [activeTab, setActiveTab] = useState('timeline');
  const [timeline, setTimeline] = useState([]);
  const [versions, setVersions] = useState([]);
  const [relationHistory, setRelationHistory] = useState([]);
  const [healthHistory, setHealthHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [decision.id]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const [timelineData, versionsData, relationsData, healthData] = await Promise.all([
        api.getDecisionTimeline(decision.id),
        api.getDecisionVersions(decision.id),
        api.getDecisionRelationHistory(decision.id),
        api.getDecisionHealthHistory(decision.id)
      ]);
      
      setTimeline(timelineData || []);
      setVersions(versionsData || []);
      setRelationHistory(relationsData || []);
      setHealthHistory(healthData || []);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'field_change':
        return <FileText size={18} className="text-blue-600" />;
      case 'relation_change':
        return <Link size={18} className="text-purple-600" />;
      case 'health_change':
        return <Activity size={18} className="text-orange-600" />;
      default:
        return <History size={18} className="text-gray-600" />;
    }
  };

  const getHealthChangeIcon = (change) => {
    if (change > 0) return <TrendingUp size={16} className="text-green-600" />;
    if (change < 0) return <TrendingDown size={16} className="text-red-600" />;
    return null;
  };

  const renderTimelineView = () => {
    if (timeline.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <History size={48} className="mx-auto mb-3 opacity-50" />
          <p>No change history yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {timeline.map((event, idx) => (
          <div key={event.event_id} className="flex gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 mt-1">
              {getEventIcon(event.event_type)}
            </div>

            {/* Content */}
            <div className="flex-1 bg-gray-50 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium text-gray-900">{event.summary}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {event.changed_by_email && (
                      <span className="font-medium">{event.changed_by_email}</span>
                    )}
                    {!event.changed_by_email && event.event_type === 'health_change' && (
                      <span className="italic">System Evaluation</span>
                    )}
                  </p>
                </div>
                <span className="text-sm text-gray-500">{formatDate(event.event_time)}</span>
              </div>

              {/* Event-specific details */}
              {event.event_type === 'field_change' && event.details && (
                <div className="mt-2 text-sm">
                  {event.details.changed_fields && (() => {
                    try {
                      // Handle both JSONB array and plain string formats
                      const fields = Array.isArray(event.details.changed_fields)
                        ? event.details.changed_fields
                        : typeof event.details.changed_fields === 'string'
                        ? event.details.changed_fields.split(',').map(f => f.trim())
                        : [];
                      
                      return fields.length > 0 && (
                        <p className="text-gray-600">
                          Changed: <span className="font-mono text-xs bg-gray-200 px-2 py-1 rounded">
                            {fields.join(', ')}
                          </span>
                        </p>
                      );
                    } catch (e) {
                      console.error('Error parsing changed_fields:', e);
                      return null;
                    }
                  })()}
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      event.details.lifecycle === 'STABLE' ? 'bg-teal-100 text-teal-700' :
                      event.details.lifecycle === 'UNDER_REVIEW' ? 'bg-blue-100 text-blue-700' :
                      event.details.lifecycle === 'AT_RISK' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {event.details.lifecycle}
                    </span>
                    <span className="text-gray-600">
                      Health: {event.details.health_signal}%
                    </span>
                  </div>
                </div>
              )}

              {event.event_type === 'relation_change' && event.details && (
                <div className="mt-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      event.details.action === 'linked' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {event.details.action}
                    </span>
                    <span className="text-gray-700 capitalize">{event.details.relation_type}</span>
                  </div>
                  {event.details.reason && (
                    <p className="mt-1 text-gray-600 italic">{event.details.reason}</p>
                  )}
                </div>
              )}

              {event.event_type === 'health_change' && event.details && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 text-sm">
                    {getHealthChangeIcon(event.details.new_health_signal - event.details.old_health_signal)}
                    <span className="font-medium">
                      {event.details.old_health_signal}% → {event.details.new_health_signal}%
                    </span>
                    <span className={
                      event.details.new_health_signal > event.details.old_health_signal 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }>
                      ({event.details.new_health_signal > event.details.old_health_signal ? '+' : ''}
                      {event.details.new_health_signal - event.details.old_health_signal}%)
                    </span>
                  </div>
                  <div className="mt-1 text-sm">
                    <span className={`px-2 py-1 text-xs rounded ${
                      event.details.new_lifecycle === 'STABLE' ? 'bg-teal-100 text-teal-700' :
                      event.details.new_lifecycle === 'UNDER_REVIEW' ? 'bg-blue-100 text-blue-700' :
                      event.details.new_lifecycle === 'AT_RISK' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {event.details.old_lifecycle} → {event.details.new_lifecycle}
                    </span>
                  </div>
                  {event.details.triggered_by && (
                    <p className="mt-2 text-xs text-gray-500">
                      Triggered by: {event.details.triggered_by.replace(/_/g, ' ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderVersionsView = () => {
    if (versions.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <GitBranch size={48} className="mx-auto mb-3 opacity-50" />
          <p>No version history yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {versions.map((version, idx) => (
          <div key={version.version_id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg text-gray-900">v{version.version_number}</span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    version.change_type === 'created' ? 'bg-green-100 text-green-700' :
                    version.change_type === 'field_updated' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {version.change_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{version.change_summary}</p>
              </div>
              <span className="text-sm text-gray-500">{formatDate(version.changed_at)}</span>
            </div>

            {version.changed_fields && (() => {
              try {
                // Handle both JSONB array and plain string formats
                let fields = Array.isArray(version.changed_fields) 
                  ? version.changed_fields 
                  : typeof version.changed_fields === 'string'
                  ? version.changed_fields.split(',').map(f => f.trim())
                  : [];
                
                return fields.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Changed fields:</p>
                    <div className="flex flex-wrap gap-1">
                      {fields.map(field => (
                        <span key={field} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              } catch (e) {
                console.error('Error parsing changed_fields:', e);
                return null;
              }
            })()}

            <div className="bg-gray-50 rounded p-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Title</p>
                  <p className="font-medium text-gray-900">{version.title}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Category</p>
                  <p className="text-gray-700">{version.category || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Lifecycle</p>
                  <span className={`px-2 py-1 text-xs rounded ${
                    version.lifecycle === 'STABLE' ? 'bg-teal-100 text-teal-700' :
                    version.lifecycle === 'UNDER_REVIEW' ? 'bg-blue-100 text-blue-700' :
                    version.lifecycle === 'AT_RISK' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {version.lifecycle}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Health Signal</p>
                  <p className="text-gray-700">{version.health_signal}%</p>
                </div>
              </div>
              {version.description && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-1">Description</p>
                  <p className="text-gray-700">{version.description}</p>
                </div>
              )}
            </div>

            {version.changed_by_email && (
              <p className="text-xs text-gray-500 mt-2">
                Changed by: {version.changed_by_email}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderRelationsView = () => {
    if (relationHistory.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <Link size={48} className="mx-auto mb-3 opacity-50" />
          <p>No relationship changes yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {relationHistory.map((change) => (
          <div key={change.change_id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded font-medium ${
                  change.action === 'linked' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {change.action}
                </span>
                <span className="text-sm font-medium capitalize text-gray-900">
                  {change.relation_type}
                </span>
              </div>
              <span className="text-sm text-gray-500">{formatDate(change.changed_at)}</span>
            </div>

            <p className="text-sm text-gray-700 mb-2">{change.relation_description}</p>

            {change.reason && (
              <p className="text-sm text-gray-600 italic border-l-2 border-gray-300 pl-3">
                {change.reason}
              </p>
            )}

            {change.changed_by_email && (
              <p className="text-xs text-gray-500 mt-2">
                By: {change.changed_by_email}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderHealthView = () => {
    if (healthHistory.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <Activity size={48} className="mx-auto mb-3 opacity-50" />
          <p>No health history yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {healthHistory.map((entry) => (
          <div key={entry.evaluation_id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {getHealthChangeIcon(entry.health_change)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {entry.old_health_signal}% → {entry.new_health_signal}%
                    </span>
                    <span className={`text-sm font-medium ${
                      entry.health_change > 0 ? 'text-green-600' : 
                      entry.health_change < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      ({entry.health_change > 0 ? '+' : ''}{entry.health_change}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-1 text-xs rounded ${
                      entry.new_lifecycle === 'STABLE' ? 'bg-teal-100 text-teal-700' :
                      entry.new_lifecycle === 'UNDER_REVIEW' ? 'bg-blue-100 text-blue-700' :
                      entry.new_lifecycle === 'AT_RISK' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {entry.old_lifecycle} → {entry.new_lifecycle}
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-sm text-gray-500">{formatDate(entry.evaluated_at)}</span>
            </div>

            {entry.change_explanation && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-2">
                <div className="flex gap-2">
                  <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-900">{entry.change_explanation}</p>
                </div>
              </div>
            )}

            {entry.triggered_by && (
              <p className="text-xs text-gray-500">
                Triggered by: <span className="font-medium">{entry.triggered_by.replace(/_/g, ' ')}</span>
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const tabs = [
    { id: 'timeline', label: 'All Changes', icon: History },
    { id: 'versions', label: 'Field Changes', icon: FileText },
    { id: 'relations', label: 'Assumptions & Constraints', icon: Link },
    { id: 'health', label: 'Health History', icon: Activity },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <GitBranch size={24} />
              Version History
            </h2>
            <p className="text-sm text-gray-600 mt-1">{decision.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading history...</p>
            </div>
          ) : (
            <>
              {activeTab === 'timeline' && renderTimelineView()}
              {activeTab === 'versions' && renderVersionsView()}
              {activeTab === 'relations' && renderRelationsView()}
              {activeTab === 'health' && renderHealthView()}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DecisionVersionsModal;
