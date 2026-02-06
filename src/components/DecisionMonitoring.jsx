import React, { useState } from 'react';
import { Search, ChevronDown, MoreVertical, Plus } from 'lucide-react';
import DecisionDetailPanel from './DecisionDetailPanel';

const DecisionMonitoring = () => {
    const [selectedDecision, setSelectedDecision] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Sample decision data
    const decisions = [
        {
            id: 1,
            name: 'Launch EU Expansion',
            health: 'At Risk',
            healthColor: 'bg-status-red',
            impact: 'High',
            dependencies: 'Vendor reliability',
            lastReview: '21 days ago',
            context: 'Expand market presence across Europe before Q4 to capture enterprise demand and strengthen international positioning.',
            assumptions: [
                { id: 1, text: 'Vendor can support scale', status: 'Stable', statusColor: 'bg-status-green' },
                { id: 2, text: 'Regulatory approval expected', status: 'Watching', statusColor: 'bg-status-orange' },
                { id: 3, text: 'Hiring pipeline ready', status: 'Broken', statusColor: 'bg-status-red' }
            ],
            signals: [
                { id: 1, date: 'May 12', text: 'Vendor reported delays' },
                { id: 2, date: 'May 18', text: 'Budget revised' },
                { id: 3, date: 'June 2', text: 'Regulatory review pending' }
            ],
            healthTrend: ['Stable', 'Watching', 'Uncertain', 'At Risk'],
            owner: 'Strategy Team'
        },
        {
            id: 2,
            name: 'Expand Data Center',
            health: 'Uncertain',
            healthColor: 'bg-status-orange',
            impact: 'High',
            dependencies: 'Budget Approval',
            lastReview: '3 days ago',
            context: 'Scale infrastructure to support growing user base and ensure 99.9% uptime.',
            assumptions: [
                { id: 1, text: 'Budget approved by Q3', status: 'Watching', statusColor: 'bg-status-orange' },
                { id: 2, text: 'Vendor capacity available', status: 'Stable', statusColor: 'bg-status-green' }
            ],
            signals: [
                { id: 1, date: 'May 20', text: 'Budget committee meeting scheduled' },
                { id: 2, date: 'May 25', text: 'Vendor confirmed availability' }
            ],
            healthTrend: ['Stable', 'Stable', 'Watching', 'Uncertain'],
            owner: 'Infrastructure Team'
        },
        {
            id: 3,
            name: 'Accelerate Hiring Plan',
            health: 'Watching',
            healthColor: 'bg-status-orange',
            impact: 'Medium',
            dependencies: 'Managers Plans',
            lastReview: '9 days ago',
            context: 'Increase hiring velocity to meet Q3 product roadmap commitments.',
            assumptions: [
                { id: 1, text: 'Candidate pipeline strong', status: 'Watching', statusColor: 'bg-status-orange' },
                { id: 2, text: 'Manager bandwidth available', status: 'Stable', statusColor: 'bg-status-green' }
            ],
            signals: [
                { id: 1, date: 'May 15', text: 'Pipeline review completed' },
                { id: 2, date: 'May 22', text: 'Hiring targets adjusted' }
            ],
            healthTrend: ['Stable', 'Stable', 'Watching', 'Watching'],
            owner: 'HR Team'
        },
        {
            id: 4,
            name: 'Migrate Payment System',
            health: 'Stable',
            healthColor: 'bg-status-green',
            impact: 'Medium',
            dependencies: 'Timescap Migration',
            lastReview: '14 days ago',
            context: 'Modernize payment infrastructure to reduce transaction costs and improve reliability.',
            assumptions: [
                { id: 1, text: 'Migration timeline realistic', status: 'Stable', statusColor: 'bg-status-green' },
                { id: 2, text: 'No customer disruption', status: 'Stable', statusColor: 'bg-status-green' }
            ],
            signals: [
                { id: 1, date: 'May 10', text: 'Phase 1 completed successfully' },
                { id: 2, date: 'May 18', text: 'Testing phase initiated' }
            ],
            healthTrend: ['Stable', 'Stable', 'Stable', 'Stable'],
            owner: 'Payments Team'
        },
        {
            id: 5,
            name: 'Switch Vendor',
            health: 'Stable',
            healthColor: 'bg-status-green',
            impact: 'Medium',
            dependencies: '--',
            lastReview: '9 days ago',
            context: 'Transition to new vendor to reduce costs and improve service quality.',
            assumptions: [
                { id: 1, text: 'Vendor transition smooth', status: 'Stable', statusColor: 'bg-status-green' }
            ],
            signals: [
                { id: 1, date: 'May 5', text: 'Contract signed' },
                { id: 2, date: 'May 12', text: 'Onboarding started' }
            ],
            healthTrend: ['Stable', 'Stable', 'Stable', 'Stable'],
            owner: 'Operations Team'
        },
        {
            id: 6,
            name: 'Open New Regional Office',
            health: 'Stable',
            healthColor: 'bg-status-green',
            impact: 'Medium',
            dependencies: 'Infrastructure...',
            lastReview: '16 days ago',
            context: 'Establish regional presence to better serve local customers and expand market reach.',
            assumptions: [
                { id: 1, text: 'Real estate available', status: 'Stable', statusColor: 'bg-status-green' },
                { id: 2, text: 'Local hiring feasible', status: 'Stable', statusColor: 'bg-status-green' }
            ],
            signals: [
                { id: 1, date: 'April 28', text: 'Location scouting completed' },
                { id: 2, date: 'May 8', text: 'Lease negotiations started' }
            ],
            healthTrend: ['Stable', 'Stable', 'Stable', 'Stable'],
            owner: 'Expansion Team'
        }
    ];

    const statusCounts = {
        needsAttention: decisions.filter(d => d.health === 'At Risk').length,
        stable: decisions.filter(d => d.health === 'Stable').length,
        watching: decisions.filter(d => d.health === 'Watching').length,
        uncertain: decisions.filter(d => d.health === 'Uncertain').length,
        risk: decisions.filter(d => d.health === 'At Risk').length
    };

    const getHealthBadgeClasses = (health) => {
        switch (health) {
            case 'At Risk':
                return 'bg-red-100 text-status-red border border-red-200';
            case 'Uncertain':
                return 'bg-orange-100 text-status-orange border border-orange-200';
            case 'Watching':
                return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
            case 'Stable':
                return 'bg-green-100 text-status-green border border-green-200';
            default:
                return 'bg-gray-100 text-neutral-gray-600 border border-gray-200';
        }
    };

    return (
        <div className="flex h-screen bg-neutral-white overflow-hidden">
            {/* Main Content */}
            <div className={`flex-1 h-screen flex flex-col overflow-hidden transition-all duration-300 ${selectedDecision ? 'mr-0' : ''}`}>
                <div className="flex-1 overflow-y-auto">
                    <div className="p-8">
                        {/* Header */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h1 className="text-3xl font-bold text-neutral-black mb-2">Decision Monitoring</h1>
                                    <p className="text-neutral-gray-600">Track, review, and manage critical organizational decisions.</p>
                                </div>
                                <button className="px-6 py-3 bg-primary-blue text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2">
                                    <Plus size={20} />
                                    New Decision
                                </button>
                            </div>
                        </div>

                        {/* Status Summary */}
                        <div className="flex items-center gap-6 mb-6 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-status-red"></div>
                                <span className="text-neutral-gray-700">Needs Attention: <span className="font-semibold">{statusCounts.needsAttention}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-status-green"></div>
                                <span className="text-neutral-gray-700">Stable: <span className="font-semibold">{statusCounts.stable}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-status-orange"></div>
                                <span className="text-neutral-gray-700">Watching: <span className="font-semibold">{statusCounts.watching}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <span className="text-neutral-gray-700">Uncertain: <span className="font-semibold">{statusCounts.uncertain}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-status-red"></div>
                                <span className="text-neutral-gray-700">Risk: <span className="font-semibold">{statusCounts.risk}</span></span>
                            </div>
                        </div>

                        {/* Filters and Search */}
                        <div className="mb-6">
                            <div className="flex items-center gap-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-gray-400" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Search decisions..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-white border border-neutral-gray-300 rounded-xl focus:outline-none focus:border-primary-blue transition-colors"
                                    />
                                </div>
                                <button className="px-4 py-3 bg-white border border-neutral-gray-300 rounded-xl hover:border-primary-blue transition-colors flex items-center gap-2">
                                    <span className="text-neutral-gray-700">Status</span>
                                    <ChevronDown size={16} className="text-neutral-gray-500" />
                                </button>
                                <button className="px-4 py-3 bg-white border border-neutral-gray-300 rounded-xl hover:border-primary-blue transition-colors flex items-center gap-2">
                                    <span className="text-neutral-gray-700">Impact</span>
                                    <ChevronDown size={16} className="text-neutral-gray-500" />
                                </button>
                                <button className="px-4 py-3 bg-white border border-neutral-gray-300 rounded-xl hover:border-primary-blue transition-colors flex items-center gap-2">
                                    <span className="text-neutral-gray-700">Owner</span>
                                    <ChevronDown size={16} className="text-neutral-gray-500" />
                                </button>
                                <button className="p-3 bg-white border border-neutral-gray-300 rounded-xl hover:border-primary-blue transition-colors">
                                    <MoreVertical size={20} className="text-neutral-gray-500" />
                                </button>
                            </div>
                        </div>

                        {/* Decisions Table */}
                        <div className="bg-white rounded-xl border border-neutral-gray-200 overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-gray-200">
                                <h2 className="text-lg font-semibold text-neutral-black">All Active Decisions</h2>
                                <button className="p-1 hover:bg-neutral-gray-100 rounded">
                                    <MoreVertical size={20} className="text-neutral-gray-500" />
                                </button>
                            </div>

                            {/* Table Header */}
                            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-neutral-gray-50 border-b border-neutral-gray-200 text-sm font-semibold text-neutral-gray-700">
                                <div className="col-span-3">Decision</div>
                                <div className="col-span-2">Health</div>
                                <div className="col-span-2">Impact</div>
                                <div className="col-span-3">Dependencies</div>
                                <div className="col-span-2">Last Review</div>
                            </div>

                            {/* Table Body */}
                            <div className="divide-y divide-neutral-gray-200">
                                {decisions.map((decision) => (
                                    <div
                                        key={decision.id}
                                        onClick={() => setSelectedDecision(decision)}
                                        className={`grid grid-cols-12 gap-4 px-6 py-4 hover:bg-neutral-gray-50 cursor-pointer transition-colors border-l-4 ${selectedDecision?.id === decision.id ? 'bg-blue-50 border-l-primary-blue' : 'border-l-transparent'
                                            }`}
                                    >
                                        <div className="col-span-3">
                                            <span className="font-medium text-neutral-black">{decision.name}</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${getHealthBadgeClasses(decision.health)}`}>
                                                <div className={`w-2 h-2 rounded-full ${decision.healthColor}`}></div>
                                                {decision.health}
                                            </span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-neutral-gray-700">{decision.impact}</span>
                                        </div>
                                        <div className="col-span-3">
                                            <span className="text-neutral-gray-700">{decision.dependencies}</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-neutral-gray-600 text-sm">{decision.lastReview}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Signals Section */}
                            <div className="px-6 py-4 bg-neutral-gray-50 border-t border-neutral-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" className="w-4 h-4 rounded border-neutral-gray-300" />
                                        <span className="text-sm font-semibold text-neutral-gray-700">Signals</span>
                                    </div>
                                    <button className="p-1 hover:bg-neutral-gray-100 rounded">
                                        <MoreVertical size={16} className="text-neutral-gray-500" />
                                    </button>
                                </div>
                                <div className="space-y-2 ml-6">
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="w-2 h-2 rounded-full bg-neutral-gray-400"></div>
                                        <span className="text-neutral-gray-600">May 12:</span>
                                        <span className="text-neutral-gray-700">Vendor reported delays</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="w-2 h-2 rounded-full bg-neutral-gray-400"></div>
                                        <span className="text-neutral-gray-600">May 18:</span>
                                        <span className="text-neutral-gray-700">Budget revised</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="w-2 h-2 rounded-full bg-neutral-gray-400"></div>
                                        <span className="text-neutral-gray-600">June 2:</span>
                                        <span className="text-neutral-gray-700">Regulatory review pending</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Decision Detail Panel */}
            {selectedDecision && (
                <DecisionDetailPanel
                    decision={selectedDecision}
                    onClose={() => setSelectedDecision(null)}
                />
            )}
        </div>
    );
};

export default DecisionMonitoring;
