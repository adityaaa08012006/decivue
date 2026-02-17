import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, Building2, Users, AlertCircle, CheckCircle, Copy, Eye, EyeOff } from 'lucide-react';
import decivueLogo from '../../assets/Main logo.png';
import illustrationImg from '../../assets/Illustration.png';
import Squares from './Squares';
import Aurora from './Aurora';
import ClickSpark from './ClickSpark';

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

  const [showPassword, setShowPassword] = useState(false);
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

  const isFormValid = () => {
    if (!fullName || !email || !password || !confirmPassword) return false;
    if (password !== confirmPassword) return false;
    if (password.length < 8) return false;
    if (mode === 'create' && !organizationName) return false;
    if (mode === 'join' && !orgCode) return false;
    return true;
  };

  return (
    <ClickSpark
      sparkColor='#3b82f6'
      sparkSize={14}
      sparkRadius={25}
      sparkCount={8}
      duration={400}
    >
    <div className="h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated Squares Background */}
      <div className="fixed inset-0 z-0">
        <Squares
          speed={0.28}
          squareSize={40}
          direction="diagonal"
          borderColor="rgba(59, 130, 246, 0.4)"
          hoverFillColor="rgba(59, 130, 246, 0.2)"
        />
      </div>
      
      {/* Aurora Animated Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#f8faff] via-[#f0f4ff] to-[#fafbff] opacity-70">
        <Aurora
          colorStops={["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"]}
          amplitude={0.5}
          blend={0.35}
        />
      </div>
      
      {/* Subtle overlay for depth */}
      <div className="fixed inset-0 bg-white/20 pointer-events-none" />
      
      {/* Logo on right side */}
      <div className="fixed top-6 right-6 z-20">
        <img src={decivueLogo} alt="Decivue" className="h-10" />
      </div>

      {/* Main Content */}
      <div className="w-full flex items-center justify-center px-4 relative z-10">
        <div className="max-w-[1000px] w-full h-[calc(100vh-48px)] bg-white/40 backdrop-blur-[120px] border border-white/50 rounded-3xl overflow-hidden shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
          <div className="grid lg:grid-cols-2 gap-0 h-full">
            {/* Left Column - Form */}
            <div className="p-6 lg:p-8 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
              <h1 className="text-[24px] font-semibold text-[#111] mb-1">
                {mode === 'create' ? 'Create Organization' : 'Join Team'}
              </h1>
              <p className="text-[#666] text-[13px] mb-4">
                {mode === 'create' 
                  ? 'Set up your organization and invite your team'
                  : 'Enter your details and organization code to join'}
              </p>

              {/* Mode Selector */}
              <div className="flex gap-2 mb-4 p-1 bg-[#f5f5f5] rounded-xl">
                <button
                  type="button"
                  onClick={() => setMode('create')}
                  className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                    mode === 'create'
                      ? 'bg-white text-[#111] shadow-sm'
                      : 'text-[#666] hover:text-[#111]'
                  }`}
                >
                  <Building2 className="w-4 h-4 inline mr-2" strokeWidth={2} />
                  Create Org
                </button>
                <button
                  type="button"
                  onClick={() => setMode('join')}
                  className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                    mode === 'join'
                      ? 'bg-white text-[#111] shadow-sm'
                      : 'text-[#666] hover:text-[#111]'
                  }`}
                >
                  <Users className="w-4 h-4 inline mr-2" strokeWidth={2} />
                  Join Team
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="text-xs">{error}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-xl">
                    <div className="flex items-start gap-2 mb-1">
                      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span className="text-xs font-medium">{successMessage}</span>
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

                {/* Full Name */}
                <div>
                  <label className="block text-[#111] text-xs font-medium mb-1">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full h-[44px] px-3 text-sm border border-[rgba(102,102,102,0.35)] rounded-xl text-[#111] focus:outline-none focus:border-[#111] transition-colors"
                    placeholder="John Doe"
                  />
                </div>

                {/* Organization Name (Create mode only) */}
                {mode === 'create' && (
                  <div>
                    <label className="block text-[#111] text-xs font-medium mb-1">
                      Organization name
                    </label>
                    <input
                      type="text"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      required
                      className="w-full h-[44px] px-3 text-sm border border-[rgba(102,102,102,0.35)] rounded-xl text-[#111] focus:outline-none focus:border-[#111] transition-colors"
                      placeholder="Acme Corp"
                    />
                  </div>
                )}

                {/* Organization Code (Join mode only) */}
                {mode === 'join' && (
                  <div>
                    <label className="block text-[#111] text-xs font-medium mb-1">
                      Organization code
                    </label>
                    <input
                      type="text"
                      value={orgCode}
                      onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                      required
                      className="w-full h-[44px] px-3 text-sm border border-[rgba(102,102,102,0.35)] rounded-xl text-[#111] font-mono tracking-wider focus:outline-none focus:border-[#111] transition-colors"
                      placeholder="ORG-XXXX"
                      maxLength={8}
                    />
                    <p className="text-[10px] text-[#666] mt-1">
                      Ask your organization lead for the code
                    </p>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-[#111] text-xs font-medium mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-[44px] px-3 text-sm border border-[rgba(102,102,102,0.35)] rounded-xl text-[#111] focus:outline-none focus:border-[#111] transition-colors"
                    placeholder="you@example.com"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[#111] text-xs font-medium mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full h-[44px] px-3 pr-20 text-sm border border-[rgba(102,102,102,0.35)] rounded-xl text-[#111] focus:outline-none focus:border-[#111] transition-colors"
                      placeholder="Min 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[#666] hover:text-[#111] transition-colors text-xs"
                    >
                      {showPassword ? (
                        <>
                          <EyeOff className="w-4 h-4" />
                          <span className="text-xs">Hide</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          <span className="text-xs">Show</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-[#111] text-xs font-medium mb-1">
                    Confirm password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full h-[44px] px-3 text-sm border border-[rgba(102,102,102,0.35)] rounded-xl text-[#111] focus:outline-none focus:border-[#111] transition-colors"
                    placeholder="Repeat password"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !isFormValid()}
                  className="w-full h-[48px] bg-[#111] text-white rounded-[24px] font-medium text-sm hover:bg-[#333] disabled:opacity-25 disabled:cursor-not-allowed transition-all mt-3"
                >
                  {loading
                    ? 'Creating account...'
                    : mode === 'create'
                    ? 'Create organization'
                    : 'Join organization'}
                </button>

                {/* Login Link */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={onNavigateToLogin}
                    className="text-[#666] hover:text-[#111] text-xs transition-colors"
                  >
                    Already have an account? <span className="underline">Log in</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column - Illustration */}
            <div className="hidden lg:flex items-center justify-center bg-transparent p-8">
              <div className="w-full max-w-[280px] flex items-center justify-center">
                <img src={illustrationImg} alt="Team Collaboration" className="w-full h-auto" />
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
    </ClickSpark>
  );
}
