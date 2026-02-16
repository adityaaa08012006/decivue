import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Clock, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { decisionTemplates, getHealthConfig, getAssumptionConfig } from '../utils/organizationTemplates';
import Aurora from './Aurora';
import ClickSpark from './ClickSpark';
import Squares from './Squares';

const TemplatePreview = ({ orgType, onContinue, onBack }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [expandedDecision, setExpandedDecision] = useState(null);
  const templates = decisionTemplates[orgType.id] || [];

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const toggleExpanded = (decisionId) => {
    setExpandedDecision(expandedDecision === decisionId ? null : decisionId);
  };

  return (
    <ClickSpark
      sparkColor='#3b82f6'
      sparkSize={14}
      sparkRadius={25}
      sparkCount={8}
      duration={400}
    >
    <div className="org-selector-page fixed inset-0 z-50 overflow-y-auto">
      {/* Animated Squares Background */}
      <div className="fixed inset-0 z-0">
        <Squares
          speed={0.28}
          squareSize={40}
          direction="diagonal"
          borderColor="rgba(59, 130, 246, 0.4)"
          hoverFillColor="rgba(59, 130, 246, 0.2)"
        />
      </div>
      
      {/* Aurora Animated Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#f8faff] via-[#f0f4ff] to-[#fafbff] opacity-70">
        <Aurora
          colorStops={["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"]}
          amplitude={0.5}
          blend={0.35}
        />
      </div>
      
      {/* Subtle overlay for depth */}
      <div className="fixed inset-0 bg-white/20 pointer-events-none" />
      
      {/* Subtle Noise Texture Overlay */}
      <div className="fixed inset-0 noise-texture pointer-events-none" />

      <div className="relative min-h-screen px-6 py-12">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="absolute top-8 left-8 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Change Organization</span>
        </button>

        <div className={`max-w-6xl mx-auto transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Header */}
          <div className="text-center mb-12 mt-16">
            <div className="inline-block mb-4">
              <div className="text-[#1d4ed8] font-semibold text-sm tracking-wider uppercase flex items-center gap-2 justify-center">
                <div className="w-8 h-[1px] bg-[#1d4ed8]" />
                Step 2 of 2
                <div className="w-8 h-[1px] bg-[#1d4ed8]" />
              </div>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              See How Decivue Works for {orgType.name}
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Here are example decisions your team might track. Each decision has assumptions that are monitored for validity over time.
            </p>

            {/* Info Banner */}
            <div className="inline-flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-6 py-3 text-sm text-blue-800">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="font-medium">These are example templates — you'll create your own decisions after signing up</span>
            </div>
          </div>

          {/* Decision Cards */}
          <div className="space-y-4 mb-12">
            {templates.map((decision, index) => {
              const healthConfig = getHealthConfig(decision.health);
              const isExpanded = expandedDecision === decision.id;
              
              return (
                <div
                  key={decision.id}
                  className={`bg-white/90 backdrop-blur-sm rounded-[20px] border border-gray-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 overflow-hidden ${
                    isExpanded ? 'ring-2 ring-[#1d4ed8]/20' : ''
                  }`}
                  style={{
                    animationDelay: `${index * 100}ms`
                  }}
                >
                  {/* Decision Header */}
                  <button
                    onClick={() => toggleExpanded(decision.id)}
                    className="w-full p-6 text-left hover:bg-white/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">
                            {decision.title}
                          </h3>
                          <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${healthConfig.bgColor} ${healthConfig.color} ${healthConfig.borderColor}`}>
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${healthConfig.dotColor} mr-1.5`} />
                            {healthConfig.label}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-3">
                          {decision.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span>Created {decision.createdDays} days ago</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span>Review in {decision.expiryDays} days</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-gray-700">{decision.assumptions.length} assumptions</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Assumptions */}
                  {isExpanded && (
                    <div className="border-t border-gray-200/60 bg-gradient-to-b from-gray-50/30 to-white/50 p-6 animate-fade-in">
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                          Key Assumptions
                        </h4>
                        <div className="space-y-2">
                          {decision.assumptions.map((assumption, idx) => {
                            const config = getAssumptionConfig(assumption.status);
                            
                            return (
                              <div
                                key={idx}
                                className="flex items-start gap-3 bg-white/80 rounded-xl p-4 border border-gray-200/60 shadow-sm"
                              >
                                <span className={`text-lg ${config.color}`}>
                                  {config.icon}
                                </span>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-gray-900 font-medium">
                                      {assumption.text}
                                    </span>
                                    <span className={`text-xs font-semibold ${config.color} whitespace-nowrap`}>
                                      {config.label}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Mock Insight */}
                      {decision.health === 'at-risk' && (
                        <div className="bg-yellow-50/80 backdrop-blur-sm border border-yellow-200/60 rounded-xl p-4 flex items-start gap-3 shadow-sm">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold text-yellow-900 mb-1">Assumption Needs Review</div>
                            <div className="text-sm text-yellow-800">
                              One or more assumptions are aging and should be validated with your team.
                            </div>
                          </div>
                        </div>
                      )}
                      {decision.health === 'critical' && (
                        <div className="bg-red-50/80 backdrop-blur-sm border border-red-200/60 rounded-xl p-4 flex items-start gap-3 shadow-sm">
                          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold text-red-900 mb-1">Invalid Assumption Detected</div>
                            <div className="text-sm text-red-800">
                              An assumption has been invalidated. This decision may need urgent review.
                            </div>
                          </div>
                        </div>
                      )}
                      {decision.health === 'stable' && (
                        <div className="bg-emerald-50/80 backdrop-blur-sm border border-emerald-200/60 rounded-xl p-4 flex items-start gap-3 shadow-sm">
                          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold text-emerald-900 mb-1">All Assumptions Valid</div>
                            <div className="text-sm text-emerald-800">
                              This decision is in good health. Continue monitoring until review date.
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* CTA Section */}
          <div className="text-center py-12 mb-8">
            <div className="relative inline-block">
              {/* Glow Effect */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#8fa7ff]/20 rounded-full blur-[100px] pointer-events-none" />
              
              <div className="relative z-10 space-y-6">
                <h2 className="text-3xl font-bold text-gray-900">
                  Ready to track your team's decisions?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Sign up now and start making data-driven decisions with confidence.
                </p>
                
                <div className="pt-4">
                  <button
                    onClick={onContinue}
                    className="group relative px-12 py-5 bg-[#1d4ed8] text-white text-lg font-semibold rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-blue-glow-lg hover:scale-[1.05] hover:bg-[#1e40af]"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      Create Your Account
                      <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#1d4ed8] to-[#3b82f6] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>

                <p className="text-sm text-gray-500">
                  No credit card required · Start with free templates
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ClickSpark>
  );
};

export default TemplatePreview;
