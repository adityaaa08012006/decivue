import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, Plus, AlertCircle, TrendingUp, RefreshCw, Link2, Trash2, CheckCircle, XCircle, X, Shield, Edit2, Layers } from 'lucide-react';
import api from '../services/api';
import AssumptionConflictModal from './AssumptionConflictModal';
import ConflictResolutionModal from './ConflictResolutionModal';
import StructuredAssumptionForm from './StructuredAssumptionForm';

const AssumptionsPage = () => {
    const [activeTab, setActiveTab] = useState('all'); // all, organizational, decision
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingAssumption, setEditingAssumption] = useState(null); // Assumption being edited
    const [editMode, setEditMode] = useState('simple'); // 'simple' | 'structured'
    const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }
    const [deleteConfirmation, setDeleteConfirmation] = useState(null); // { id, description, type }

    // Conflict Detection State
    const [conflicts, setConflicts] = useState([]);
    const [selectedConflict, setSelectedConflict] = useState(null);
    const [detectingConflicts, setDetectingConflicts] = useState(false);
    const [resolvingConflict, setResolvingConflict] = useState(null); // Conflict to resolve

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

    // Auto-dismiss toast after 4 seconds (or 8 seconds for errors)
    useEffect(() => {
        if (toast) {
            const duration = toast.type === 'error' ? 8000 : 4000;
            const timer = setTimeout(() => {
                setToast(null);
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const showToast = (type, message) => {
        setToast({ type, message });
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [assumptionsData, decisionsData, conflictsData] = await Promise.all([
                api.getAssumptions(),
                api.getDecisions(),
                api.getAssumptionConflicts(false) // Only fetch unresolved conflicts
            ]);
            setAssumptions(assumptionsData);
            // Filter out deprecated decisions (INVALIDATED or RETIRED)
            const activeDecisions = decisionsData.filter(
                d => d.lifecycle !== 'INVALIDATED' && d.lifecycle !== 'RETIRED'
            );
            setDecisions(activeDecisions);
            setConflicts(conflictsData || []);
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDetectConflicts = async () => {
        try {
            setDetectingConflicts(true);
            const result = await api.detectAssumptionConflicts();

            showToast('success', `Conflict detection complete! Found ${result.conflictsDetected} new conflict(s)`);

            // Refetch conflicts
            const conflictsData = await api.getAssumptionConflicts(false);
            setConflicts(conflictsData || []);
        } catch (error) {
            console.error('Failed to detect conflicts:', error);
            showToast('error', 'Failed to detect conflicts. Please try again.');
        } finally {
            setDetectingConflicts(false);
        }
    };

    const handleConflictResolved = async () => {
        // Refetch conflicts and assumptions after resolution
        const [conflictsData, assumptionsData] = await Promise.all([
            api.getAssumptionConflicts(false),
            api.getAssumptions()
        ]);
        setConflicts(conflictsData || []);
        setAssumptions(assumptionsData || []);
        showToast('success', 'Conflict resolved successfully! Affected decisions will be re-evaluated.');
    };

    const handleResolveConflict = async (conflictId, resolutionAction, resolutionNotes) => {
        await api.resolveAssumptionConflict(conflictId, resolutionAction, resolutionNotes);
        setResolvingConflict(null);
        await handleConflictResolved();
    };

    const handleCreate = async () => {
        try {
            await api.createAssumption({
                description: formData.description,
                status: 'VALID',
                linkToDecisionId: formData.linkToDecisionId || undefined
            });
            setShowAddModal(false);
            setNewAssumptionType(null);
            setFormData({ description: '', linkToDecisionId: '' });
            showToast('success', 'Assumption created successfully');
            fetchData(); // Refresh list
        } catch (error) {
            console.error("Failed to create assumption:", error);
            showToast('error', 'Failed to create assumption. Please try again.');
        }
    };

    const handleEditAssumption = (assumption) => {
        setEditingAssumption({
            id: assumption.id,
            description: assumption.description,
            status: assumption.status,
            scope: assumption.scope,
            category: assumption.category,
            parameters: assumption.parameters || {}
        });
        // Default to structured mode if assumption has category (for conflict resolution)
        setEditMode(assumption.category ? 'structured' : 'simple');
        setShowEditModal(true);
    };

    const handleUpdateAssumption = async () => {
        if (!editingAssumption) return;

        try {
            const updateData = {
                description: editingAssumption.description,
                status: editingAssumption.status
            };

            // Always include structured data if it exists (regardless of edit mode)
            if (editingAssumption.category) {
                updateData.category = editingAssumption.category;
                updateData.parameters = editingAssumption.parameters;
            }

            const response = await api.updateAssumption(editingAssumption.id, updateData);

            setShowEditModal(false);
            setEditingAssumption(null);
            setEditMode('simple');

            // Check if there's a validation warning
            if (response.validation?.warning) {
                showToast('error', `⚠️ Status Mismatch: ${response.validation.reason} (Suggested: ${response.validation.suggestedStatus})`);
            } else {
                showToast('success', 'Assumption updated successfully');
            }

            fetchData(); // Refresh list
        } catch (error) {
            console.error("Failed to update assumption:", error);
            showToast('error', 'Failed to update assumption. Please try again.');
        }
    };

    const handleStructuredUpdate = async (assumptionData) => {
        if (!editingAssumption) return;

        try {
            const updateData = {
                ...assumptionData,
                status: editingAssumption.status
            };

            const response = await api.updateAssumption(editingAssumption.id, updateData);

            setShowEditModal(false);
            setEditingAssumption(null);
            setEditMode('simple');

            if (response.validation?.warning) {
                showToast('error', `⚠️ Status Mismatch: ${response.validation.reason} (Suggested: ${response.validation.suggestedStatus})`);
            } else {
                showToast('success', 'Assumption updated successfully');
            }

            fetchData();
        } catch (error) {
            console.error("Failed to update assumption:", error);
            showToast('error', 'Failed to update assumption. Please try again.');
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
            case 'VALID': return 'Valid';
            case 'HOLDING': return 'Valid'; // Backward compatibility
            case 'SHAKY': return 'Watching';
            case 'BROKEN': return 'Broken';
            default: return 'Unknown';
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'VALID': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
            case 'HOLDING': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'; // Backward compatibility
            case 'SHAKY': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800';
            case 'BROKEN': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
            default: return 'bg-gray-100 dark:bg-neutral-gray-800 text-neutral-gray-600 dark:text-neutral-gray-400 border-neutral-gray-200 dark:border-neutral-gray-700';
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
        <div className="flex h-screen bg-neutral-white dark:bg-neutral-gray-900 overflow-hidden">
            {/* Toast Notification */}
            {toast && (
                <div className="fixed top-4 right-4 z-50 transition-all duration-300 ease-out">
                    <div
                        className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg max-w-md ${toast.type === 'success'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
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
                    <div className="bg-white dark:bg-neutral-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
                        <div className="flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mx-auto mb-4">
                            <AlertCircle className="text-red-600 dark:text-red-400" size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-neutral-black dark:text-white mb-2 text-center">Delete Assumption?</h2>
                        <p className="text-neutral-gray-600 dark:text-neutral-gray-400 mb-2 text-center">
                            Are you sure you want to delete this <span className="font-semibold">{deleteConfirmation.type}</span> assumption?
                        </p>
                        <p className="text-neutral-gray-700 dark:text-neutral-gray-300 mb-6 text-center italic">
                            "{deleteConfirmation.description}"
                        </p>
                        <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6">
                            <p className="text-sm text-orange-800 dark:text-orange-300">
                                <strong>Warning:</strong> This action cannot be undone. The assumption will be unlinked from all decisions.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirmation(null)}
                                className="flex-1 px-6 py-3 bg-gray-50 dark:bg-neutral-gray-700 text-neutral-gray-700 dark:text-neutral-gray-300 font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-gray-650 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteAssumption}
                                className="flex-1 px-6 py-3 bg-red-600 dark:bg-red-500 text-white font-semibold rounded-xl hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
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

                        {/* Header */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-3xl font-bold text-neutral-black dark:text-white mb-2">Assumptions</h1>
                                    <p className="text-neutral-gray-600 dark:text-neutral-gray-400">Monitor and validate the beliefs underpinning your decisions</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleDetectConflicts}
                                        disabled={detectingConflicts}
                                        className="px-4 py-2 bg-white dark:bg-neutral-gray-700 border border-neutral-gray-300 dark:border-neutral-gray-600 text-neutral-gray-700 dark:text-neutral-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-gray-650 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Shield size={18} />
                                        {detectingConflicts ? 'Detecting...' : 'Detect Conflicts'}
                                    </button>
                                    <button
                                        onClick={() => setShowAddModal(true)}
                                        className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-sm font-medium"
                                    >
                                        <Plus size={18} />
                                        Add Assumption
                                    </button>
                                    <button
                                        onClick={fetchData}
                                        className="px-4 py-2 bg-white dark:bg-neutral-gray-700 border border-neutral-gray-300 dark:border-neutral-gray-600 text-neutral-gray-700 dark:text-neutral-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-gray-650 transition-colors flex items-center gap-2 shadow-sm"
                                    >
                                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                                        Refresh
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Filter Tabs */}
                        <div className="mb-6 flex gap-2">
                            {['all', 'organizational', 'decision'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
                                        activeTab === tab
                                            ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-md'
                                            : 'bg-white dark:bg-neutral-gray-800 text-neutral-gray-700 dark:text-neutral-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-gray-700 border border-neutral-gray-200 dark:border-neutral-gray-700'
                                    }`}
                                >
                                    {tab === 'all' ? 'All' : tab === 'organizational' ? 'Organizational' : 'Decision-Specific'}
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <div className="mb-6">
                            <div className="relative max-w-md">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-gray-400 dark:text-neutral-gray-500" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search assumptions or linked decisions..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-gray-700 border border-neutral-gray-200 dark:border-neutral-gray-600 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-neutral-black dark:text-white placeholder:text-neutral-gray-400 dark:placeholder:text-neutral-gray-500"
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div className="bg-white dark:bg-neutral-gray-800 rounded-lg border border-neutral-gray-200 dark:border-neutral-gray-700 p-12 text-center shadow-sm">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-neutral-gray-200 dark:border-neutral-gray-600 border-t-blue-500 dark:border-t-blue-400 mb-4"></div>
                                <p className="text-neutral-gray-700 dark:text-neutral-gray-300">Loading your assumptions...</p>
                            </div>
                        ) : (
                            <div className="space-y-10">

                                {/* Organizational Assumptions */}
                                {(activeTab === 'all' || activeTab === 'organizational') && orgAssumptions.length > 0 && (
                                    <section>
                                        <h2 className="text-lg font-bold text-neutral-black dark:text-white mb-4">
                                            Organizational Assumptions
                                        </h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {orgAssumptions.map((assumption) => (
                                                <div key={assumption.id} className="bg-white dark:bg-neutral-gray-800 p-6 rounded-lg border border-neutral-gray-200 dark:border-neutral-gray-700 hover:shadow-md transition-all group relative">
                                                    {/* Action Buttons */}
                                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEditAssumption(assumption);
                                                            }}
                                                            className="p-2 text-neutral-gray-400 dark:text-neutral-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                            title="Edit assumption"
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteAssumption(assumption.id, assumption.description);
                                                            }}
                                                            className="p-2 text-neutral-gray-400 dark:text-neutral-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                            title="Delete assumption"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>

                                                    <div className="flex justify-between items-start mb-3">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(assumption.status)}`}>
                                                            {getStatusLabel(assumption.status)}
                                                        </span>
                                                    </div>

                                                    <h3 className="text-base font-semibold text-neutral-black dark:text-white mb-2 pr-8">
                                                        {assumption.description}
                                                    </h3>

                                                    <div className="flex items-center gap-2 text-sm text-neutral-gray-500 dark:text-neutral-gray-400 mb-4">
                                                        <span>{new Date(assumption.created_at).toLocaleDateString()}</span>
                                                    </div>

                                                    <div className="bg-gray-50 dark:bg-neutral-gray-700 rounded-lg p-3 border border-neutral-gray-100 dark:border-neutral-gray-600">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-sm font-medium text-neutral-gray-700 dark:text-neutral-gray-300">
                                                                {assumption.scope === 'UNIVERSAL'
                                                                    ? '🌐 Universal'
                                                                    : `${assumption.decisionCount} Decision${assumption.decisionCount !== 1 ? 's' : ''}`
                                                                }
                                                            </span>
                                                        </div>
                                                        <div className="space-y-1">
                                                            {assumption.impactedDecisions?.slice(0, 3).map((d, idx) => {
                                                                const isDeprecated = d.lifecycle === 'INVALIDATED' || d.lifecycle === 'RETIRED';
                                                                return (
                                                                    <div key={idx} className={`flex items-center gap-2 text-sm pl-2 ${
                                                                        isDeprecated ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-neutral-gray-600 dark:text-neutral-gray-400'
                                                                    }`}>
                                                                        <div className={`w-1.5 h-1.5 rounded-full ${
                                                                            isDeprecated ? 'bg-red-500 dark:bg-red-400' : 'bg-neutral-gray-400 dark:bg-neutral-gray-500'
                                                                        }`}></div>
                                                                        {isDeprecated && <span title="Deprecated decision">⚠️</span>}
                                                                        {d.title}
                                                                        {isDeprecated && <span className="text-xs text-red-500 dark:text-red-400">({d.lifecycle})</span>}
                                                                    </div>
                                                                );
                                                            })}
                                                            {assumption.scope !== 'UNIVERSAL' && assumption.decisionCount > 3 && (
                                                                <div className="pl-4 text-sm text-neutral-gray-500 dark:text-neutral-gray-400">
                                                                    +{assumption.decisionCount - 3} more
                                                                </div>
                                                            )}
                                                        </div>
                                                        {assumption.deprecationWarning && (
                                                            <div className="mt-3 flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
                                                                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                                                                <span>{assumption.deprecationWarning}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Decision-Specific Assumptions */}
                                {(activeTab === 'all' || activeTab === 'decision') && decisionAssumptions.length > 0 && (
                                    <section>
                                        <h2 className="text-lg font-bold text-neutral-black dark:text-white mb-4 mt-8">
                                            Decision-Specific Assumptions
                                        </h2>
                                        <div className="bg-white dark:bg-neutral-gray-800 rounded-lg border border-neutral-gray-200 dark:border-neutral-gray-700 overflow-hidden shadow-sm">
                                            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-neutral-gray-700 border-b border-neutral-gray-200 dark:border-neutral-gray-600 text-xs font-semibold text-neutral-gray-600 dark:text-neutral-gray-400 uppercase tracking-wide">
                                                <div className="col-span-6">Assumption</div>
                                                <div className="col-span-3">Decision</div>
                                                <div className="col-span-2">Status</div>
                                                <div className="col-span-1"></div>
                                            </div>
                                            <div className="divide-y divide-neutral-gray-100 dark:divide-neutral-gray-700">
                                                {decisionAssumptions.map((assumption) => {
                                                    const hasDeprecationWarning = assumption.hasDeprecatedDecisions || false;
                                                    return (
                                                        <div key={assumption.id} className={`grid grid-cols-12 gap-4 px-6 py-4 items-start hover:bg-gray-50 dark:hover:bg-neutral-gray-700 transition-colors group ${
                                                            hasDeprecationWarning ? 'bg-red-50/30 dark:bg-red-900/10' : ''
                                                        }`}>
                                                            <div className="col-span-6">
                                                                <div className="text-sm text-neutral-gray-900 dark:text-neutral-gray-100 font-medium mb-1">
                                                                    {assumption.description}
                                                                </div>
                                                                {assumption.deprecationWarning && (
                                                                    <div className="flex items-start gap-1 text-xs text-red-600 dark:text-red-400 mt-2">
                                                                        <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                                                                        <span>{assumption.deprecationWarning}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="col-span-3">
                                                                <div className="space-y-1">
                                                                    {assumption.impactedDecisions?.slice(0, 2).map((d, idx) => {
                                                                        const isDeprecated = d.lifecycle === 'INVALIDATED' || d.lifecycle === 'RETIRED';
                                                                        return (
                                                                            <div key={idx} className={`text-sm flex items-center gap-1 ${
                                                                                isDeprecated ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-neutral-gray-600 dark:text-neutral-gray-400'
                                                                            }`}>
                                                                                {isDeprecated && <span title="Deprecated decision">⚠️</span>}
                                                                                {d.title}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    {assumption.decisionCount > 2 && (
                                                                        <div className="text-xs text-neutral-gray-500 dark:text-neutral-gray-400">
                                                                            +{assumption.decisionCount - 2} more
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="col-span-2">
                                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(assumption.status)}`}>
                                                                    {getStatusLabel(assumption.status)}
                                                                </span>
                                                            </div>
                                                            <div className="col-span-1 flex justify-end gap-2">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleEditAssumption(assumption);
                                                                    }}
                                                                    className="p-2 text-neutral-gray-400 dark:text-neutral-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                                    title="Edit assumption"
                                                                >
                                                                    <Edit2 size={18} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteAssumption(assumption.id, assumption.description);
                                                                    }}
                                                                    className="p-2 text-neutral-gray-400 dark:text-neutral-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                                    title="Delete assumption"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </section>
                                )}

                                {assumptions.length === 0 && (
                                    <div className="bg-white dark:bg-neutral-gray-800 rounded-lg border border-neutral-gray-200 dark:border-neutral-gray-700 p-12 text-center shadow-sm">
                                        <p className="text-neutral-gray-600 dark:text-neutral-gray-400 font-medium mb-2">No assumptions found</p>
                                        <p className="text-sm text-neutral-gray-500 dark:text-neutral-gray-500 mb-4">Create your first assumption to start tracking beliefs</p>
                                        <button
                                            onClick={() => setShowAddModal(true)}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium"
                                        >
                                            <Plus size={18} />
                                            Add Assumption
                                        </button>
                                    </div>
                                )}

                                {/* Assumption Conflicts */}
                                {conflicts.length > 0 && (
                                    <section className="mt-8">
                                        <h2 className="text-lg font-bold text-neutral-black dark:text-white mb-4 flex items-center gap-2">
                                            Detected Conflicts
                                            <span className="text-sm bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-3 py-1 rounded-full font-medium">
                                                {conflicts.length} unresolved
                                            </span>
                                        </h2>
                                        <div className="grid grid-cols-1 gap-4">
                                            {conflicts.map((conflict) => (
                                                <div
                                                    key={conflict.id}
                                                    className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg p-5 hover:border-orange-300 dark:hover:border-orange-700 transition-all cursor-pointer shadow-sm"
                                                    onClick={() => setSelectedConflict(conflict)}
                                                >
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm font-semibold text-orange-900 dark:text-orange-200 uppercase tracking-wide">
                                                                {conflict.conflict_type?.replace(/_/g, ' ') || 'CONFLICT'}
                                                            </span>
                                                            <span className="text-sm text-orange-700 dark:text-orange-300">
                                                                {Math.round(conflict.confidence_score * 100)}% confidence
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setResolvingConflict(conflict);
                                                            }}
                                                            className="px-4 py-2 bg-orange-600 dark:bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600 transition-colors"
                                                        >
                                                            Resolve
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                                            <div className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-2">Assumption A</div>
                                                            <p className="text-sm text-neutral-gray-900 dark:text-neutral-gray-100">{conflict.assumption_a?.text || conflict.assumption_a?.description}</p>
                                                        </div>
                                                        <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                                                            <div className="text-xs font-semibold text-purple-900 dark:text-purple-200 mb-2">Assumption B</div>
                                                            <p className="text-sm text-neutral-gray-900 dark:text-neutral-gray-100">{conflict.assumption_b?.text || conflict.assumption_b?.description}</p>
                                                        </div>
                                                    </div>
                                                    {conflict.metadata?.reason && (
                                                        <div className="mt-4 text-sm text-orange-800 dark:text-orange-300">
                                                            <span className="font-semibold">Reason:</span> {conflict.metadata.reason}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-neutral-gray-800 rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl">
                        <h2 className="text-2xl font-bold text-neutral-black dark:text-white mb-6">New Assumption</h2>

                        {!newAssumptionType ? (
                            // Step 1: Select Type
                            <>
                                <p className="text-neutral-gray-600 dark:text-neutral-gray-400 mb-6">Choose the type of assumption</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <button
                                        onClick={() => setNewAssumptionType('organizational')}
                                        className="p-6 rounded-xl border-2 border-neutral-gray-200 dark:border-neutral-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all text-left group"
                                    >
                                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                                            <TrendingUp className="text-blue-600 dark:text-blue-400" size={24} />
                                        </div>
                                        <h3 className="text-lg font-bold text-neutral-black dark:text-white mb-2">Organizational</h3>
                                        <p className="text-sm text-neutral-gray-600 dark:text-neutral-gray-400">Universal assumption affecting multiple decisions</p>
                                    </button>

                                    <button
                                        onClick={() => setNewAssumptionType('decision')}
                                        className="p-6 rounded-xl border-2 border-neutral-gray-200 dark:border-neutral-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all text-left group"
                                    >
                                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                                            <AlertCircle className="text-blue-600 dark:text-blue-400" size={24} />
                                        </div>
                                        <h3 className="text-lg font-bold text-neutral-black dark:text-white mb-2">Decision-Specific</h3>
                                        <p className="text-sm text-neutral-gray-600 dark:text-neutral-gray-400">Local assumption for a single decision</p>
                                    </button>
                                </div>
                            </>
                        ) : (
                            // Step 2: Form
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-neutral-gray-700 dark:text-neutral-gray-300 mb-2">Assumption</label>
                                    <textarea
                                        className="w-full p-4 border border-neutral-gray-300 dark:border-neutral-gray-600 bg-white dark:bg-neutral-gray-700 text-neutral-black dark:text-white rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-neutral-gray-400 dark:placeholder:text-neutral-gray-500"
                                        rows="3"
                                        placeholder="e.g., Q3 Hiring Plan will be approved by June"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                {newAssumptionType === 'decision' && (
                                    <div>
                                        <label className="block text-sm font-semibold text-neutral-gray-700 dark:text-neutral-gray-300 mb-2">Link to Decision (Optional)</label>
                                        <div className="relative">
                                            <select
                                                className="w-full p-4 border border-neutral-gray-300 dark:border-neutral-gray-600 bg-white dark:bg-neutral-gray-700 text-neutral-black dark:text-white rounded-lg appearance-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                                value={formData.linkToDecisionId}
                                                onChange={e => setFormData({ ...formData, linkToDecisionId: e.target.value })}
                                            >
                                                <option value="">Select a decision...</option>
                                                {decisions.map(d => (
                                                    <option key={d.id} value={d.id}>{d.title}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-gray-500 dark:text-neutral-gray-400 pointer-events-none" size={18} />
                                        </div>
                                    </div>
                                )}

                                {newAssumptionType === 'organizational' && (
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-lg text-sm flex gap-2 border border-blue-200 dark:border-blue-800">
                                        <TrendingUp size={18} className="flex-shrink-0 mt-0.5" />
                                        <p>Organizational assumptions apply globally. Link them to specific decisions later.</p>
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        onClick={() => setNewAssumptionType(null)}
                                        className="px-6 py-3 bg-gray-50 dark:bg-neutral-gray-700 text-neutral-gray-700 dark:text-neutral-gray-300 font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-gray-650 transition-colors"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleCreate}
                                        disabled={!formData.description}
                                        className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                    >
                                        Create
                                    </button>
                                </div>
                            </div>
                        )}

                        {!newAssumptionType && (
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="px-6 py-3 bg-gray-50 dark:bg-neutral-gray-700 text-neutral-gray-700 dark:text-neutral-gray-300 font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-gray-650 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editingAssumption && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-neutral-gray-800 rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-neutral-black dark:text-white">Edit Assumption</h2>
                            <button
                                onClick={() => {
                                    setShowEditModal(false);
                                    setEditingAssumption(null);
                                    setEditMode('simple');
                                }}
                                className="p-2 hover:bg-gray-50 dark:hover:bg-neutral-gray-700 rounded-lg"
                            >
                                <X size={20} className="text-neutral-gray-500 dark:text-neutral-gray-400" />
                            </button>
                        </div>

                        {/* Mode Toggle */}
                        <div className="mb-6 flex gap-2">
                            <button
                                onClick={() => setEditMode('simple')}
                                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                                    editMode === 'simple'
                                        ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm'
                                        : 'bg-gray-50 dark:bg-neutral-gray-700 text-neutral-gray-700 dark:text-neutral-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-gray-650'
                                }`}
                            >
                                Simple Mode
                            </button>
                            <button
                                onClick={() => setEditMode('structured')}
                                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                                    editMode === 'structured'
                                        ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm'
                                        : 'bg-gray-50 dark:bg-neutral-gray-700 text-neutral-gray-700 dark:text-neutral-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-gray-650'
                                }`}
                            >
                                <Layers size={16} />
                                Structured Mode (Better Conflict Detection)
                            </button>
                        </div>

                        {editMode === 'simple' ? (
                            <div className="space-y-5">
                                {/* Warning if assumption has structured data */}
                                {editingAssumption.category && (
                                    <div className="p-4 bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-500 dark:border-amber-600 text-amber-900 dark:text-amber-200 rounded-lg">
                                        <div className="flex items-start gap-3">
                                            <Layers size={20} className="flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                                            <div>
                                                <p className="font-semibold mb-1">This assumption has structured parameters</p>
                                                <p className="text-sm text-amber-800 dark:text-amber-300">
                                                    Category: <strong>{editingAssumption.category}</strong>
                                                    {editingAssumption.parameters?.timeframe && <> • Timeframe: <strong>{editingAssumption.parameters.timeframe}</strong></>}
                                                    {editingAssumption.parameters?.amount && <> • Amount: <strong>{editingAssumption.parameters.amount}</strong></>}
                                                </p>
                                                <p className="text-sm text-amber-800 dark:text-amber-300 mt-2">
                                                    💡 To resolve conflicts or change these parameters, switch to <strong>Structured Mode</strong>.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-semibold text-neutral-gray-700 dark:text-neutral-gray-300 mb-2">Description</label>
                                    <textarea
                                        className="w-full p-4 border border-neutral-gray-300 dark:border-neutral-gray-600 bg-white dark:bg-neutral-gray-700 text-neutral-black dark:text-white rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-neutral-gray-400 dark:placeholder:text-neutral-gray-500"
                                        rows="3"
                                        placeholder="e.g., Q3 Hiring Plan will be approved by June"
                                        value={editingAssumption.description}
                                        onChange={e => setEditingAssumption({ ...editingAssumption, description: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-neutral-gray-700 dark:text-neutral-gray-300 mb-2">Status</label>
                                    <div className="flex gap-3">
                                        {['VALID', 'SHAKY', 'BROKEN'].map((status) => (
                                            <button
                                                key={status}
                                                onClick={() => setEditingAssumption({ ...editingAssumption, status })}
                                                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                                                    editingAssumption.status === status
                                                        ? status === 'VALID'
                                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-2 border-green-600 dark:border-green-500'
                                                            : status === 'SHAKY'
                                                            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-2 border-orange-600 dark:border-orange-500'
                                                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-2 border-red-600 dark:border-red-500'
                                                        : 'bg-gray-50 dark:bg-neutral-gray-700 text-neutral-gray-700 dark:text-neutral-gray-300 border-2 border-neutral-gray-200 dark:border-neutral-gray-600 hover:bg-gray-100 dark:hover:bg-neutral-gray-650'
                                                }`}
                                            >
                                                {status === 'VALID' ? '✓ Valid' : status === 'SHAKY' ? '⚠ Watching' : '✗ Broken'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {editingAssumption.scope === 'UNIVERSAL' && (
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-lg text-sm flex gap-2 border border-blue-200 dark:border-blue-800">
                                        <Shield size={18} className="flex-shrink-0 mt-0.5" />
                                        <p>This is a <strong>Universal (Organizational)</strong> assumption. Changes will affect all linked decisions.</p>
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        onClick={() => {
                                            setShowEditModal(false);
                                            setEditingAssumption(null);
                                            setEditMode('simple');
                                        }}
                                        className="px-6 py-3 bg-gray-50 dark:bg-neutral-gray-700 text-neutral-gray-700 dark:text-neutral-gray-300 font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-gray-650 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleUpdateAssumption}
                                        disabled={!editingAssumption.description}
                                        className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <StructuredAssumptionForm
                                    existingAssumption={editingAssumption}
                                    onSubmit={handleStructuredUpdate}
                                    onCancel={() => {
                                        setShowEditModal(false);
                                        setEditingAssumption(null);
                                        setEditMode('simple');
                                    }}
                                />

                                {editingAssumption.scope === 'UNIVERSAL' && (
                                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-lg text-sm flex gap-2 border border-blue-200 dark:border-blue-800">
                                        <Shield size={18} className="flex-shrink-0 mt-0.5" />
                                        <p>This is a <strong>Universal (Organizational)</strong> assumption. Changes will affect all linked decisions.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Assumption Conflict Resolution Modal */}
            {selectedConflict && (
                <AssumptionConflictModal
                    conflict={selectedConflict}
                    onClose={() => setSelectedConflict(null)}
                    onResolved={handleConflictResolved}
                />
            )}

            {/* New Conflict Resolution Modal */}
            {resolvingConflict && (
                <ConflictResolutionModal
                    conflict={resolvingConflict}
                    onResolve={handleResolveConflict}
                    onClose={() => setResolvingConflict(null)}
                />
            )}

        </div>
    );
};

export default AssumptionsPage;
