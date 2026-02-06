import React from 'react';
import { X, ChevronDown, ChevronRight, MoreVertical, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const DecisionDetailPanel = ({ decision, onClose }) => {
    if (!decision) return null;

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Stable':
                return <div className="w-2 h-2 rounded-full bg-status-green"></div>;
            case 'Watching':
                return <div className="w-2 h-2 rounded-full bg-status-orange"></div>;
            case 'Uncertain':
                return <div className="w-2 h-2 rounded-full bg-yellow-500"></div>;
            case 'Broken':
            case 'At Risk':
                return <div className="w-2 h-2 rounded-full bg-status-red"></div>;
            default:
                return <div className="w-2 h-2 rounded-full bg-neutral-gray-400"></div>;
        }
    };

    const getStatusBadgeClasses = (status) => {
        switch (status) {
            case 'Stable':
                return 'bg-green-100 text-status-green border border-green-200';
            case 'Watching':
                return 'bg-orange-100 text-status-orange border border-orange-200';
            case 'Uncertain':
                return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
            case 'Broken':
            case 'At Risk':
                return 'bg-red-100 text-status-red border border-red-200';
            default:
                return 'bg-gray-100 text-neutral-gray-600 border border-gray-200';
        }
    };

    const getTrendIcon = (current, previous) => {
        const statusOrder = { 'Stable': 0, 'Watching': 1, 'Uncertain': 2, 'At Risk': 3, 'Broken': 3 };
        const currentLevel = statusOrder[current] || 0;
        const previousLevel = statusOrder[previous] || 0;

        if (currentLevel > previousLevel) {
            return <TrendingDown size={14} className="text-status-red" />;
        } else if (currentLevel < previousLevel) {
            return <TrendingUp size={14} className="text-status-green" />;
        }
        return <Minus size={14} className="text-neutral-gray-400" />;
    };

    return (
        <div className="w-[480px] h-screen bg-white border-l border-neutral-gray-200 flex flex-col overflow-hidden shadow-xl">
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-gray-200 flex-shrink-0">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-neutral-black mb-2">{decision.name}</h2>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-neutral-gray-600">Health:</span>
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClasses(decision.health)}`}>
                                    {getStatusIcon(decision.health)}
                                    {decision.health}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-neutral-gray-600">•</span>
                                <span className="text-sm font-semibold text-neutral-gray-700">{decision.impact}</span>
                            </div>
                            <button className="ml-auto">
                                <ChevronDown size={20} className="text-neutral-gray-500" />
                            </button>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-gray-100 rounded-lg transition-colors">
                        <X size={20} className="text-neutral-gray-600" />
                    </button>
                </div>

                {/* Owner */}
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm text-neutral-gray-600">{decision.owner}</span>
                </div>

                {/* Health Trend */}
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-neutral-gray-700">Health Trend:</span>
                        <div className="flex items-center gap-1">
                            {decision.healthTrend.map((status, index) => (
                                <React.Fragment key={index}>
                                    {getStatusIcon(status)}
                                    {index < decision.healthTrend.length - 1 && (
                                        <ChevronRight size={12} className="text-neutral-gray-400" />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    <button className="px-4 py-2 bg-white border border-neutral-gray-300 rounded-lg hover:bg-neutral-gray-50 transition-colors text-sm font-medium text-neutral-gray-700">
                        Review
                    </button>
                    <button className="px-4 py-2 bg-white border border-neutral-gray-300 rounded-lg hover:bg-neutral-gray-50 transition-colors text-sm font-medium text-neutral-gray-700">
                        Update
                    </button>
                    <button className="px-4 py-2 bg-white border border-neutral-gray-300 rounded-lg hover:bg-neutral-gray-50 transition-colors text-sm font-medium text-neutral-gray-700">
                        Archive
                    </button>
                    <button className="p-2 hover:bg-neutral-gray-100 rounded-lg transition-colors ml-auto">
                        <MoreVertical size={20} className="text-neutral-gray-500" />
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="px-6 py-6 space-y-6">
                    {/* Context Section */}
                    <div>
                        <h3 className="text-lg font-semibold text-neutral-black mb-3">Context</h3>
                        <p className="text-neutral-gray-700 leading-relaxed">{decision.context}</p>
                    </div>

                    {/* Key Assumptions Section */}
                    <div>
                        <h3 className="text-lg font-semibold text-neutral-black mb-3">Key Assumptions</h3>
                        <div className="space-y-3">
                            {decision.assumptions.map((assumption) => (
                                <div
                                    key={assumption.id}
                                    className="flex items-center justify-between p-3 bg-neutral-gray-50 rounded-lg hover:bg-neutral-gray-100 transition-colors cursor-pointer group"
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        {getStatusIcon(assumption.status)}
                                        <span className="text-neutral-gray-700">{assumption.text}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClasses(assumption.status)}`}>
                                            {assumption.status}
                                        </span>
                                        <ChevronRight size={16} className="text-neutral-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Signals Section */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-neutral-black">Signals</h3>
                            <button className="p-1 hover:bg-neutral-gray-100 rounded">
                                <MoreVertical size={16} className="text-neutral-gray-500" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            {decision.signals.map((signal) => (
                                <div key={signal.id} className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-neutral-gray-400 mt-2"></div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-neutral-gray-700">{signal.date}:</span>
                                            <span className="text-sm text-neutral-gray-700">{signal.text}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Dependencies Section */}
                    {decision.dependencies !== '--' && (
                        <div>
                            <h3 className="text-lg font-semibold text-neutral-black mb-3">Dependencies</h3>
                            <div className="p-3 bg-neutral-gray-50 rounded-lg">
                                <span className="text-neutral-gray-700">{decision.dependencies}</span>
                            </div>
                        </div>
                    )}

                    {/* Last Review */}
                    <div>
                        <h3 className="text-lg font-semibold text-neutral-black mb-3">Last Review</h3>
                        <div className="p-3 bg-neutral-gray-50 rounded-lg">
                            <span className="text-neutral-gray-700">{decision.lastReview}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DecisionDetailPanel;
