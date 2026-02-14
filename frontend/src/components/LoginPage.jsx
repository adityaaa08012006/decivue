import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, AlertCircle } from 'lucide-react';

export default function LoginPage({ onNavigateToRegister }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  return (
    <div className="min-h-screen bg-neutral-white dark:bg-neutral-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-gray-800 p-8 rounded-xl shadow-lg border border-neutral-gray-200 dark:border-neutral-gray-700 w-full max-w-md">
        {/* Logo and Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <LogIn className="w-8 h-8 text-primary-red" strokeWidth={2} />
            <h1 className="text-2xl font-bold text-neutral-black dark:text-white">Decivue</h1>
          </div>
          <p className="text-sm text-neutral-gray-600 dark:text-neutral-gray-400">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-gray-700 dark:text-neutral-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-neutral-gray-300 dark:border-neutral-gray-600 bg-white dark:bg-neutral-gray-700 text-neutral-black dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-gray-700 dark:text-neutral-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2.5 border border-neutral-gray-300 dark:border-neutral-gray-600 bg-white dark:bg-neutral-gray-700 text-neutral-black dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-red text-white py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-neutral-gray-600 dark:text-neutral-gray-400">
            Don't have an account?{' '}
            <button
              onClick={onNavigateToRegister}
              className="text-primary-blue hover:underline font-medium"
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
