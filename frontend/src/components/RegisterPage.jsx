import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, Building2, Users, AlertCircle, CheckCircle, Copy } from 'lucide-react';

export default function RegisterPage({ onNavigateToLogin }) {
  const { registerCreateOrg, registerJoinOrg } = useAuth();
  const [mode, setMode] = useState('create'); // 'create' or 'join'

  // Common fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Create org fields
  const [organizationName, setOrganizationName] = useState('');

  // Join org fields
  const [orgCode, setOrgCode] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [generatedOrgCode, setGeneratedOrgCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    let result;
    if (mode === 'create') {
      result = await registerCreateOrg(email, password, fullName, organizationName);
      if (result.success) {
        setGeneratedOrgCode(result.orgCode);
        setSuccessMessage(
          `Organization created successfully! Share this code with your team:`
        );
        // User will be auto-logged in and redirected after a short delay
        setTimeout(() => {
          // AuthContext will handle redirect
        }, 3000);
      }
    } else {
      result = await registerJoinOrg(email, password, fullName, orgCode);
      // User will be auto-logged in and redirected
    }

    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
  };

  const copyOrgCode = () => {
    if (generatedOrgCode) {
      navigator.clipboard.writeText(generatedOrgCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-white flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-neutral-gray-200 w-full max-w-md">
        {/* Logo and Title */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="w-8 h-8 text-primary-red" strokeWidth={2} />
            <h1 className="text-2xl font-bold text-neutral-black">Decivue</h1>
          </div>
          <p className="text-sm text-neutral-gray-600">Create your account</p>
        </div>

        {/* Mode Selector */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
              mode === 'create'
                ? 'bg-primary-blue text-white shadow-sm'
                : 'bg-neutral-gray-100 text-neutral-gray-700 hover:bg-neutral-gray-200'
            }`}
          >
            <Building2 className="w-4 h-4 inline mr-2" strokeWidth={2} />
            Create Organization
          </button>
          <button
            type="button"
            onClick={() => setMode('join')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
              mode === 'join'
                ? 'bg-primary-blue text-white shadow-sm'
                : 'bg-neutral-gray-100 text-neutral-gray-700 hover:bg-neutral-gray-200'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" strokeWidth={2} />
            Join Team
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              <div className="flex items-start gap-2 mb-2">
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm font-medium">{successMessage}</span>
              </div>
              {generatedOrgCode && (
                <div className="mt-3 p-3 bg-green-100 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-lg font-bold text-green-900">
                      {generatedOrgCode}
                    </span>
                    <button
                      type="button"
                      onClick={copyOrgCode}
                      className="p-2 hover:bg-green-200 rounded transition-colors"
                      title="Copy to clipboard"
                    >
                      {codeCopied ? (
                        <CheckCircle className="w-5 h-5 text-green-700" />
                      ) : (
                        <Copy className="w-5 h-5 text-green-700" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-green-800 mt-2">
                    Redirecting to dashboard...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Common Fields */}
          <div>
            <label className="block text-sm font-medium text-neutral-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-neutral-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-neutral-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2.5 border border-neutral-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all"
              placeholder="Min 8 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2.5 border border-neutral-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all"
              placeholder="Repeat password"
            />
          </div>

          {/* Mode-Specific Fields */}
          {mode === 'create' && (
            <div>
              <label className="block text-sm font-medium text-neutral-gray-700 mb-2">
                Organization Name
              </label>
              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-neutral-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all"
                placeholder="Acme Corp"
              />
              <p className="text-xs text-neutral-gray-500 mt-2">
                You'll receive a code to share with your team
              </p>
            </div>
          )}

          {mode === 'join' && (
            <div>
              <label className="block text-sm font-medium text-neutral-gray-700 mb-2">
                Organization Code
              </label>
              <input
                type="text"
                value={orgCode}
                onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                required
                className="w-full px-4 py-2.5 border border-neutral-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all font-mono tracking-wider"
                placeholder="ORG-XXXX"
                maxLength={8}
              />
              <p className="text-xs text-neutral-gray-500 mt-2">
                Ask your organization lead for the code
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-red text-white py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {loading
              ? 'Creating account...'
              : mode === 'create'
              ? 'Create Organization'
              : 'Join Organization'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-neutral-gray-600">
            Already have an account?{' '}
            <button
              onClick={onNavigateToLogin}
              className="text-primary-blue hover:underline font-medium"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
