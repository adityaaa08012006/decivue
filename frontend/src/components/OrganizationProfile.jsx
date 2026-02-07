import React, { useState, useEffect } from 'react';
import { Building2, Trash2, Plus, Check, Shield } from 'lucide-react';
import api from '../services/api';

const OrganizationProfile = () => {
    const [loading, setLoading] = useState(true);
    const [orgName, setOrgName] = useState('');
    const [constraints, setConstraints] = useState([]);
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileSaved, setProfileSaved] = useState(false);

    // New constraint form state
    const [showAddForm, setShowAddForm] = useState(false);
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

            setOrgName(profileData.name || '');
            setConstraints(constraintsData || []);
        } catch (error) {
            console.error("Failed to load data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        try {
            setSavingProfile(true);
            await api.updateProfile({ name: orgName });
            setProfileSaved(true);
            setTimeout(() => setProfileSaved(false), 3000);
        } catch (error) {
            console.error("Failed to save profile:", error);
            alert('Failed to save profile. Please try again.');
        } finally {
            setSavingProfile(false);
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
            setShowAddForm(false);
        } catch (error) {
            console.error("Failed to create constraint:", error);
            alert('Failed to create constraint. Please try again.');
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

    const getConstraintTypeColor = (type) => {
        const colors = {
            'LEGAL': 'bg-red-100 text-red-800',
            'BUDGET': 'bg-green-100 text-green-800',
            'POLICY': 'bg-blue-100 text-blue-800',
            'TECHNICAL': 'bg-purple-100 text-purple-800',
            'COMPLIANCE': 'bg-orange-100 text-orange-800',
            'OTHER': 'bg-gray-100 text-gray-800'
        };
        return colors[type] || colors['OTHER'];
    };

    if (loading) return <div className="p-12 text-center text-neutral-gray-500">Loading profile...</div>;

    return (
        <div className="flex h-screen bg-neutral-white overflow-hidden">
            <div className="flex-1 flex flex-col h-full overflow-y-auto">
                <div className="max-w-4xl mx-auto w-full p-8 md:p-12">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-neutral-black mb-2 flex items-center gap-3">
                            <Building2 className="text-primary-blue" size={32} />
                            Organization Profile
                        </h1>
                        <p className="text-neutral-gray-600">Define your organization's identity and hard constraints.</p>
                    </div>

                    {/* Organization Name */}
                    <div className="bg-white p-8 rounded-2xl border border-neutral-gray-200 shadow-sm mb-6">
                        <h2 className="text-xl font-bold text-neutral-black mb-4">Organization Name</h2>
                        <div className="flex gap-4 items-center">
                            <input
                                type="text"
                                className="flex-1 p-4 border border-neutral-gray-200 rounded-xl focus:border-primary-blue focus:ring-1 focus:ring-primary-blue transition-all text-lg"
                                placeholder="e.g., Acme Corp"
                                value={orgName}
                                onChange={e => setOrgName(e.target.value)}
                            />
                            <button
                                onClick={handleSaveProfile}
                                disabled={savingProfile || !orgName}
                                className="px-6 py-4 bg-primary-blue text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {savingProfile ? 'Saving...' : profileSaved ? <><Check size={20} /> Saved</> : 'Save'}
                            </button>
                        </div>
                    </div>

                    {/* Organizational Constraints */}
                    <div className="bg-white p-8 rounded-2xl border border-neutral-gray-200 shadow-sm mb-6">
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-neutral-black mb-2">Organizational Constraints</h2>
                                    <p className="text-neutral-gray-600">
                                        Define hard rules and guardrails that decisions must respect.
                                    </p>
                                </div>
                                {!showAddForm && (
                                    <button
                                        onClick={() => setShowAddForm(true)}
                                        className="px-4 py-2 bg-primary-blue text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                                    >
                                        <Plus size={18} />
                                        Add Constraint
                                    </button>
                                )}
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-sm text-blue-800 flex items-start gap-2">
                                    <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span><strong>Auto-Applied:</strong> All constraints automatically apply to every decision in your organization. They cannot be selectively disabled.</span>
                                </p>
                            </div>
                        </div>

                        {/* Add Constraint Form */}
                        {showAddForm && (
                            <div className="mb-6 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
                                <h3 className="font-semibold text-neutral-black mb-4">Add New Constraint</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-gray-700 mb-2">
                                            Constraint Name *
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g., Budget Limit, GDPR Compliance"
                                            value={newConstraint.name}
                                            onChange={e => setNewConstraint({ ...newConstraint, name: e.target.value })}
                                            className="w-full p-3 border border-neutral-gray-200 rounded-lg focus:border-primary-blue focus:ring-1 focus:ring-primary-blue"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-gray-700 mb-2">
                                            Description/Rule *
                                        </label>
                                        <textarea
                                            placeholder="Describe the constraint rule (e.g., 'All decisions must stay under $500K budget')"
                                            value={newConstraint.description}
                                            onChange={e => setNewConstraint({ ...newConstraint, description: e.target.value })}
                                            className="w-full p-3 border border-neutral-gray-200 rounded-lg focus:border-primary-blue focus:ring-1 focus:ring-primary-blue resize-none"
                                            rows="3"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-gray-700 mb-2">
                                            Constraint Type
                                        </label>
                                        <select
                                            value={newConstraint.constraintType}
                                            onChange={e => setNewConstraint({ ...newConstraint, constraintType: e.target.value })}
                                            className="w-full p-3 border border-neutral-gray-200 rounded-lg focus:border-primary-blue focus:ring-1 focus:ring-primary-blue"
                                        >
                                            <option value="POLICY">POLICY</option>
                                            <option value="BUDGET">BUDGET</option>
                                            <option value="LEGAL">LEGAL</option>
                                            <option value="TECHNICAL">TECHNICAL</option>
                                            <option value="COMPLIANCE">COMPLIANCE</option>
                                            <option value="OTHER">OTHER</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-3 justify-end pt-2">
                                        <button
                                            onClick={() => {
                                                setShowAddForm(false);
                                                setNewConstraint({ name: '', description: '', constraintType: 'POLICY', validationConfig: {} });
                                            }}
                                            className="px-4 py-2 border border-neutral-gray-300 text-neutral-gray-700 font-medium rounded-lg hover:bg-neutral-gray-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAddConstraint}
                                            className="px-4 py-2 bg-primary-blue text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                                        >
                                            Create Constraint
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Constraints List */}
                        <div className="space-y-3">
                            {constraints.length === 0 && !showAddForm && (
                                <div className="text-center py-12 text-neutral-gray-500 border-2 border-dashed border-neutral-gray-200 rounded-xl">
                                    <Shield className="w-12 h-12 mx-auto mb-3 text-neutral-gray-400" />
                                    <p className="font-medium mb-1">No constraints defined yet</p>
                                    <p className="text-sm">Add organizational constraints to ensure decisions respect your non-negotiable rules.</p>
                                </div>
                            )}

                            {constraints.map((constraint) => (
                                <div key={constraint.id} className="flex gap-4 items-start p-5 bg-neutral-gray-50 rounded-xl border border-neutral-gray-200 hover:border-neutral-gray-300 transition-colors">
                                    <div className="flex-1">
                                        <div className="flex items-start gap-3 mb-2">
                                            <h3 className="font-semibold text-neutral-black text-lg">{constraint.name}</h3>
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getConstraintTypeColor(constraint.constraint_type)}`}>
                                                {constraint.constraint_type}
                                            </span>
                                        </div>
                                        <p className="text-neutral-gray-600 text-sm mb-2">{constraint.description}</p>
                                        <div className="text-xs text-neutral-gray-500">
                                            Created {new Date(constraint.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteConstraint(constraint.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete constraint"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Examples */}
                        {constraints.length === 0 && !showAddForm && (
                            <div className="bg-blue-50 p-4 rounded-xl mt-4">
                                <p className="text-sm font-semibold text-blue-900 mb-2">Examples:</p>
                                <ul className="text-xs text-blue-800 space-y-1">
                                    <li>• "Annual Budget: Cannot exceed $2M in total spending"</li>
                                    <li>• "Team Size: Limited to 25 full-time employees"</li>
                                    <li>• "Compliance: Must comply with SOC 2 Type II requirements"</li>
                                    <li>• "Data Residency: All data must stay within EU regions"</li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrganizationProfile;
