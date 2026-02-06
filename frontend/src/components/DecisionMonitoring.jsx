import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  TrendingDown,
  Link2,
  Target,
  Shield,
  Activity,
  RefreshCw
} from 'lucide-react';
import api from '../services/api';

const DecisionMonitoring = () => {
  const [decisions, setDecisions] = useState([]);
  const [expandedDecision, setExpandedDecision] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Store related data for each decision
  const [decisionData, setDecisionData] = useState({});

  useEffect(() => {
    fetchDecisions();
  }, []);

  // Fetch additional data when a decision is expanded
  useEffect(() => {
    if (expandedDecision) {
      fetchDecisionDetails(expandedDecision);
    }
  }, [expandedDecision]);

  const fetchDecisions = async () => {
    try {
      setLoading(true);
      const data = await api.getDecisions();
      setDecisions(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch decisions:', err);
      setError('Failed to load decisions. Please make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDecisionDetails = async (decisionId) => {
    try {
      // Fetch assumptions, dependencies, and constraints in parallel
      const [assumptions, dependencies, constraints] = await Promise.all([
        api.getAssumptions(decisionId).catch(() => []),
        api.getDependencies(decisionId).catch(() => ({ dependsOn: [], blocks: [] })),
        api.getConstraints(decisionId).catch(() => [])
      ]);

      setDecisionData(prev => ({
        ...prev,
        [decisionId]: {
          assumptions,
          dependencies,
          constraints
        }
      }));
    } catch (err) {
      console.error('Failed to fetch decision details:', err);
    }
  };

  // Derive effective lifecycle from health score to keep them in sync
  const getEffectiveLifecycle = (decision) => {
    const { health, lifecycle } = decision;
    
    // If manually set to RETIRED or INVALIDATED, respect that
    if (lifecycle === 'RETIRED' || lifecycle === 'INVALIDATED') {
      return lifecycle;
    }
    
    // Otherwise, sync with health
    if (health < 65) return 'AT_RISK';
    if (health < 85) return 'UNDER_REVIEW';
    return 'STABLE';
  };

  const getStatusColor = (lifecycle) => {
    switch (lifecycle) {
      case 'STABLE': return 'bg-teal-500 text-white';
      case 'UNDER_REVIEW': return 'bg-blue-500 text-white';
      case 'AT_RISK': return 'bg-orange-500 text-white';
      case 'INVALIDATED': return 'bg-red-500 text-white';
      case 'RETIRED': return 'bg-gray-400 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  const getHealthColor = (health) => {
    if (health >= 80) return 'text-teal-600';
    if (health >= 60) return 'text-orange-500';
    return 'text-red-500';
  };

  const getHealthBand = (health) => {
    if (health >= 85) return { label: 'Good', color: 'bg-teal-500', textColor: 'text-teal-700' };
    if (health >= 65) return { label: 'Needs review', color: 'bg-amber-400', textColor: 'text-amber-700' };
    return { label: 'At risk', color: 'bg-rose-500', textColor: 'text-rose-700' };
  };

  const getFreshnessBand = (freshness) => {
    if (freshness >= 85) return { label: 'Fresh', color: 'bg-teal-500', textColor: 'text-teal-700' };
    if (freshness >= 65) return { label: 'Needs review', color: 'bg-amber-400', textColor: 'text-amber-700' };
    return { label: 'Stale', color: 'bg-rose-500', textColor: 'text-rose-700' };
  };

  const getConsistencyBand = (consistency) => {
    if (consistency >= 85) return { label: 'On track', color: 'bg-teal-500', textColor: 'text-teal-700' };
    if (consistency >= 65) return { label: 'Minor drift', color: 'bg-amber-400', textColor: 'text-amber-700' };
    return { label: 'Needs attention', color: 'bg-rose-500', textColor: 'text-rose-700' };
  };

  const getDecayScore = (lastReviewedAt) => {
    const now = new Date();
    const lastReview = new Date(lastReviewedAt);
    const daysSinceReview = Math.floor((now - lastReview) / (1000 * 60 * 60 * 24));
    
    // Decay: 100% at 0 days, decreases by ~2% per day
    const decay = Math.max(0, Math.min(100, 100 - (daysSinceReview * 2)));
    return decay;
  };

  const getConsistencyScore = (health, lifecycle) => {
    // Simple consistency calculation based on health-lifecycle alignment
    if (lifecycle === 'STABLE' && health >= 80) return 95;
    if (lifecycle === 'UNDER_REVIEW' && health >= 60) return 80;
    if (lifecycle === 'AT_RISK' && health >= 40) return 65;
    return 50;
  };

  const getLifecycleStages = () => ['STABLE', 'UNDER_REVIEW', 'AT_RISK', 'INVALIDATED', 'RETIRED'];

  const calculateDrift = (health, decayScore) => {
    return Math.abs(health - decayScore);
  };

  const filteredDecisions = filterStatus === 'all' 
    ? decisions 
    : decisions.filter(d => {
        if (filterStatus === 'active') return d.lifecycle === 'STABLE';
        if (filterStatus === 'at-risk') return d.lifecycle === 'AT_RISK' || d.lifecycle === 'UNDER_REVIEW';
        if (filterStatus === 'deprecated') return d.lifecycle === 'INVALIDATED' || d.lifecycle === 'RETIRED';
        return true;
      });

  // Calculate counts for each filter status
  const getCountForStatus = (status) => {
    if (status === 'all') return decisions.length;
    if (status === 'active') return decisions.filter(d => d.lifecycle === 'STABLE').length;
    if (status === 'at-risk') return decisions.filter(d => d.lifecycle === 'AT_RISK' || d.lifecycle === 'UNDER_REVIEW').length;
    if (status === 'deprecated') return decisions.filter(d => d.lifecycle === 'INVALIDATED' || d.lifecycle === 'RETIRED').length;
    return 0;
  };

  const toggleExpand = (id) => {
    setExpandedDecision(expandedDecision === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-neutral-white p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Decision Monitoring</h1>
            <p className="text-gray-600">Keep track of how your decisions are doing</p>
          </div>
          <button
            onClick={fetchDecisions}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-sm"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2">
        {['all', 'active', 'at-risk', 'deprecated'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
              filterStatus === status
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
            <span className="ml-2 text-sm opacity-80">
              ({getCountForStatus(status)})
            </span>
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-500 mb-4"></div>
          <p className="text-gray-700">Loading your decisions...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 shadow-sm">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Decisions List */}
      {!loading && !error && (
        <div className="space-y-4">
          {filteredDecisions.map((decision) => {
            const effectiveLifecycle = getEffectiveLifecycle(decision);
            const decayScore = getDecayScore(decision.lastReviewedAt);
            const consistencyScore = getConsistencyScore(decision.health, decision.lifecycle);
            const drift = calculateDrift(decision.health, decayScore);
            
            return (
              <div
                key={decision.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
              >
                {/* Decision Header */}
                <div
                  className="p-6 cursor-pointer"
                  onClick={() => toggleExpand(decision.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-mono text-gray-500">{decision.id.slice(0, 8)}</span>
                        <span className={`px-3 py-1 rounded-md text-xs font-semibold ${getStatusColor(effectiveLifecycle)}`}>
                          {effectiveLifecycle.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-500">{effectiveLifecycle === 'STABLE' ? 'active' : effectiveLifecycle === 'RETIRED' ? 'deprecated' : 'planning'}</span>
                      </div>
                      <h3 className="text-xl font-semibold text-black mb-3">{decision.title}</h3>
                      
                      {/* Key Metrics - Feature 1, 5, 7 */}
                      <div className="flex gap-4 flex-wrap">
                        {/* Health Metric */}
                        <div 
                          className="flex items-center gap-2 cursor-help"
                          title={`Health: ${decision.health}%`}
                          aria-label={`Health ${decision.health}%`}
                        >
                          <Activity size={16} className={getHealthBand(decision.health).textColor} />
                          <span className="text-sm text-gray-700">
                            Health: <span className={`font-semibold ${getHealthBand(decision.health).textColor}`}>
                              {getHealthBand(decision.health).label}
                            </span>
                          </span>
                        </div>

                        {/* Freshness Metric */}
                        <div 
                          className="flex items-center gap-2 cursor-help"
                          title={`Freshness: ${decayScore}%`}
                          aria-label={`Freshness ${decayScore}%`}
                        >
                          <TrendingDown size={16} className={getFreshnessBand(decayScore).textColor} />
                          <span className="text-sm text-gray-700">
                            Freshness: <span className={`font-semibold ${getFreshnessBand(decayScore).textColor}`}>
                              {getFreshnessBand(decayScore).label}
                            </span>
                          </span>
                        </div>

                        {/* Consistency Metric */}
                        <div 
                          className="flex items-center gap-2 cursor-help"
                          title={`Consistency: ${consistencyScore}%`}
                          aria-label={`Consistency ${consistencyScore}%`}
                        >
                          <Target size={16} className={getConsistencyBand(consistencyScore).textColor} />
                          <span className="text-sm text-gray-700">
                            Consistency: <span className={`font-semibold ${getConsistencyBand(consistencyScore).textColor}`}>
                              {getConsistencyBand(consistencyScore).label}
                            </span>
                          </span>
                        </div>

                        {/* Drift Warning */}
                        {drift > 10 && (
                          <div className="flex items-center gap-2">
                            <AlertCircle size={16} className="text-orange-500" />
                            <span className="text-sm text-orange-600 font-semibold">
                              Drifting
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button className="text-gray-400 hover:text-blue-500 transition-colors">
                      {expandedDecision === decision.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </button>
                  </div>

                  {/* Quick Info */}
                  <div className="mt-4 flex gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} className="text-gray-400" />
                      Created: {new Date(decision.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} className="text-gray-400" />
                      Last Review: {new Date(decision.lastReviewedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedDecision === decision.id && (
                  <div className="border-t border-gray-200 bg-gray-50 p-6 space-y-6">
                    {/* Feature 1: Lifecycle Progress */}
                    <div>
                      <h4 className="font-semibold text-black mb-3 flex items-center gap-2">
                        <Activity size={18} className="text-blue-600" />
                        Lifecycle Stage
                      </h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        {['planning', 'implementation', 'active', 'review', 'deprecated'].map((stage, index) => {
                          const stageLower = decision.lifecycle.toLowerCase().replace('_', ' ');
                          const isCurrent = stageLower === stage || 
                                          (decision.lifecycle === 'STABLE' && stage === 'active') ||
                                          (decision.lifecycle === 'UNDER_REVIEW' && stage === 'review') ||
                                          (decision.lifecycle === 'RETIRED' && stage === 'deprecated');
                          const currentStageIndex = ['planning', 'implementation', 'active', 'review', 'deprecated'].indexOf(
                            decision.lifecycle === 'STABLE' ? 'active' :
                            decision.lifecycle === 'UNDER_REVIEW' ? 'review' :
                            decision.lifecycle === 'RETIRED' ? 'deprecated' :
                            decision.lifecycle === 'AT_RISK' ? 'review' :
                            'planning'
                          );
                          const isPast = index < currentStageIndex;
                          
                          return (
                            <React.Fragment key={stage}>
                              <div className={`px-4 py-2 rounded-lg text-xs font-medium ${
                                isCurrent 
                                  ? 'bg-blue-500 text-white' 
                                  : isPast 
                                  ? 'bg-teal-500 text-white' 
                                  : 'bg-white text-gray-400 border border-gray-200'
                              }`}>
                                {stage}
                              </div>
                              {index < 4 && (
                                <div className={`h-0.5 w-6 ${isPast || isCurrent ? 'bg-teal-400' : 'bg-gray-200'}`} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>

                    {/* Feature 2: Dependencies */}
                    <div>
                      <h4 className="font-semibold text-black mb-3 flex items-center gap-2">
                        <Link2 size={18} className="text-blue-600" />
                        Dependencies
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white border border-gray-200 p-4 rounded-lg">
                          <p className="text-xs text-gray-500 mb-2 font-medium">Depends On:</p>
                          {decisionData[decision.id]?.dependencies?.dependsOn?.length > 0 ? (
                            <div className="space-y-1">
                              {decisionData[decision.id].dependencies.dependsOn.map(dep => (
                                <div key={dep.id} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-mono">
                                  {dep.decisions?.title || dep.target_decision_id.slice(0, 8)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600">No dependencies</p>
                          )}
                        </div>
                        <div className="bg-white border border-gray-200 p-4 rounded-lg">
                          <p className="text-xs text-gray-500 mb-2 font-medium">Blocks:</p>
                          {decisionData[decision.id]?.dependencies?.blocks?.length > 0 ? (
                            <div className="space-y-1">
                              {decisionData[decision.id].dependencies.blocks.map(dep => (
                                <div key={dep.id} className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded font-mono">
                                  {dep.decisions?.title || dep.source_decision_id.slice(0, 8)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600">No dependencies</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Feature 3: Assumptions Tracking */}
                    <div>
                      <h4 className="font-semibold text-black mb-3 flex items-center gap-2">
                        <Shield size={18} className="text-blue-600" />
                        Assumptions
                      </h4>
                      
                      {/* Organizational Rules (Universal Assumptions) */}
                      {decisionData[decision.id]?.assumptions?.filter(a => a.scope === 'UNIVERSAL').length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Shield size={14} className="text-purple-600" />
                            <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">🌐 Universal Rules (Apply to all decisions)</p>
                          </div>
                          <div className="space-y-2">
                            {decisionData[decision.id].assumptions.filter(a => a.scope === 'UNIVERSAL').map(assumption => {
                              const isHolding = assumption.status === 'HOLDING';
                              const isShaky = assumption.status === 'SHAKY';
                              const isBroken = assumption.status === 'BROKEN';
                              const hasConflicts = assumption.conflicts && assumption.conflicts.length > 0;
                              
                              return (
                                <div key={assumption.id}>
                                  <div className={`border p-3 rounded-lg ${
                                    isBroken ? 'border-red-200 bg-red-50' : 
                                    isShaky ? 'border-orange-200 bg-orange-50' : 
                                    'bg-purple-50 border-purple-200'
                                  }`}>
                                    <div className="flex items-start gap-2">
                                      {isHolding ? (
                                        <CheckCircle size={16} className="text-purple-600 mt-0.5 flex-shrink-0" />
                                      ) : isShaky ? (
                                        <AlertCircle size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
                                      ) : (
                                        <XCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                                      )}
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-800">{assumption.description}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                          <span className={`text-xs font-semibold ${
                                            isHolding ? 'text-purple-600' : isShaky ? 'text-orange-600' : 'text-red-600'
                                          }`}>
                                            {isHolding ? '✓ Holding' : isShaky ? '⚠ Shaky' : '✗ Broken'}
                                          </span>
                                          <span className="text-xs text-purple-600 font-medium">🔒 Universal</span>
                                          {assumption.validated_at && (
                                            <span className="text-xs text-gray-500">
                                              Checked: {new Date(assumption.validated_at).toLocaleDateString()}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Show conflicts */}
                                    {hasConflicts && (
                                      <div className="mt-2 pt-2 border-t border-red-300">
                                        <div className="flex items-start gap-2 bg-red-100 p-2 rounded">
                                          <AlertCircle size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
                                          <div className="flex-1">
                                            <p className="text-xs font-semibold text-red-700">⚠️ Conflicts detected:</p>
                                            {assumption.conflicts.map(conflict => (
                                              <p key={conflict.conflict_id} className="text-xs text-red-600 mt-1">
                                                • Contradicts: "{conflict.conflicting_description}"
                                                <br />
                                                <span className="text-red-500 text-xs">Reason: {conflict.conflict_reason}</span>
                                              </p>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Decision-Specific Assumptions */}
                      {decisionData[decision.id]?.assumptions?.filter(a => a.scope === 'DECISION_SPECIFIC' || !a.scope).length > 0 ? (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Activity size={14} className="text-blue-600" />
                            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">📌 Decision-Specific</p>
                          </div>
                          <div className="space-y-2">
                            {decisionData[decision.id].assumptions
                              .filter(a => a.scope === 'DECISION_SPECIFIC' || !a.scope)
                              .map(assumption => {
                              const isHolding = assumption.status === 'HOLDING';
                              const isShaky = assumption.status === 'SHAKY';
                              const isBroken = assumption.status === 'BROKEN';
                              const hasConflicts = assumption.conflicts && assumption.conflicts.length > 0;
                              
                              return (
                                <div key={assumption.id}>
                                  <div className={`bg-white border p-3 rounded-lg ${
                                    isBroken ? 'border-red-200 bg-red-50' : 
                                    isShaky ? 'border-orange-200 bg-orange-50' : 
                                    'border-gray-200'
                                  }`}>
                                    <div className="flex items-start gap-2">
                                      {isHolding ? (
                                        <CheckCircle size={16} className="text-teal-600 mt-0.5 flex-shrink-0" />
                                      ) : isShaky ? (
                                        <AlertCircle size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
                                      ) : (
                                        <XCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                                      )}
                                      <div className="flex-1">
                                        <p className="text-sm text-gray-800">{assumption.description}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                          <span className={`text-xs font-semibold ${
                                            isHolding ? 'text-teal-600' : isShaky ? 'text-orange-600' : 'text-red-600'
                                          }`}>
                                            {isHolding ? '✓ Holding' : isShaky ? '⚠ Shaky' : '✗ Broken'}
                                          </span>
                                          {assumption.validated_at && (
                                            <span className="text-xs text-gray-500">
                                              Checked: {new Date(assumption.validated_at).toLocaleDateString()}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Show conflicts */}
                                    {hasConflicts && (
                                      <div className="mt-2 pt-2 border-t border-red-300">
                                        <div className="flex items-start gap-2 bg-red-100 p-2 rounded">
                                          <AlertCircle size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
                                          <div className="flex-1">
                                            <p className="text-xs font-semibold text-red-700">⚠️ Conflicts detected:</p>
                                            {assumption.conflicts.map(conflict => (
                                              <p key={conflict.conflict_id} className="text-xs text-red-600 mt-1">
                                                • Contradicts: "{conflict.conflicting_description}"
                                                <br />
                                                <span className="text-red-500 text-xs">Reason: {conflict.conflict_reason}</span>
                                              </p>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        !decisionData[decision.id]?.assumptions?.filter(a => a.scope === 'UNIVERSAL').length && (
                          <div className="bg-white border border-gray-200 p-4 rounded-lg">
                            <p className="text-sm text-gray-600">No assumptions tracked yet</p>
                          </div>
                        )
                      )}
                    </div>

                    {/* Feature 4: Conflicts */}
                    <div>
                      <h4 className="font-semibold text-black mb-3 flex items-center gap-2">
                        <AlertCircle size={18} className="text-orange-500" />
                        Any conflicts?
                      </h4>
                      {effectiveLifecycle === 'AT_RISK' ? (
                        <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                          <div className="flex items-start gap-2 text-orange-700">
                            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="text-sm font-medium">Decision at risk</span>
                              <p className="text-xs text-orange-600 mt-1">
                                This decision's health is degraded. Review assumptions and dependencies.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-teal-50 border border-teal-200 p-4 rounded-lg">
                          <div className="flex items-center gap-2 text-teal-700">
                            <CheckCircle size={16} />
                            <span className="text-sm font-medium">All clear! No conflicts found</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Feature 5: Time-based Decay Details */}
                    <div>
                      <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        <TrendingDown size={18} className="text-cyan-500" />
                        How fresh is this?
                      </h4>
                      <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">Days since last check:</span>
                          <span className="text-sm font-semibold text-slate-800">
                            {Math.floor((new Date() - new Date(decision.lastReviewedAt)) / (1000 * 60 * 60 * 24))} days
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">Status:</span>
                          <span 
                            className={`text-sm font-semibold ${getFreshnessBand(decayScore).textColor} cursor-help`}
                            title={`${decayScore}% fresh`}
                          >
                            {getFreshnessBand(decayScore).label}
                          </span>
                        </div>
                        <div 
                          className="w-full bg-slate-100 rounded-full h-3 overflow-hidden cursor-help"
                          title={`Freshness: ${decayScore}%`}
                          role="progressbar"
                          aria-label={`Freshness ${decayScore}%`}
                          aria-valuenow={decayScore}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        >
                          <div
                            className={`h-3 rounded-full transition-all ${
                              decayScore >= 80 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 
                              decayScore >= 60 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 
                              'bg-gradient-to-r from-rose-400 to-rose-500'
                            }`}
                            style={{ width: `${decayScore}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-2 bg-indigo-50 p-2 rounded-lg">
                          💡 Decisions get stale over time. Check them regularly to keep them healthy!
                        </p>
                      </div>
                    </div>

                    {/* Feature 6: Linked Cause (Mock data) */}
                    <div>
                      <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        <Target size={18} className="text-rose-500" />
                        Is this part of a bigger issue?
                      </h4>
                      <div className="bg-white border border-slate-200 p-4 rounded-xl">
                        {effectiveLifecycle === 'AT_RISK' || effectiveLifecycle === 'INVALIDATED' ? (
                          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                            <p className="text-sm text-amber-800 font-medium flex items-center gap-2">
                              <AlertCircle size={16} />
                              This might be connected to other problems
                            </p>
                            <p className="text-xs text-amber-700 mt-1">
                              Check related decisions to see if there's a common cause
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-emerald-700">
                            <CheckCircle size={16} />
                            <span className="text-sm">Looking good! No bigger issues spotted</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Feature 7: Consistency/Drift Details */}
                    <div>
                      <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        <Activity size={18} className="text-purple-500" />
                        Is this staying on track?
                      </h4>
                      <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">Status:</span>
                          <span 
                            className={`text-sm font-semibold ${getConsistencyBand(consistencyScore).textColor} cursor-help`}
                            title={`Consistency: ${consistencyScore}%`}
                          >
                            {getConsistencyBand(consistencyScore).label}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">Drift:</span>
                          <span 
                            className={`text-sm font-semibold ${drift > 10 ? 'text-amber-700' : 'text-emerald-700'} cursor-help`}
                            title={`${drift}% drift from expected`}
                          >
                            {drift > 10 ? 'Drifting' : 'Stable'}
                          </span>
                        </div>
                        {drift > 10 && (
                          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                            <p className="text-xs text-amber-800 flex items-center gap-2">
                              <AlertCircle size={14} />
                              Things are drifting a bit. Might want to take another look!
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    {decision.description && (
                      <div>
                        <h4 className="font-semibold text-slate-800 mb-3">What's this about?</h4>
                        <div className="bg-white border border-slate-200 p-4 rounded-xl">
                          <p className="text-sm text-slate-700 leading-relaxed">{decision.description}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredDecisions.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
          <Activity size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No decisions here yet</h3>
          <p className="text-gray-500">Try changing your filters or create your first decision!</p>
        </div>
      )}
    </div>
  );
};

export default DecisionMonitoring;
