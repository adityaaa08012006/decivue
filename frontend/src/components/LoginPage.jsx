import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import decivueLogo from '../../assets/Main logo.png';
import Squares from './Squares';
import Aurora from './Aurora';
import ClickSpark from './ClickSpark';

export default function LoginPage({ onNavigateToRegister }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Debug: Log component lifecycle
  useEffect(() => {
    console.log('🔐 LoginPage mounted');
    return () => {
      console.log('🔐 LoginPage unmounted');
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent any parent handlers
    
    setError('');
    setLoading(true);

    console.log('🔑 Attempting login...');
    const result = await login(email, password);

    if (!result.success) {
      console.error('❌ Login failed:', result.error);
      setError(result.error);
      setLoading(false);
      // Explicitly keep the component mounted and showing error
      return false; // Prevent any default form behavior
    }
    console.log('✅ Login successful, redirecting...');
    // Success handled by AuthContext - user will be redirected
    return false;
  };

  const isFormValid = email.trim() !== '' && password.trim() !== '';

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
        <div className="w-full max-w-[580px] bg-white border border-[rgba(102,102,102,0.15)] rounded-3xl shadow-sm p-8 space-y-5">
          {/* Title */}
          <div className="text-center">
            <h1 className="text-[26px] font-semibold text-[#333]">
              Log in
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="text-xs">{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1">
              <label
                htmlFor="email"
                className="block text-[14px] text-[#666]"
              >
                Email address or user name
              </label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full h-[44px] px-3 text-sm rounded-xl border border-[rgba(102,102,102,0.35)] focus:outline-none focus:border-[#111] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-[14px] text-[#666]"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="flex items-center gap-1 text-[rgba(102,102,102,0.8)] hover:text-[#111] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  <span className="text-[14px]">
                    {showPassword ? 'Hide' : 'Show'}
                  </span>
                </button>
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full h-[44px] px-3 text-sm rounded-xl border border-[rgba(102,102,102,0.35)] focus:outline-none focus:border-[#111] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2 py-1">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-5 h-5 rounded border border-gray-300 text-[#111] focus:ring-2 focus:ring-[#111] cursor-pointer"
              />
              <label
                htmlFor="remember"
                className="text-[14px] text-[#333] cursor-pointer"
              >
                Remember me
              </label>
            </div>

            {/* Terms */}
            <div className="py-1">
              <p className="text-[13px] text-[#333]">
                By continuing, you agree to the{' '}
                <a href="#" onClick={(e) => e.preventDefault()} className="text-[#111] underline hover:no-underline">
                  Terms of use
                </a>{' '}
                and{' '}
                <a href="#" onClick={(e) => e.preventDefault()} className="text-[#111] underline hover:no-underline">
                  Privacy Policy
                </a>
                .
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isFormValid || loading}
              className={`w-full h-[48px] rounded-[24px] text-[16px] font-semibold text-white transition-all ${
                isFormValid && !loading
                  ? 'bg-[#111] hover:bg-[#333] cursor-pointer'
                  : 'bg-[#111] opacity-25 cursor-not-allowed'
              }`}
            >
              {loading ? 'Signing in...' : 'Log in'}
            </button>
          </form>

          {/* Footer Links */}
          <div className="flex flex-col items-center gap-4 pt-2">
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="text-[13px] font-semibold text-[#111] underline hover:no-underline"
            >
              Forget your password
            </a>
            <p className="text-[13px] text-[#666]">
              Don't have an account?{' '}
              <button
                onClick={onNavigateToRegister}
                className="font-semibold text-[#111] underline hover:no-underline"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
    </ClickSpark>
  );
}
