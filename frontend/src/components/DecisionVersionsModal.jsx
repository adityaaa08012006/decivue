import React, { useState, useEffect } from 'react';
import { X, History, Link, Activity, FileText, GitBranch, TrendingDown, TrendingUp, AlertCircle, Check, MessageSquare, Shield, Lock, Unlock, Edit, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';

/**
 * Decision Version Control Modal
 * Shows complete history of decision changes including:
 * - Field changes (title, description, category, etc.)
 * - Assumption/constraint linking/unlinking
 * - Health signal changes with explanations
 * - Reviews with comments
 * - Conflict resolutions
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

  const getEventIcon = (eventType, eventData) => {
    // For version events, check the change_type in event_data
    if (eventType === 'version' && eventData) {
      switch (eventData.change_type) {
        case 'governance_lock':
          return <Lock size={18} className="text-gray-700" />;
        case 'governance_unlock':
          return <Unlock size={18} className="text-green-600" />;
        case 'edit_requested':
          return <Edit size={18} className="text-yellow-600" />;
        case 'edit_approved':
          return <CheckCircle size={18} className="text-green-600" />;
        case 'edit_rejected':
          return <XCircle size={18} className="text-red-600" />;
        case 'manual_review':
          return <Check size={18} className="text-green-600" />;
        case 'assumption_conflict_resolved':
        case 'decision_conflict_resolved':
          return <Shield size={18} className="text-purple-600" />;
        case 'field_updated':
        case 'lifecycle_changed':
          return <FileText size={18} className="text-blue-600" />;
        default:
          return <History size={18} className="text-gray-600" />;
      }
    }
    
    switch (eventType) {
      case 'review':
        return <MessageSquare size={18} className="text-green-600" />;
      case 'relation':
        return <Link size={18} className="text-purple-600" />;
      case 'evaluation':
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
        {timeline.map((event, idx) => {
          const eventData = event.event_data || {};
          
          return (
          <div key={event.event_id || event.id || `timeline-${idx}`} className="flex gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 mt-1">
              {getEventIcon(event.event_type, eventData)}
            </div>

            {/* Content */}
            <div className="flex-1 bg-gray-50 rounded-lg p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {event.event_type === 'version' && eventData.change_summary}
                    {event.event_type === 'review' && `Decision Reviewed (${eventData.review_type?.replace(/_/g, ' ')})`}
                    {event.event_type === 'relation' && `${eventData.relation_type} ${eventData.action}`}
                    {event.event_type === 'evaluation' && 'Automated Evaluation'}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {eventData.user_name || eventData.reviewer_name || <span className="italic">System</span>}
                  </p>
                </div>
                <span className="text-sm text-gray-500">{formatDate(event.event_time)}</span>
              </div>

              {/* Version Event Details */}
              {event.event_type === 'version' && (
                <div className="mt-2 space-y-2">
                  {/* Governance Lock/Unlock Events */}
                  {(eventData.change_type === 'governance_lock' || eventData.change_type === 'governance_unlock') && (
                    <div className={`border rounded p-3 ${
                      eventData.change_type === 'governance_lock' 
                        ? 'bg-gray-50 border-gray-300' 
                        : 'bg-green-50 border-green-300'
                    }`}>
                      <div className="flex items-start gap-2">
                        {eventData.change_type === 'governance_lock' ? (
                          <Lock size={16} className="text-gray-700 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Unlock size={16} className="text-green-700 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="text-sm">
                          <div className={`font-medium ${
                            eventData.change_type === 'governance_lock' 
                              ? 'text-gray-900' 
                              : 'text-green-900'
                          }`}>
                            {eventData.change_type === 'governance_lock' ? '🔒 Decision Locked' : '🔓 Decision Unlocked'}
                          </div>
                          {eventData.changed_fields?.justification && (
                            <div className="text-gray-700 mt-1">
                              {eventData.changed_fields.justification}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {eventData.review_comment && (
                    <div className="bg-white border border-gray-200 rounded p-3">
                      <div className="flex items-start gap-2">
                        <MessageSquare size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-gray-700">{eventData.review_comment}</div>
                      </div>
                    </div>
                  )}
                  
                  {eventData.metadata && eventData.metadata.conflict_id && (
                    <div className="bg-purple-50 border border-purple-200 rounded p-3">
                      <div className="text-sm">
                        <span className="font-medium text-purple-900">
                          {eventData.change_type === 'assumption_conflict_resolved' ? 'Assumption' : 'Decision'} Conflict Resolved
                        </span>
                        <div className="text-purple-700 mt-1">
                          {eventData.metadata.resolution_action && (
                            <div>Action: {eventData.metadata.resolution_action.replace(/_/g, ' ')}</div>
                          )}
                          {eventData.metadata.conflict_type && (
                            <div>Type: {eventData.metadata.conflict_type}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Review Event Details */}
              {event.event_type === 'review' && (
                <div className="mt-2 space-y-2">
                  {eventData.review_comment && (
                    <div className="bg-white border border-gray-200 rounded p-3">
                      <div className="flex items-start gap-2">
                        <MessageSquare size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-gray-700">
                          {eventData.review_comment}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {eventData.previous_lifecycle && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`px-2 py-1 text-xs rounded ${
                        eventData.previous_lifecycle === 'STABLE' ? 'bg-teal-100 text-teal-700' :
                        eventData.previous_lifecycle === 'UNDER_REVIEW' ? 'bg-blue-100 text-blue-700' :
                        eventData.previous_lifecycle === 'AT_RISK' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {eventData.previous_lifecycle}
                      </span>
                      →
                      <span className={`px-2 py-1 text-xs rounded ${
                        eventData.new_lifecycle === 'STABLE' ? 'bg-teal-100 text-teal-700' :
                        eventData.new_lifecycle === 'UNDER_REVIEW' ? 'bg-blue-100 text-blue-700' :
                        eventData.new_lifecycle === 'AT_RISK' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {eventData.new_lifecycle || eventData.previous_lifecycle}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Relation Event Details */}
              {event.event_type === 'relation' && (
                <div className="mt-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      eventData.action === 'linked' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {eventData.action}
                    </span>
                    <span className="text-gray-700">{eventData.relation_description || 'Relation'}</span>
                  </div>
                  {eventData.reason && (
                    <p className="mt-1 text-gray-600 italic">{eventData.reason}</p>
                  )}
                </div>
              )}

              {/* Evaluation Event Details */}
              {event.event_type === 'evaluation' && (
                <div className="mt-2">
                  {eventData.old_health_signal !== undefined && eventData.new_health_signal !== undefined && (
                    <div className="flex items-center gap-2 text-sm">
                      {getHealthChangeIcon(eventData.new_health_signal - eventData.old_health_signal)}
                      <span className="font-medium">
                        {eventData.old_health_signal}% → {eventData.new_health_signal}%
                      </span>
                      <span className={
                        eventData.new_health_signal > eventData.old_health_signal 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }>
                        ({eventData.new_health_signal > eventData.old_health_signal ? '+' : ''}
                        {eventData.new_health_signal - eventData.old_health_signal}%)
                      </span>
                    </div>
                  )}
                  {eventData.old_lifecycle !== eventData.new_lifecycle && (
                    <p className="mt-2 text-sm text-gray-600">
                      Lifecycle: <span className="font-medium">{eventData.old_lifecycle}</span> → <span className="font-medium">{eventData.new_lifecycle}</span>
                    </p>
                  )}
                  {eventData.change_explanation && (
                    <p className="mt-2 text-sm text-gray-600">{eventData.change_explanation}</p>
                  )}
                  {eventData.invalidated_reason && (
                    <p className="mt-2 text-sm text-gray-600">{eventData.invalidated_reason}</p>
                  )}
                  {eventData.triggered_by && (
                    <p className="mt-1 text-xs text-gray-500">
                      Triggered by: {eventData.triggered_by.replace(/_/g, ' ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )})}
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
        {versions.map((version, idx) => {
          // Check if this is a governance event (doesn't have version_number)
          const isGovernanceEvent = ['governance_lock', 'governance_unlock', 'edit_requested', 'edit_approved', 'edit_rejected'].includes(version.change_type);
          const isConflictResolution = ['assumption_conflict_resolved', 'decision_conflict_resolved'].includes(version.change_type);
          const isEditEvent = ['edit_requested', 'edit_approved', 'edit_rejected'].includes(version.change_type);
          
          return (
          <div key={version.id || version.version_id || `version-${idx}`} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  {version.version_number !== null && version.version_number !== undefined ? (
                    <span className="font-semibold text-lg text-gray-900">v{version.version_number}</span>
                  ) : (
                    <span className="font-semibold text-lg text-gray-900 flex items-center gap-1">
                      {version.change_type === 'governance_lock' && <><Lock size={18} /> Locked</>}
                      {version.change_type === 'governance_unlock' && <><Unlock size={18} /> Unlocked</>}
                      {version.change_type === 'edit_requested' && <><Edit size={18} /> Edit Requested</>}
                      {version.change_type === 'edit_approved' && <><CheckCircle size={18} /> Edit Approved</>}
                      {version.change_type === 'edit_rejected' && <><XCircle size={18} /> Edit Rejected</>}
                      {isConflictResolution && <><Shield size={18} /> Conflict Resolved</>}
                    </span>
                  )}
                  <span className={`px-2 py-1 text-xs rounded ${
                    version.change_type === 'created' ? 'bg-green-100 text-green-700' :
                    version.change_type === 'field_updated' ? 'bg-blue-100 text-blue-700' :
                    version.change_type === 'governance_lock' ? 'bg-gray-100 text-gray-700' :
                    version.change_type === 'governance_unlock' ? 'bg-green-100 text-green-700' :
                    version.change_type === 'edit_requested' ? 'bg-yellow-100 text-yellow-700' :
                    version.change_type === 'edit_approved' ? 'bg-green-100 text-green-700' :
                    version.change_type === 'edit_rejected' ? 'bg-red-100 text-red-700' :
                    isConflictResolution ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {version.change_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{version.change_summary}</p>
              </div>
              <span className="text-sm text-gray-500">{formatDate(version.changed_at)}</span>
            </div>

            {/* Show governance event details (lock/unlock justification) */}
            {(version.change_type === 'governance_lock' || version.change_type === 'governance_unlock') && version.changed_fields && (
              <div className={`border rounded p-3 mb-3 ${
                version.change_type === 'governance_lock' 
                  ? 'bg-gray-50 border-gray-300' 
                  : 'bg-green-50 border-green-300'
              }`}>
                <div className="text-sm text-gray-700">
                  {version.changed_fields.justification || 'No reason provided'}
                </div>
              </div>
            )}

            {/* Show edit request details */}
            {isEditEvent && version.changed_fields && (
              <div className={`border rounded p-3 mb-3 ${
                version.change_type === 'edit_requested' ? 'bg-yellow-50 border-yellow-300' :
                version.change_type === 'edit_approved' ? 'bg-green-50 border-green-300' :
                'bg-red-50 border-red-300'
              }`}>
                <div className="text-sm space-y-2">
                  {version.changed_fields.justification && (
                    <div>
                      <p className="font-semibold text-gray-700">Reason:</p>
                      <p className="text-gray-700">{version.changed_fields.justification}</p>
                    </div>
                  )}
                  {version.changed_fields.proposed_changes && (
                    <div>
                      <p className="font-semibold text-gray-700">Proposed Changes:</p>
                      <pre className="text-xs bg-white p-2 rounded border border-gray-200 overflow-auto">
                        {JSON.stringify(version.changed_fields.proposed_changes, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Show conflict resolution details */}
            {isConflictResolution && version.metadata && (
              <div className="border rounded p-3 mb-3 bg-purple-50 border-purple-300">
                <div className="text-sm space-y-2">
                  {version.metadata.conflict_type && (
                    <div>
                      <p className="font-semibold text-purple-900">Conflict Type:</p>
                      <p className="text-purple-800">{version.metadata.conflict_type.replace(/_/g, ' ')}</p>
                    </div>
                  )}
                  {version.metadata.resolution_action && (
                    <div>
                      <p className="font-semibold text-purple-900">Resolution:</p>
                      <p className="text-purple-800">{version.metadata.resolution_action.replace(/_/g, ' ')}</p>
                    </div>
                  )}
                  {version.review_comment && (
                    <div>
                      <p className="font-semibold text-purple-900">Notes:</p>
                      <p className="text-purple-800">{version.review_comment}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Show field changes for regular versions */}
            {!isGovernanceEvent && !isConflictResolution && version.changed_fields && (() => {
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

            {/* Show decision details only for regular versions */}
            {!isGovernanceEvent && !isConflictResolution && (
            <div className="bg-gray-50 rounded p-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Title</p>
                  <p className="font-medium text-gray-900">{version.title || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Category</p>
                  <p className="text-gray-700">{version.category || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Lifecycle</p>
                  {version.lifecycle ? (
                  <span className={`px-2 py-1 text-xs rounded ${
                    version.lifecycle === 'STABLE' ? 'bg-teal-100 text-teal-700' :
                    version.lifecycle === 'UNDER_REVIEW' ? 'bg-blue-100 text-blue-700' :
                    version.lifecycle === 'AT_RISK' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {version.lifecycle}
                  </span>
                  ) : <p className="text-gray-700">N/A</p>}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Health Signal</p>
                  <p className="text-gray-700">{version.health_signal !== null && version.health_signal !== undefined ? `${version.health_signal}%` : 'N/A'}</p>
                </div>
              </div>
              {version.description && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-1">Description</p>
                  <p className="text-gray-700">{version.description}</p>
                </div>
              )}
            </div>
            )}

            {(version.user_email || version.changed_by_email) && (
              <p className="text-xs text-gray-500 mt-2">
                {isGovernanceEvent ? 'By' : 'Changed by'}: {version.user_email || version.changed_by_email}
              </p>
            )}
          </div>
        )})}
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
