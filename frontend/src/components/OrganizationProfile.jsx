import React, { useState, useEffect } from 'react';
import {
    Building2, Users, Target, Shield, ArrowRight, Check, Sparkles,
    BarChart3, Zap, Scale, HeartHandshake, Rocket
} from 'lucide-react';
import api from '../services/api';

const OrganizationProfile = () => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [completed, setCompleted] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        industry: '',
        size: '',
        decision_style: '', // 'data', 'leadership', 'consensus', 'fast', 'cautious'
        risk_tolerance: 50, // 0-100
        strategic_priorities: [], // max 3
        constraints: {} // optional
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const data = await api.getProfile();
            if (data) {
                setFormData(data);
                // If data exists, maybe go to summary view? For now, start at 1 but pre-filled.
            }
        } catch (error) {
            console.error("Failed to load profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);

    const handleSave = async () => {
        try {
            setSaving(true);
            await api.updateProfile(formData);
            setCompleted(true);
        } catch (error) {
            console.error("Failed to save profile:", error);
        } finally {
            setSaving(false);
        }
    };

    const togglePriority = (p) => {
        setFormData(prev => {
            if (prev.strategic_priorities.includes(p)) {
                return { ...prev, strategic_priorities: prev.strategic_priorities.filter(i => i !== p) };
            }
            if (prev.strategic_priorities.length >= 3) return prev;
            return { ...prev, strategic_priorities: [...prev.strategic_priorities, p] };
        });
    };

    // Step Components
    const ProgressBar = () => (
        <div className="w-full bg-neutral-gray-100 h-1 mb-8 rounded-full overflow-hidden">
            <div
                className="bg-primary-blue h-full transition-all duration-500 ease-out"
                style={{ width: `${(step / 5) * 100}%` }}
            />
        </div>
    );

    if (loading) return <div className="p-12 text-center text-neutral-gray-500">Loading profile...</div>;

    if (completed) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center animate-fade-in-up">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600">
                    <Check size={40} />
                </div>
                <h2 className="text-3xl font-bold text-neutral-black mb-4">Organizational Context Set</h2>
                <p className="text-xl text-neutral-gray-600 max-w-lg mb-8">
                    Decivue now understands how your organization thinks. We'll use this context to monitor decision drift and alignment.
                </p>
                <button
                    onClick={() => setCompleted(false)}
                    className="text-primary-blue font-medium hover:underline"
                >
                    Review Settings
                </button>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-neutral-white overflow-hidden">
            <div className="flex-1 flex flex-col h-full overflow-y-auto">
                <div className="max-w-3xl mx-auto w-full p-8 md:p-12">

                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-bold text-neutral-black mb-2">Organization Profile</h1>
                        <p className="text-neutral-gray-600">Help Decivue understand how your organization operates.</p>
                    </div>

                    <ProgressBar />

                    {/* Step 1: Basics */}
                    {step === 1 && (
                        <div className="space-y-8 animate-fade-in-up">
                            <div className="bg-white p-8 rounded-2xl border border-neutral-gray-200 shadow-sm">
                                <h2 className="text-xl font-bold text-neutral-black mb-6 flex items-center gap-2">
                                    <Building2 className="text-primary-blue" /> Organization Basics
                                </h2>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-neutral-gray-700 mb-2">Organization Name</label>
                                        <input
                                            type="text"
                                            className="w-full p-4 border border-neutral-gray-200 rounded-xl focus:border-primary-blue focus:ring-1 focus:ring-primary-blue transition-all"
                                            placeholder="e.g. Acme Corp"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-neutral-gray-700 mb-2">Industry</label>
                                        <select
                                            className="w-full p-4 border border-neutral-gray-200 rounded-xl bg-white"
                                            value={formData.industry}
                                            onChange={e => setFormData({ ...formData, industry: e.target.value })}
                                        >
                                            <option value="">Select Industry...</option>
                                            <option value="SaaS">SaaS / Technology</option>
                                            <option value="Fintech">Fintech</option>
                                            <option value="Healthcare">Healthcare</option>
                                            <option value="E-commerce">E-commerce</option>
                                            <option value="Manufacturing">Manufacturing</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-neutral-gray-700 mb-3">Organization Size</label>
                                        <div className="flex flex-wrap gap-3">
                                            {['1-10', '10-50', '50-200', '200+'].map(size => (
                                                <button
                                                    key={size}
                                                    onClick={() => setFormData({ ...formData, size })}
                                                    className={`px-6 py-2 rounded-full border transition-all ${formData.size === size
                                                            ? 'bg-blue-50 border-primary-blue text-primary-blue font-semibold'
                                                            : 'border-neutral-gray-200 text-neutral-gray-600 hover:border-neutral-gray-400'
                                                        }`}
                                                >
                                                    {size}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Decision Style */}
                    {step === 2 && (
                        <div className="space-y-8 animate-fade-in-up">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-neutral-black">How does your org make decisions?</h2>
                                <p className="text-neutral-gray-600 mt-2">Pick the style that best fits your culture.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { id: 'Data-driven', icon: BarChart3, title: 'Data-Driven', desc: 'Metrics first. We trust numbers over gut feel.' },
                                    { id: 'Leadership-driven', icon: Zap, title: 'Leadership-Driven', desc: 'Decisive action from the top down.' },
                                    { id: 'Consensus', icon: Users, title: 'Consensus-Based', desc: 'We debate until everyone is aligned.' },
                                    { id: 'Fast-moving', icon: Rocket, title: 'Fast & Experimental', desc: 'Move fast, break things, iterate quickly.' },
                                    { id: 'Cautious', icon: Shield, title: 'Highly Cautious', desc: 'Risk aversion is key. We measure twice, cut once.' }
                                ].map(style => (
                                    <button
                                        key={style.id}
                                        onClick={() => setFormData({ ...formData, decision_style: style.id })}
                                        className={`p-6 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] ${formData.decision_style === style.id
                                                ? 'border-primary-blue bg-blue-50 shadow-md ring-1 ring-primary-blue'
                                                : 'border-neutral-gray-200 hover:border-blue-200 bg-white'
                                            }`}
                                    >
                                        <style.icon className={`mb-4 w-8 h-8 ${formData.decision_style === style.id ? 'text-primary-blue' : 'text-neutral-gray-400'}`} />
                                        <h3 className="font-bold text-lg text-neutral-black mb-1">{style.title}</h3>
                                        <p className="text-sm text-neutral-gray-600">{style.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Strategic Priorities */}
                    {step === 3 && (
                        <div className="space-y-8 animate-fade-in-up">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-neutral-black">What do you prioritize most?</h2>
                                <p className="text-neutral-gray-600 mt-2">Select up to 3 core priorities.</p>
                            </div>

                            <div className="flex flex-wrap justify-center gap-4">
                                {[
                                    'Growth', 'Stability', 'Cost Efficiency', 'Innovation',
                                    'Market Leadership', 'Speed to Market', 'Customer Satisfaction', 'Compliance'
                                ].map(p => (
                                    <button
                                        key={p}
                                        onClick={() => togglePriority(p)}
                                        className={`px-6 py-3 rounded-xl border-2 font-medium transition-all ${formData.strategic_priorities.includes(p)
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg transform scale-105'
                                                : 'bg-white border-neutral-gray-200 text-neutral-gray-600 hover:border-blue-200'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                            <p className="text-center text-sm text-neutral-gray-500 mt-4">
                                {formData.strategic_priorities.length} / 3 selected
                            </p>
                        </div>
                    )}

                    {/* Step 4: Risk Tolerance */}
                    {step === 4 && (
                        <div className="space-y-8 animate-fade-in-up">
                            <div className="bg-white p-10 rounded-2xl border border-neutral-gray-200 shadow-sm text-center">
                                <h2 className="text-xl font-bold text-neutral-black mb-2 flex items-center justify-center gap-2">
                                    <Scale className="text-primary-blue" /> Risk Appetite
                                </h2>
                                <p className="text-neutral-gray-600 mb-10">How much risk is your organization willing to take?</p>

                                <div className="relative px-4 py-8">
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={formData.risk_tolerance}
                                        onChange={e => setFormData({ ...formData, risk_tolerance: parseInt(e.target.value) })}
                                        className="w-full h-3 bg-neutral-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-blue"
                                    />
                                    <div className="flex justify-between mt-4 text-sm font-semibold text-neutral-gray-500 uppercase tracking-wide">
                                        <span>Highly Cautious</span>
                                        <span>Balanced</span>
                                        <span>Aggressive</span>
                                    </div>
                                </div>

                                <div className="mt-8 p-4 bg-neutral-gray-50 rounded-xl inline-block">
                                    <span className="text-neutral-gray-500 text-sm font-medium">Current Setting: </span>
                                    <span className="text-primary-blue font-bold text-lg ml-2">
                                        {formData.risk_tolerance < 33 ? 'Conservative' : formData.risk_tolerance > 66 ? 'Aggressive' : 'Balanced'} ({formData.risk_tolerance})
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Constraints (Optional) */}
                    {step === 5 && (
                        <div className="space-y-8 animate-fade-in-up">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-neutral-black">Any hard guardrails?</h2>
                                <p className="text-neutral-gray-600 mt-2">Optional: Add specific constraints we should know about.</p>
                            </div>

                            <div className="bg-white p-8 rounded-2xl border border-neutral-gray-200 shadow-sm space-y-4 opacity-75">
                                <div className="p-4 border border-dashed border-neutral-gray-300 rounded-xl text-center text-neutral-gray-500">
                                    <p>Constraint editing coming soon.</p>
                                    <p className="text-xs mt-1">For now, we'll skip this step.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex justify-between mt-12 pt-6 border-t border-neutral-gray-100">
                        <button
                            onClick={handleBack}
                            disabled={step === 1}
                            className={`px-6 py-3 rounded-xl font-medium transition-colors ${step === 1 ? 'text-neutral-gray-300 cursor-not-allowed' : 'text-neutral-gray-600 hover:bg-neutral-gray-100'
                                }`}
                        >
                            Back
                        </button>

                        {step < 5 ? (
                            <button
                                onClick={handleNext}
                                disabled={step === 1 && !formData.name} // Basic validation
                                className="px-8 py-3 bg-primary-blue text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none"
                            >
                                Continue <ArrowRight size={18} />
                            </button>
                        ) : (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-8 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2 shadow-lg shadow-green-200"
                            >
                                {saving ? 'Saving...' : 'Finish Setup'} <Sparkles size={18} />
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default OrganizationProfile;
