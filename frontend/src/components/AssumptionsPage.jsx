import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, Plus, AlertCircle, TrendingUp, RefreshCw, Link2, Trash2, CheckCircle, XCircle, X } from 'lucide-react';
import api from '../services/api';

const AssumptionsPage = () => {
    const [activeTab, setActiveTab] = useState('all'); // all, organizational, decision
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }
    const [deleteConfirmation, setDeleteConfirmation] = useState(null); // { id, description, type }

    // Data State
    const [assumptions, setAssumptions] = useState([]);
    const [decisions, setDecisions] = useState([]); // For linking in modal
    const [loading, setLoading] = useState(true);

    // Form State
    const [newAssumptionType, setNewAssumptionType] = useState(null); // 'organizational' | 'decision'
    const [formData, setFormData] = useState({ description: '', linkToDecisionId: '' });

    useEffect(() => {
        fetchData();
    }, []);

    // Auto-dismiss toast after 4 seconds
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => {
                setToast(null);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const showToast = (type, message) => {
        setToast({ type, message });
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [assumptionsData, decisionsData] = await Promise.all([
                api.getAssumptions(),
                api.getDecisions()
            ]);
            setAssumptions(assumptionsData);
            setDecisions(decisionsData);
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            await api.createAssumption({
                description: formData.description,
                status: 'HOLDING',
                linkToDecisionId: formData.linkToDecisionId || undefined
            });
            setShowAddModal(false);
            setNewAssumptionType(null);
            setFormData({ description: '', linkToDecisionId: '' });
            fetchData(); // Refresh list
        } catch (error) {
            console.error("Failed to create assumption:", error);
        }
    };

    const handleDeleteAssumption = (assumptionId, assumptionDescription) => {
        const assumptionType = assumptions.find(a => a.id === assumptionId)?.scope === 'UNIVERSAL'
            ? 'organizational'
            : 'decision-specific';

        setDeleteConfirmation({
            id: assumptionId,
            description: assumptionDescription,
            type: assumptionType
        });
    };

    const confirmDeleteAssumption = async () => {
        if (!deleteConfirmation) return;

        try {
            await api.deleteAssumption(deleteConfirmation.id);
            await fetchData(); // Refresh the list
            showToast('success', `Assumption deleted successfully`);
            setDeleteConfirmation(null);
        } catch (err) {
            console.error('Failed to delete assumption:', err);
            showToast('error', 'Failed to delete assumption. Please try again.');
            setDeleteConfirmation(null);
        }
    };

    // Helper to determine if an assumption is "Organizational" based on usage or blast radius
    // Logic: If linked to > 1 decision OR has no decision linked (global intent) -> Organizational
    // If linked to exactly 1 decision -> Decision Specific
    const getType = (a) => {
        if (a.decisionCount > 1 || a.decisionCount === 0) return 'organizational';
        return 'decision';
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'HOLDING': return 'Stable';
            case 'SHAKY': return 'Watching';
            case 'BROKEN': return 'Broken';
            default: return 'Unknown';
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'HOLDING': return 'bg-green-100 text-status-green border-green-200';
            case 'SHAKY': return 'bg-orange-100 text-status-orange border-orange-200';
            case 'BROKEN': return 'bg-red-100 text-status-red border-red-200';
            default: return 'bg-gray-100 text-neutral-gray-600 border-gray-200';
        }
    };

    const filterAssumptions = () => {
        let filtered = assumptions;

        if (activeTab !== 'all') {
            filtered = filtered.filter(a => getType(a) === activeTab);
        }

        if (searchQuery) {
            filtered = filtered.filter(a =>
                a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.impactedDecisions?.some(d => d.title.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }
        return filtered;
    };

    const orgAssumptions = filterAssumptions().filter(a => getType(a) === 'organizational');
    const decisionAssumptions = filterAssumptions().filter(a => getType(a) === 'decision');

    return (
        <div className="flex h-screen bg-neutral-white overflow-hidden">
            {/* Toast Notification */}
            {toast && (
                <div className="fixed top-4 right-4 z-50 transition-all duration-300 ease-out">
                    <div
                        className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg max-w-md ${toast.type === 'success'
                                ? 'bg-teal-500 text-white'
                                : 'bg-red-500 text-white'
                            }`}
                    >
                        {toast.type === 'success' ? (
                            <CheckCircle size={20} className="flex-shrink-0" />
                        ) : (
                            <XCircle size={20} className="flex-shrink-0" />
                        )}
                        <span className="flex-1 font-medium">{toast.message}</span>
                        <button
                            onClick={() => setToast(null)}
                            className="flex-shrink-0 hover:opacity-80 transition-opacity"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmation && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
                        <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
                            <AlertCircle className="text-red-600" size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-neutral-black mb-2 text-center">Delete Assumption?</h2>
                        <p className="text-neutral-gray-600 mb-2 text-center">
                            Are you sure you want to delete this <span className="font-semibold">{deleteConfirmation.type}</span> assumption?
                        </p>
                        <p className="text-neutral-gray-700 mb-6 text-center italic">
                            "{deleteConfirmation.description}"
                        </p>
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                            <p className="text-sm text-orange-800">
                                <strong>Warning:</strong> This action cannot be undone. The assumption will be unlinked from all decisions.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirmation(null)}
                                className="flex-1 px-6 py-3 bg-neutral-gray-100 text-neutral-gray-700 font-semibold rounded-xl hover:bg-neutral-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteAssumption}
                                className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                    <div className="p-8 max-w-7xl mx-auto">

                        {/* Header Area */}
                        <div className="flex items-end justify-between mb-8">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h1 className="text-3xl font-bold text-neutral-black">Organizational Beliefs</h1>
                                </div>
                                <p className="text-neutral-gray-600 text-lg">Assumptions — The beliefs your decisions depend on.</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="bg-neutral-gray-100 p-1 rounded-lg flex text-sm font-medium">
                                    {['all', 'organizational', 'decision'].map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`px-4 py-2 rounded-md transition-all capitalized ${activeTab === tab
                                                    ? 'bg-white text-neutral-black shadow-sm'
                                                    : 'text-neutral-gray-600 hover:text-neutral-black'
                                                }`}
                                        >
                                            {tab === 'all' ? 'All View' : tab === 'organizational' ? 'Organizational' : 'Decision-Specific'}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="px-5 py-2.5 bg-primary-blue text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-sm"
                                >
                                    <Plus size={20} />
                                    Add Assumption
                                </button>
                            </div>
                        </div>

                        {/* Filters & Search */}
                        <div className="flex items-center gap-4 mb-8">
                            <div className="flex-1 relative max-w-xl">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search by keyword or linked decision..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-white border border-neutral-gray-200 rounded-xl focus:outline-none focus:border-primary-blue transition-all shadow-sm"
                                />
                            </div>
                            <button
                                onClick={fetchData}
                                className="p-3 bg-white border border-neutral-gray-200 rounded-xl hover:border-primary-blue transition-colors text-neutral-gray-500 hover:text-primary-blue"
                            >
                                <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <RefreshCw className="animate-spin text-neutral-gray-400" size={32} />
                            </div>
                        ) : (
                            <div className="space-y-10">

                                {/* Organizational Assumptions */}
                                {(activeTab === 'all' || activeTab === 'organizational') && orgAssumptions.length > 0 && (
                                    <section>
                                        <h2 className="text-xl font-bold text-neutral-black mb-4 flex items-center gap-2">
                                            <TrendingUp className="text-primary-blue" size={24} />
                                            Systemic Risks (Organizational)
                                        </h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {orgAssumptions.map((assumption) => (
                                                <div key={assumption.id} className="bg-white p-6 rounded-2xl border border-neutral-gray-200 shadow-sm hover:shadow-md transition-shadow group relative">
                                                    {/* Delete Button */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteAssumption(assumption.id, assumption.description);
                                                        }}
                                                        className="absolute top-4 right-4 p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Delete assumption"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>

                                                    <div className="flex justify-between items-start mb-4">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusBadge(assumption.status)} border`}>
                                                            {getStatusLabel(assumption.status)}
                                                        </span>
                                                    </div>

                                                    <h3 className="text-xl font-bold text-neutral-black mb-2 group-hover:text-primary-blue transition-colors">
                                                        {assumption.description}
                                                    </h3>

                                                    <div className="flex items-center gap-2 text-sm text-neutral-gray-600 mb-6">
                                                        <span className="font-medium">Created {new Date(assumption.created_at).toLocaleDateString()}</span>
                                                    </div>

                                                    <div className="bg-neutral-gray-50 rounded-xl p-4 border border-neutral-gray-100">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <div className="w-2 h-2 bg-neutral-gray-400 rounded-full"></div>
                                                            <span className="text-sm font-semibold text-neutral-gray-700">
                                                                {assumption.scope === 'UNIVERSAL' 
                                                                    ? '🌐 Applies Universally' 
                                                                    : `Supports ${assumption.decisionCount} Decision${assumption.decisionCount !== 1 ? 's' : ''}`
                                                                }
                                                            </span>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {assumption.impactedDecisions?.slice(0, 3).map((d, idx) => (
                                                                <div key={idx} className="flex items-center gap-2 text-sm text-neutral-gray-600 pl-4">
                                                                    <div className="w-1.5 h-1.5 bg-neutral-gray-300 rounded-full"></div>
                                                                    {d.title}
                                                                </div>
                                                            ))}
                                                            {assumption.scope !== 'UNIVERSAL' && assumption.decisionCount > 3 && (
                                                                <div className="pl-8 text-xs text-neutral-gray-500">
                                                                    + {assumption.decisionCount - 3} more...
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Decision-Specific Assumptions */}
                                {(activeTab === 'all' || activeTab === 'decision') && decisionAssumptions.length > 0 && (
                                    <section>
                                        <h2 className="text-xl font-bold text-neutral-black mb-4 flex items-center gap-2 mt-8">
                                            <AlertCircle className="text-neutral-gray-600" size={24} />
                                            Localized Risks (Decision-Specific)
                                        </h2>
                                        <div className="bg-white rounded-2xl border border-neutral-gray-200 overflow-hidden shadow-sm">
                                            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-neutral-gray-50 border-b border-neutral-gray-200 text-xs font-bold text-neutral-gray-500 uppercase tracking-wider">
                                                <div className="col-span-6">Assumption</div>
                                                <div className="col-span-3">Linked Decision</div>
                                                <div className="col-span-2">Health</div>
                                                <div className="col-span-1">Actions</div>
                                            </div>
                                            <div className="divide-y divide-neutral-gray-100">
                                                {decisionAssumptions.map((assumption) => (
                                                    <div key={assumption.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-neutral-gray-50 transition-colors group">
                                                        <div className="col-span-6 font-medium text-neutral-black group-hover:text-primary-blue transition-colors">
                                                            {assumption.description}
                                                        </div>
                                                        <div className="col-span-3 text-sm text-neutral-gray-600">
                                                            {assumption.linkedDecisionTitle || assumption.impactedDecisions?.[0]?.title || 'Unlinked'}
                                                        </div>
                                                        <div className="col-span-2">
                                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadge(assumption.status)}`}>
                                                                {getStatusLabel(assumption.status)}
                                                            </span>
                                                        </div>
                                                        <div className="col-span-1 flex justify-end">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteAssumption(assumption.id, assumption.description);
                                                                }}
                                                                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Delete assumption"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </section>
                                )}

                                {assumptions.length === 0 && (
                                    <div className="text-center py-12 bg-neutral-gray-50 rounded-2xl border border-neutral-gray-200 border-dashed">
                                        <p className="text-neutral-gray-600 font-medium">No assumptions found.</p>
                                        <button onClick={() => setShowAddModal(true)} className="mt-4 text-primary-blue hover:underline">
                                            Create your first assumption
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl animate-fade-in-up">
                        <h2 className="text-2xl font-bold text-neutral-black mb-4">Add New Assumption</h2>

                        {!newAssumptionType ? (
                            // Step 1: Select Type
                            <>
                                <p className="text-neutral-gray-600 mb-8 text-lg">What kind of belief does this represent?</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                    <button
                                        onClick={() => setNewAssumptionType('organizational')}
                                        className="p-6 rounded-xl border-2 border-neutral-gray-200 hover:border-primary-blue hover:bg-blue-50 transition-all text-left group"
                                    >
                                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                                            <TrendingUp className="text-primary-blue" size={24} />
                                        </div>
                                        <h3 className="text-lg font-bold text-neutral-black mb-2">Organizational Belief</h3>
                                        <p className="text-neutral-gray-600 text-sm">A systemic truth that affects multiple decisions or the entire company.</p>
                                    </button>

                                    <button
                                        onClick={() => setNewAssumptionType('decision')}
                                        className="p-6 rounded-xl border-2 border-neutral-gray-200 hover:border-status-orange hover:bg-orange-50 transition-all text-left group"
                                    >
                                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-orange-200 transition-colors">
                                            <AlertCircle className="text-status-orange" size={24} />
                                        </div>
                                        <h3 className="text-lg font-bold text-neutral-black mb-2">Decision-Specific</h3>
                                        <p className="text-neutral-gray-600 text-sm">A localized assumption relevant to only one specific decision.</p>
                                    </button>
                                </div>
                            </>
                        ) : (
                            // Step 2: Form
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-neutral-gray-700 mb-2">Assumption Statement</label>
                                    <textarea
                                        className="w-full p-4 border border-neutral-gray-300 rounded-xl focus:border-primary-blue focus:ring-1 focus:ring-primary-blue transition-all"
                                        rows="3"
                                        placeholder="e.g., Q3 Hiring Plan will be approved by June"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                {newAssumptionType === 'decision' && (
                                    <div>
                                        <label className="block text-sm font-semibold text-neutral-gray-700 mb-2">Link directly to a decision?</label>
                                        <div className="relative">
                                            <select
                                                className="w-full p-4 border border-neutral-gray-300 rounded-xl appearance-none focus:border-primary-blue focus:ring-1 focus:ring-primary-blue bg-white"
                                                value={formData.linkToDecisionId}
                                                onChange={e => setFormData({ ...formData, linkToDecisionId: e.target.value })}
                                            >
                                                <option value="">Select a decision...</option>
                                                {decisions.map(d => (
                                                    <option key={d.id} value={d.id}>{d.title}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-gray-500 pointer-events-none" size={16} />
                                        </div>
                                    </div>
                                )}

                                {newAssumptionType === 'organizational' && (
                                    <div className="p-4 bg-blue-50 text-blue-800 rounded-xl text-sm flex gap-2">
                                        <TrendingUp size={16} className="flex-shrink-0 mt-0.5" />
                                        <p>Organizational beliefs are global. You can link them to specific decisions later from the decision detail view.</p>
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        onClick={() => setNewAssumptionType(null)}
                                        className="px-6 py-2.5 text-neutral-gray-600 font-medium hover:bg-neutral-gray-100 rounded-lg transition-colors"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleCreate}
                                        disabled={!formData.description}
                                        className="px-6 py-2.5 bg-primary-blue text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Create Assumption
                                    </button>
                                </div>
                            </div>
                        )}

                        {!newAssumptionType && (
                            <div className="flex justify-end mt-4">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="px-6 py-2.5 text-neutral-gray-600 font-medium hover:bg-neutral-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};

export default AssumptionsPage;
