import React, { useState, useEffect } from 'react';
import { Building2, Trash2, Plus, Check } from 'lucide-react';
import api from '../services/api';

const OrganizationProfile = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Form State - Simplified to just name and constraints
    const [formData, setFormData] = useState({
        name: '',
        constraints: [] // Array of { name: string, rule: string }
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const data = await api.getProfile();
            if (data) {
                // Ensure constraints is always an array
                setFormData({
                    name: data.name || '',
                    constraints: Array.isArray(data.constraints) ? data.constraints : []
                });
            }
        } catch (error) {
            console.error("Failed to load profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await api.updateProfile(formData);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error("Failed to save profile:", error);
        } finally {
            setSaving(false);
        }
    };

    const addConstraint = () => {
        setFormData(prev => ({
            ...prev,
            constraints: [...prev.constraints, { name: '', rule: '' }]
        }));
    };

    const removeConstraint = (index) => {
        setFormData(prev => ({
            ...prev,
            constraints: prev.constraints.filter((_, i) => i !== index)
        }));
    };

    const updateConstraint = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            constraints: prev.constraints.map((c, i) =>
                i === index ? { ...c, [field]: value } : c
            )
        }));
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
                        <input
                            type="text"
                            className="w-full p-4 border border-neutral-gray-200 rounded-xl focus:border-primary-blue focus:ring-1 focus:ring-primary-blue transition-all text-lg"
                            placeholder="e.g., Acme Corp"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    {/* Organizational Constraints */}
                    <div className="bg-white p-8 rounded-2xl border border-neutral-gray-200 shadow-sm mb-6">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-neutral-black mb-2">Organizational Constraints</h2>
                            <p className="text-neutral-gray-600 mb-3">
                                Define hard rules and guardrails that decisions must respect. These are non-negotiable facts about your organization.
                            </p>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-sm text-blue-800">
                                    <strong>Note:</strong> These constraints automatically apply to ALL decisions in your organization. They cannot be selectively applied or disabled.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Constraint List */}
                            {formData.constraints.map((constraint, index) => (
                                <div key={index} className="flex gap-4 items-start p-4 bg-neutral-gray-50 rounded-xl">
                                    <div className="flex-1 space-y-3">
                                        <input
                                            type="text"
                                            placeholder="Constraint name (e.g., 'Budget Limit', 'GDPR Compliance')"
                                            value={constraint.name}
                                            onChange={e => updateConstraint(index, 'name', e.target.value)}
                                            className="w-full p-3 border border-neutral-gray-200 rounded-lg focus:border-primary-blue focus:ring-1 focus:ring-primary-blue transition-all font-semibold"
                                        />
                                        <textarea
                                            placeholder="Rule/Fact (e.g., 'Cannot exceed $500K per decision', 'Must comply with EU GDPR')"
                                            value={constraint.rule}
                                            onChange={e => updateConstraint(index, 'rule', e.target.value)}
                                            className="w-full p-3 border border-neutral-gray-200 rounded-lg focus:border-primary-blue focus:ring-1 focus:ring-primary-blue transition-all resize-none"
                                            rows="2"
                                        />
                                    </div>
                                    <button
                                        onClick={() => removeConstraint(index)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Remove constraint"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            ))}

                            {/* Empty State */}
                            {formData.constraints.length === 0 && (
                                <div className="text-center py-8 text-neutral-gray-500 border-2 border-dashed border-neutral-gray-200 rounded-xl">
                                    <p className="mb-2 font-medium">No constraints defined yet.</p>
                                    <p className="text-sm">Add organizational constraints to ensure decisions respect your non-negotiable rules.</p>
                                </div>
                            )}

                            {/* Add Constraint Button */}
                            <button
                                onClick={addConstraint}
                                className="w-full p-4 border-2 border-dashed border-neutral-gray-300 rounded-xl text-neutral-gray-600 hover:border-primary-blue hover:text-primary-blue transition-all flex items-center justify-center gap-2 font-medium"
                            >
                                <Plus size={20} />
                                Add Organizational Constraint
                            </button>

                            {/* Examples */}
                            <div className="bg-blue-50 p-4 rounded-xl mt-4">
                                <p className="text-sm font-semibold text-blue-900 mb-2">Examples:</p>
                                <ul className="text-xs text-blue-800 space-y-1">
                                    <li>• "Annual Budget: Cannot exceed $2M in total spending"</li>
                                    <li>• "Team Size: Limited to 25 full-time employees"</li>
                                    <li>• "Compliance: Must comply with SOC 2 Type II requirements"</li>
                                    <li>• "Data Residency: All data must stay within EU regions"</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={handleSave}
                            disabled={saving || !formData.name}
                            className="px-8 py-3 bg-primary-blue text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {saving ? (
                                <>Saving...</>
                            ) : saved ? (
                                <>
                                    <Check size={20} />
                                    Saved
                                </>
                            ) : (
                                <>Save Profile</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrganizationProfile;
