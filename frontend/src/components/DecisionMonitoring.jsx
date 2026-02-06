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
              ({status === 'all' ? decisions.length : filteredDecisions.length})
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
                        <span className={`px-3 py-1 rounded-md text-xs font-semibold ${getStatusColor(decision.lifecycle)}`}>
                          {decision.lifecycle.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-500">{decision.lifecycle === 'STABLE' ? 'active' : decision.lifecycle === 'RETIRED' ? 'deprecated' : 'planning'}</span>
                      </div>
                      <h3 className="text-xl font-semibold text-black mb-3">{decision.title}</h3>
                      
                      {/* Key Metrics - Feature 1, 5, 7 */}
                      <div className="flex gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Activity size={16} className="text-teal-600" />
                          <span className="text-sm text-gray-700">
                            Health: <span className="font-semibold text-teal-600">{decision.health}%</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingDown size={16} className={getHealthColor(decayScore)} />
                          <span className="text-sm text-gray-700">
                            Decay: <span className={`font-semibold ${getHealthColor(decayScore)}`}>{decayScore}%</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Target size={16} className="text-blue-600" />
                          <span className="text-sm text-gray-700">
                            Consistency: <span className="font-semibold text-blue-600">{consistencyScore}%</span>
                          </span>
                        </div>
                        {drift > 10 && (
                          <div className="flex items-center gap-2">
                            <AlertCircle size={16} className="text-orange-500" />
                            <span className="text-sm text-orange-600 font-semibold">
                              Drift: {drift}%
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
                        Assumptions Tracking
                      </h4>
                      {decisionData[decision.id]?.assumptions?.length > 0 ? (
                        <div className="space-y-2">
                          {decisionData[decision.id].assumptions.map(assumption => {
                            const confidence = assumption.metadata?.confidence || 0;
                            const isValid = assumption.status === 'VALID';
                            const isUnknown = assumption.status === 'UNKNOWN';
                            
                            return (
                              <div key={assumption.id} className="bg-white border border-gray-200 p-3 rounded-lg">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-start gap-2 flex-1">
                                    {isValid ? (
                                      <CheckCircle size={16} className="text-teal-600 mt-0.5 flex-shrink-0" />
                                    ) : isUnknown ? (
                                      <AlertCircle size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
                                    ) : (
                                      <XCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                                    )}
                                    <p className="text-sm text-gray-800">{assumption.description}</p>
                                  </div>
                                  {assumption.validated_at && (
                                    <span className="text-xs text-gray-500">
                                      Checked: {new Date(assumption.validated_at).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full ${
                                        isValid ? 'bg-teal-500' : isUnknown ? 'bg-orange-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${confidence}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-semibold text-gray-600">{confidence}% confidence</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-white border border-gray-200 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">No assumptions tracked yet</p>
                        </div>
                      )}
                    </div>

                    {/* Feature 4: Conflicts */}
                    <div>
                      <h4 className="font-semibold text-black mb-3 flex items-center gap-2">
                        <AlertCircle size={18} className="text-orange-500" />
                        Any conflicts?
                      </h4>
                      {decision.lifecycle === 'AT_RISK' ? (
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
                          <span className="text-sm text-slate-600">Freshness:</span>
                          <span className={`text-sm font-semibold ${getHealthColor(decayScore)}`}>{decayScore}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
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
                        {decision.lifecycle === 'AT_RISK' || decision.lifecycle === 'INVALIDATED' ? (
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
                          <span className="text-sm text-slate-600">Overall health:</span>
                          <span className="text-sm font-semibold text-purple-700">{consistencyScore}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">Drift from expected:</span>
                          <span className={`text-sm font-semibold ${drift > 10 ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {drift}%
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

                    {/* Feature 8: Organizational Facts */}
                    <div>
                      <h4 className="font-semibold text-black mb-3 flex items-center gap-2">
                        <Shield size={18} className="text-blue-600" />
                        Organizational Facts Compliance
                      </h4>
                      <div className="bg-white border border-gray-200 p-4 rounded-lg space-y-2">
                        {decisionData[decision.id]?.constraints?.length > 0 ? (
                          decisionData[decision.id].constraints.map(constraint => (
                            <div key={constraint.id} className="flex items-start gap-2 bg-teal-50 p-3 rounded-lg">
                              <CheckCircle size={16} className="text-teal-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-teal-700">{constraint.name}</p>
                                <p className="text-sm text-gray-800">{constraint.description}</p>
                                {constraint.is_immutable && (
                                  <span className="text-xs text-gray-500 italic mt-1 block">Immutable</span>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-600">No organizational constraints defined</p>
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
