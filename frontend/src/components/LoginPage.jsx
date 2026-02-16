import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import decivueLogo from '../../assets/Main logo.png';

export default function LoginPage({ onNavigateToRegister }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
    // Success handled by AuthContext - user will be redirected
  };

  const isFormValid = email.trim() !== '' && password.trim() !== '';

  return (
    <div className="bg-white h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 h-[60px] flex items-center justify-center px-8 flex-shrink-0">
        <img src={decivueLogo} alt="Decivue" className="h-8" />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center py-8 px-4 overflow-hidden">
        <div className="w-full max-w-[580px] space-y-5">
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
                <a href="#" className="text-[#111] underline hover:no-underline">
                  Terms of use
                </a>{' '}
                and{' '}
                <a href="#" className="text-[#111] underline hover:no-underline">
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
      </main>
    </div>
  );
}
