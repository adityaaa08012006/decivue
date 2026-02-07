import React, { useState, useEffect } from 'react';
import {
    GitCommit,
    Activity,
    AlertTriangle,
    MessageSquare,
    ArrowRight,
    Zap,
    Clock,
    Filter
} from 'lucide-react';
import api from '../services/api';

const EventCard = ({ event, isLast }) => {
    const [expanded, setExpanded] = useState(false);
    const [details, setDetails] = useState(null);
    const [dependencies, setDependencies] = useState({ dependsOn: [], blocks: [] });
    const [loadingDetails, setLoadingDetails] = useState(false);

    const handleExpand = async () => {
        setExpanded(!expanded);
        if (!expanded && !details && event.decisionId) {
            setLoadingDetails(true);
            try {
                const [decisionData, depData] = await Promise.all([
                    api.getDecision(event.decisionId),
                    api.getDependencies(event.decisionId)
                ]);
                setDetails(decisionData);
                setDependencies(depData);
            } catch (err) {
                console.error("Failed to load details", err);
            } finally {
                setLoadingDetails(false);
            }
        }
    };

    const getTypeStyles = (type) => {
        switch (type) {
            case 'DECISION_CREATED': return { icon: GitCommit, color: 'text-primary-blue bg-blue-50', border: 'border-l-4 border-l-primary-blue' };
            case 'LIFECYCLE_CHANGE': return { icon: Activity, color: 'text-purple-600 bg-purple-50', border: 'border-l-4 border-l-purple-500' };
            case 'HEALTH_CHANGE': return { icon: Zap, color: 'text-orange-500 bg-orange-50', border: 'border-l-4 border-l-orange-400' };
            case 'SIGNAL': return { icon: MessageSquare, color: 'text-neutral-gray-600 bg-gray-50', border: 'border-l-4 border-l-gray-300' };
            default: return { icon: Clock, color: 'text-gray-500', border: 'border-l-4 border-gray-300' };
        }
    };

    const styles = getTypeStyles(event.type);
    const Icon = styles.icon;

    return (
        <div className="flex gap-4 relative">
            {/* Timeline Line */}
            {!isLast && (
                <div className="absolute left-5 top-10 bottom-[-2rem] w-0.5 bg-neutral-gray-200" />
            )}

            {/* Node */}
            <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${styles.color}`}>
                <Icon size={18} strokeWidth={2.5} />
            </div>

            {/* Card */}
            <div
                onClick={handleExpand}
                className={`flex-1 mb-8 cursor-pointer transition-all duration-300 ease-in-out group`}
            >
                <div className={`bg-white rounded-xl border border-neutral-gray-200 shadow-sm hover:shadow-md overflow-hidden ${styles.border} transition-all`}>

                    {/* Header */}
                    <div className="p-4 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-neutral-gray-500 uppercase tracking-wider">{event.decisionTitle}</span>
                                <span className="text-neutral-gray-300">•</span>
                                <span className="text-xs text-neutral-gray-400">{new Date(event.timestamp).toLocaleDateString()}</span>
                            </div>
                            <h3 className="text-base font-semibold text-neutral-black">{event.title}</h3>
                        </div>

                        <div className={`transform transition-transform duration-300 ${expanded ? 'rotate-90' : 'text-neutral-gray-300 group-hover:text-primary-blue'}`}>
                            <ArrowRight size={18} />
                        </div>
                    </div>

                    {/* Expanded Content */}
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expanded ? 'max-h-[600px] opacity-100 border-t border-neutral-gray-100' : 'max-h-0 opacity-0'}`}>
                        <div className="p-4 bg-neutral-gray-50">
                            <p className="text-neutral-gray-700 text-sm leading-relaxed mb-4">
                                {event.description}
                            </p>

                            {loadingDetails ? (
                                <div className="flex items-center gap-2 text-sm text-neutral-gray-400 animate-pulse">
                                    <Activity size={14} /> Loading dependencies...
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Existing Metadata */}
                                    {event.type === 'LIFECYCLE_CHANGE' && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <span className="px-2 py-1 rounded bg-neutral-gray-200 text-neutral-gray-600 font-medium">{event.metadata.from}</span>
                                            <ArrowRight size={14} className="text-neutral-gray-400" />
                                            <span className="px-2 py-1 rounded bg-primary-blue/10 text-primary-blue font-bold">{event.metadata.to}</span>
                                        </div>
                                    )}

                                    {event.metadata?.impact && (
                                        <div className="mt-3">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${event.metadata.impact === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {event.metadata.impact} IMPACT
                                            </span>
                                        </div>
                                    )}

                                    {/* Dependencies Section */}
                                    {(dependencies?.blockedBy?.length > 0 || dependencies?.blocking?.length > 0) && (
                                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-neutral-gray-200">
                                            {/* Blocked By (Upstream) - I depend on them */}
                                            {dependencies.blockedBy.length > 0 && (
                                                <div>
                                                    <h4 className="text-xs font-bold text-red-500 uppercase mb-2 flex items-center gap-1">
                                                        <AlertTriangle size={12} /> Blocked By
                                                    </h4>
                                                    <div className="flex flex-col gap-2">
                                                        {dependencies.blockedBy.map(dep => (
                                                            <div key={dep.id} className="p-2 bg-white border border-red-100 rounded shadow-sm text-xs border-l-2 border-l-red-400">
                                                                {dep.decisions.title}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Blocking (Downstream) - They depend on me */}
                                            {dependencies.blocking.length > 0 && (
                                                <div>
                                                    <h4 className="text-xs font-bold text-orange-500 uppercase mb-2 flex items-center gap-1">
                                                        <Activity size={12} /> Blocking
                                                    </h4>
                                                    <div className="flex flex-col gap-2">
                                                        {dependencies.blocking.map(dep => (
                                                            <div key={dep.id} className="p-2 bg-white border border-orange-100 rounded shadow-sm text-xs border-l-2 border-l-orange-400">
                                                                {dep.decisions.title}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* No Dependencies Empty State */}
                                    {(!dependencies?.blockedBy?.length && !dependencies?.blocking?.length && event.decisionId) && (
                                        <div className="text-xs text-neutral-gray-400 italic mt-2">
                                            No dependencies linked.
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

const DecisionFlow = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTimeline();
    }, []);

    const fetchTimeline = async () => {
        try {
            const data = await api.getTimeline();
            setEvents(data || []);
        } catch (err) {
            console.error("Failed to fetch timeline", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-neutral-white overflow-hidden">
            <div className="flex-1 flex flex-col h-full overflow-y-auto">
                <div className="max-w-3xl mx-auto w-full p-8">

                    {/* Page Header */}
                    <div className="mb-10">
                        <h1 className="text-3xl font-bold text-neutral-black mb-1">Decision Flow</h1>
                        <p className="text-neutral-gray-600">Organizational memory stream & evolution.</p>
                    </div>

                    {/* Filters Bar (Visual Only for now) */}
                    <div className="flex items-center gap-3 mb-8 pb-4 border-b border-neutral-gray-200 overflow-x-auto">
                        <button className="flex items-center gap-2 px-3 py-1.5 bg-neutral-black text-white rounded-lg text-sm font-medium">All Events</button>
                        <button className="flex items-center gap-2 px-3 py-1.5 bg-white text-neutral-gray-600 border border-neutral-gray-200 rounded-lg text-sm hover:bg-neutral-gray-50">
                            <GitCommit size={14} /> Created
                        </button>
                        <button className="flex items-center gap-2 px-3 py-1.5 bg-white text-neutral-gray-600 border border-neutral-gray-200 rounded-lg text-sm hover:bg-neutral-gray-50">
                            <Activity size={14} /> Lifecycle
                        </button>
                        <button className="flex items-center gap-2 px-3 py-1.5 bg-white text-neutral-gray-600 border border-neutral-gray-200 rounded-lg text-sm hover:bg-neutral-gray-50">
                            <Zap size={14} /> Signals
                        </button>
                    </div>

                    {/* The Stream */}
                    <div className="pl-4">
                        {loading ? (
                            <div className="text-center py-20 text-neutral-gray-500 animate-pulse">Loading stream...</div>
                        ) : events.length === 0 ? (
                            <div className="text-center py-20 bg-neutral-gray-50 rounded-2xl border border-dashed border-neutral-gray-300">
                                <p className="text-neutral-gray-600 font-medium">No timeline events yet.</p>
                                <p className="text-sm text-neutral-gray-400 mt-1">Create a decision or add a signal to see the stream flow.</p>
                            </div>
                        ) : (
                            events.map((event, idx) => (
                                <EventCard key={event.id} event={event} isLast={idx === events.length - 1} />
                            ))
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default DecisionFlow;
