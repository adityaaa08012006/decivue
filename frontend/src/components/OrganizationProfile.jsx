import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Pencil, Check, X, Flame } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const OrganizationProfile = () => {
    const { user, logout } = useAuth();
    const [loading, setLoading] = useState(true);
    const [orgName, setOrgName] = useState('');
    const [orgCode, setOrgCode] = useState('');
    const [constraints, setConstraints] = useState([]);
    
    // Edit mode states
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingConstraint, setEditingConstraint] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    
    // New constraint form state
    const [newConstraint, setNewConstraint] = useState({
        name: '',
        description: '',
        constraintType: 'POLICY',
        validationConfig: {}
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [profileData, constraintsData] = await Promise.all([
                api.getProfile().catch(() => ({ name: '' })),
                api.getAllConstraints().catch(() => [])
            ]);

            // Get org name and code from user context
            setOrgName(user?.organizations?.name || profileData.name || '');
            setOrgCode(user?.organizations?.org_code || 'ORG-CODE');
            setConstraints(constraintsData || []);
        } catch (error) {
            console.error("Failed to load data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        try {
            await api.updateProfile({ name: orgName });
        } catch (error) {
            console.error("Failed to save profile:", error);
            alert('Failed to save profile. Please try again.');
        }
    };

    const handleAddConstraint = async () => {
        if (!newConstraint.name || !newConstraint.description) {
            alert('Please fill in both name and description');
            return;
        }

        try {
            const constraintData = {
                name: newConstraint.name,
                description: newConstraint.description,
                constraintType: newConstraint.constraintType,
                isImmutable: true,
                validationConfig: newConstraint.validationConfig
            };

            const created = await api.createConstraint(constraintData);
            setConstraints(prev => [created, ...prev]);

            // Reset form
            setNewConstraint({
                name: '',
                description: '',
                constraintType: 'POLICY',
                validationConfig: {}
            });
            setShowAddModal(false);
        } catch (error) {
            console.error("Failed to create constraint:", error);
            alert('Failed to create constraint. Please try again.');
        }
    };

    const handleEditConstraint = async (id, title, description) => {
        try {
            await api.updateConstraint(id, { name: title, description });
            setConstraints(prev => prev.map(c => 
                c.id === id ? { ...c, name: title, description } : c
            ));
            setEditingConstraint(null);
        } catch (error) {
            console.error("Failed to update constraint:", error);
            alert('Failed to update constraint. Please try again.');
        }
    };

    const handleDeleteConstraint = async (id) => {
        if (!confirm('Are you sure you want to delete this constraint? This cannot be undone.')) {
            return;
        }

        try {
            await api.deleteConstraint(id);
            setConstraints(prev => prev.filter(c => c.id !== id));
        } catch (error) {
            console.error("Failed to delete constraint:", error);
            alert('Failed to delete constraint. Please try again.');
        }
    };

    const startEditing = (constraint) => {
        setEditingConstraint(constraint.id);
        setEditTitle(constraint.name);
        setEditDescription(constraint.description);
    };

    const cancelEditing = () => {
        setEditingConstraint(null);
        setEditTitle('');
        setEditDescription('');
    };

    const saveEdits = () => {
        if (editTitle.trim() && editDescription.trim()) {
            handleEditConstraint(editingConstraint, editTitle, editDescription);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8faff] via-[#f0f4ff] to-[#fafbff] dark:from-neutral-gray-900 dark:via-neutral-gray-900 dark:to-neutral-gray-800">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-700 dark:text-neutral-gray-300 font-medium">Loading organization profile...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-[#f8faff] via-[#f0f4ff] to-[#fafbff] dark:from-neutral-gray-900 dark:via-neutral-gray-900 dark:to-neutral-gray-800">
            <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
                {/* Top Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
                    {/* Left - Organization Info */}
                    <div className="bg-white dark:bg-neutral-gray-800 rounded-2xl p-6 md:p-8 shadow-lg dark:shadow-2xl">
                        <div className="border-l-4 border-blue-600 dark:border-blue-400 pl-6">
                            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gray-900 dark:text-white">
                                {orgName || 'Organization'}<br />Name
                            </h1>
                            <button className="bg-blue-600 dark:bg-blue-500 text-white px-4 py-1 rounded-full text-sm mt-2 mb-4 hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors">
                                {orgCode}
                            </button>
                            <p className="text-gray-400 dark:text-neutral-gray-500 text-sm uppercase tracking-wide mb-2">
                                Description of organization
                            </p>
                            <div className="space-y-1">
                                <div className="h-px bg-gray-200 dark:bg-neutral-gray-700 w-full"></div>
                                <div className="h-px bg-gray-200 dark:bg-neutral-gray-700 w-full"></div>
                                <div className="h-px bg-gray-200 dark:bg-neutral-gray-700 w-full"></div>
                            </div>
                        </div>
                    </div>

                    {/* Right - User Profile Card */}
                    <div className="bg-white dark:bg-neutral-gray-800 rounded-2xl p-6 md:p-8 flex flex-col items-center justify-center border-4 border-blue-600 dark:border-blue-400 shadow-lg dark:shadow-2xl">
                        <div className="mb-4">
                            <Flame className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-blue-400 to-purple-600 dark:from-blue-500 dark:to-purple-700 rounded-full flex items-center justify-center border-4 border-blue-600 dark:border-blue-400 mb-4">
                            <span className="text-white text-2xl md:text-3xl font-bold">
                                {(user?.full_name || user?.email || 'U')[0].toUpperCase()}
                            </span>
                        </div>
                        <h2 className="text-lg md:text-xl font-bold mb-1 text-gray-900 dark:text-white">
                            {user?.full_name || user?.email?.split('@')[0] || 'USER NAME'}
                        </h2>
                        <p className="text-gray-600 dark:text-neutral-gray-400 text-xs md:text-sm mb-6 uppercase tracking-wide font-medium">
                            {user?.role === 'lead' ? 'Organization Leader' : 'Team Member'}
                        </p>
                        <button 
                            onClick={logout}
                            className="bg-blue-600 dark:bg-blue-500 text-white px-8 py-2 rounded-full text-sm hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-md"
                        >
                            LOGOUT
                        </button>
                    </div>
                </div>

                {/* Bottom - Organizational Constraints */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 dark:from-neutral-gray-800 dark:to-neutral-gray-900 rounded-2xl p-6 md:p-8 text-white shadow-xl dark:shadow-2xl dark:border dark:border-neutral-gray-700">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                        <h2 className="text-lg md:text-xl font-semibold uppercase tracking-wide">
                            Organizational Constraints
                        </h2>
                        <button 
                            onClick={() => setShowAddModal(true)}
                            className="bg-white dark:bg-blue-600 text-blue-700 dark:text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md"
                        >
                            ADD CONSTRAINTS <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    {constraints.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-6">
                                {constraints.slice(0, 3).map((constraint) => (
                                    <div key={constraint.id} className="group relative">
                                        {editingConstraint !== constraint.id ? (
                                            <>
                                                <p className="text-sm leading-relaxed">
                                                    <strong className="block mb-1">{constraint.name}</strong>
                                                    {constraint.description}
                                                </p>
                                                <div className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => startEditing(constraint)}
                                                        className="p-1.5 bg-white/10 hover:bg-white/20 rounded transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteConstraint(constraint.id)}
                                                        className="p-1.5 bg-white/10 hover:bg-red-500/20 rounded transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    value={editTitle}
                                                    onChange={(e) => setEditTitle(e.target.value)}
                                                    className="w-full bg-white/10 text-white px-2 py-1 rounded text-sm border border-white/20 focus:outline-none focus:border-white/40"
                                                    placeholder="Title"
                                                />
                                                <textarea
                                                    value={editDescription}
                                                    onChange={(e) => setEditDescription(e.target.value)}
                                                    className="w-full bg-white/10 text-white px-2 py-1 rounded text-sm border border-white/20 focus:outline-none focus:border-white/40 resize-none"
                                                    rows={3}
                                                    placeholder="Description"
                                                />
                                                <div className="flex gap-1 justify-end">
                                                    <button
                                                        onClick={cancelEditing}
                                                        className="p-1.5 bg-white/10 hover:bg-white/20 rounded transition-colors"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={saveEdits}
                                                        className="p-1.5 bg-green-600 hover:bg-green-700 rounded transition-colors"
                                                    >
                                                        <Check className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {constraints.length > 3 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-6">
                                    {constraints.slice(3).map((constraint) => (
                                        <div key={constraint.id} className="group relative">
                                            {editingConstraint !== constraint.id ? (
                                                <>
                                                    <p className="text-sm leading-relaxed">
                                                        <strong className="block mb-1">{constraint.name}</strong>
                                                        {constraint.description}
                                                    </p>
                                                    <div className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => startEditing(constraint)}
                                                            className="p-1.5 bg-white/10 hover:bg-white/20 rounded transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Pencil className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteConstraint(constraint.id)}
                                                            className="p-1.5 bg-white/10 hover:bg-red-500/20 rounded transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="space-y-2">
                                                    <input
                                                        type="text"
                                                        value={editTitle}
                                                        onChange={(e) => setEditTitle(e.target.value)}
                                                        className="w-full bg-white/10 text-white px-2 py-1 rounded text-sm border border-white/20 focus:outline-none focus:border-white/40"
                                                        placeholder="Title"
                                                    />
                                                    <textarea
                                                        value={editDescription}
                                                        onChange={(e) => setEditDescription(e.target.value)}
                                                        className="w-full bg-white/10 text-white px-2 py-1 rounded text-sm border border-white/20 focus:outline-none focus:border-white/40 resize-none"
                                                        rows={3}
                                                        placeholder="Description"
                                                    />
                                                    <div className="flex gap-1 justify-end">
                                                        <button
                                                            onClick={cancelEditing}
                                                            className="p-1.5 bg-white/10 hover:bg-white/20 rounded transition-colors"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={saveEdits}
                                                            className="p-1.5 bg-green-600 hover:bg-green-700 rounded transition-colors"
                                                        >
                                                            <Check className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-12 mb-6">
                            <p className="text-white/60 dark:text-neutral-gray-400 mb-2">No constraints defined yet</p>
                            <p className="text-white/40 dark:text-neutral-gray-500 text-sm">
                                Add organizational constraints to ensure decisions respect your rules.
                            </p>
                        </div>
                    )}

                    <div className="border-t border-white/20 dark:border-neutral-gray-600 pt-4 mt-6">
                        <p className="text-xs italic text-blue-100 dark:text-neutral-gray-400 text-center">
                            All constraints automatically apply to every decision in your organization. They cannot be selectively disabled.
                        </p>
                    </div>
                </div>
            </div>

            {/* Add Constraint Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-neutral-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl">
                        <div className="px-6 md:px-8 py-6 border-b border-blue-100 dark:border-neutral-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-neutral-gray-700 dark:to-neutral-gray-800">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Add New Constraint</h2>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="p-2 hover:bg-white/60 dark:hover:bg-neutral-gray-600 rounded-lg transition-colors"
                                >
                                    <X className="text-gray-600 dark:text-neutral-gray-300" size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 md:p-8 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">
                                    Constraint Name *
                                </label>
                                <input
                                    type="text"
                                    value={newConstraint.name}
                                    onChange={(e) => setNewConstraint({ ...newConstraint, name: e.target.value })}
                                    placeholder='e.g., "Annual Budget Limit"'
                                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-neutral-gray-600 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors text-gray-900 dark:text-white bg-white dark:bg-neutral-gray-700 placeholder:text-gray-400 dark:placeholder:text-neutral-gray-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">
                                    Description *
                                </label>
                                <textarea
                                    value={newConstraint.description}
                                    onChange={(e) => setNewConstraint({ ...newConstraint, description: e.target.value })}
                                    placeholder='e.g., "All projects must stay within $500K annual budget"'
                                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-neutral-gray-600 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors resize-none text-gray-900 dark:text-white bg-white dark:bg-neutral-gray-700 placeholder:text-gray-400 dark:placeholder:text-neutral-gray-500"
                                    rows={4}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">
                                    Constraint Type
                                </label>
                                <select
                                    value={newConstraint.constraintType}
                                    onChange={(e) => setNewConstraint({ ...newConstraint, constraintType: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-neutral-gray-600 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors text-gray-900 dark:text-white bg-white dark:bg-neutral-gray-700"
                                >
                                    <option value="POLICY">Policy</option>
                                    <option value="BUDGET">Budget</option>
                                    <option value="LEGAL">Legal</option>
                                    <option value="TECHNICAL">Technical</option>
                                    <option value="COMPLIANCE">Compliance</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="px-6 md:px-8 py-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-neutral-gray-700 dark:to-neutral-gray-800 rounded-b-2xl flex gap-3 justify-end border-t border-blue-100 dark:border-neutral-gray-700">
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setNewConstraint({ name: '', description: '', constraintType: 'POLICY', validationConfig: {} });
                                }}
                                className="px-6 py-3 border-2 border-blue-200 dark:border-neutral-gray-600 text-gray-700 dark:text-neutral-gray-300 font-semibold rounded-lg hover:bg-white dark:hover:bg-neutral-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddConstraint}
                                className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-md"
                            >
                                Create Constraint
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrganizationProfile;
