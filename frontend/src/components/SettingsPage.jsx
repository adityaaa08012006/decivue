import React, { useState } from 'react';
import { LogOut, Moon, Sun, User, Bell, Shield, Palette, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const SettingsPage = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <div className="flex h-screen bg-neutral-white dark:bg-neutral-gray-900 overflow-hidden">
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full p-8">
          {/* Debug Banner - Remove after testing */}
          <div className="mb-4 p-3 rounded-lg border-2 border-primary-blue bg-blue-50 dark:bg-blue-900/20">
            <p className="text-sm font-mono text-neutral-black dark:text-white">
              🔧 Debug: isDarkMode = {isDarkMode ? 'true' : 'false'} | 
              HTML class = "{document.documentElement.className}"
            </p>
          </div>
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-neutral-black dark:text-white mb-2">Settings</h1>
            <p className="text-neutral-gray-600 dark:text-neutral-gray-400">Manage your account and preferences</p>
          </div>

          {/* Account Section */}
          <div className="bg-white dark:bg-neutral-gray-800 rounded-xl border border-neutral-gray-200 dark:border-neutral-gray-700 p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <User className="text-primary-blue" size={24} />
              <h2 className="text-xl font-bold text-neutral-black dark:text-white">Account</h2>
            </div>

            {/* User Info */}
            <div className="space-y-4 mb-6 pb-6 border-b border-neutral-gray-200 dark:border-neutral-gray-700">
              <div>
                <label className="text-sm font-semibold text-neutral-gray-700 dark:text-neutral-gray-300">Name</label>
                <p className="mt-1 text-neutral-black dark:text-white">{user?.fullName || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-neutral-gray-700 dark:text-neutral-gray-300">Email</label>
                <p className="mt-1 text-neutral-black dark:text-white">{user?.email || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-neutral-gray-700 dark:text-neutral-gray-300">Role</label>
                <div className="mt-2">
                  <span className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                    user?.role === 'lead'
                      ? 'bg-primary-blue text-white'
                      : 'bg-neutral-gray-200 text-neutral-gray-700'
                  }`}>
                    {user?.role === 'lead' ? 'Organization Lead' : 'Team Member'}
                  </span>
                </div>
              </div>
              {user?.role === 'lead' && user?.orgCode && (
                <div>
                  <label className="text-sm font-semibold text-neutral-gray-700 dark:text-neutral-gray-300">Organization Code</label>
                  <p className="mt-1">
                    <span className="font-mono bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-3 py-1.5 rounded font-semibold text-sm">
                      {user.orgCode}
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogoutClick}
              className="flex items-center gap-3 px-4 py-3 text-white bg-primary-red hover:bg-red-600 rounded-xl w-full transition-all font-medium shadow-sm"
            >
              <LogOut size={20} strokeWidth={2} />
              <span>Log out of your account</span>
            </button>
          </div>

          {/* Appearance Section */}
          <div className="bg-white dark:bg-neutral-gray-800 rounded-xl border border-neutral-gray-200 dark:border-neutral-gray-700 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Palette className="text-primary-blue" size={24} />
              <h2 className="text-xl font-bold text-neutral-black dark:text-white">Appearance</h2>
            </div>

            {/* Dark Mode - Functional */}
            <div className="flex items-center justify-between p-4 bg-neutral-gray-50 dark:bg-neutral-gray-700 rounded-lg border border-neutral-gray-200 dark:border-neutral-gray-600">
              <div className="flex items-center gap-3">
                {isDarkMode ? 
                  <Moon className="text-primary-blue" size={20} /> : 
                  <Sun className="text-primary-blue" size={20} />
                }
                <div>
                  <p className="font-medium text-neutral-black dark:text-white">Dark Mode</p>
                  <p className="text-sm text-neutral-gray-600 dark:text-neutral-gray-400">Switch between light and dark themes</p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className="relative inline-block w-12 h-6 transition-colors"
                aria-label="Toggle dark mode"
              >
                <div className={`w-12 h-6 rounded-full transition-colors ${
                  isDarkMode ? 'bg-primary-blue' : 'bg-neutral-gray-300'
                }`}></div>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  isDarkMode ? 'left-7' : 'left-1'
                }`}></div>
              </button>
            </div>
          </div>

          {/* Additional Settings Placeholders */}
          <div className="mt-6 bg-white dark:bg-neutral-gray-800 rounded-xl border border-neutral-gray-200 dark:border-neutral-gray-700 p-6 shadow-sm opacity-60">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="text-neutral-gray-500 dark:text-neutral-gray-400" size={24} />
              <h2 className="text-xl font-bold text-neutral-black dark:text-white">Notifications</h2>
            </div>
            <p className="text-sm text-neutral-gray-600 dark:text-neutral-gray-400">
              Notification preferences will be available soon
            </p>
          </div>

          <div className="mt-6 bg-white dark:bg-neutral-gray-800 rounded-xl border border-neutral-gray-200 dark:border-neutral-gray-700 p-6 shadow-sm opacity-60">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="text-neutral-gray-500 dark:text-neutral-gray-400" size={24} />
              <h2 className="text-xl font-bold text-neutral-black dark:text-white">Security</h2>
            </div>
            <p className="text-sm text-neutral-gray-600 dark:text-neutral-gray-400">
              Security settings and password management coming soon
            </p>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={handleCancelLogout}
          ></div>

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-neutral-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                    <LogOut className="text-primary-red dark:text-red-400" size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-neutral-black dark:text-white">Log Out</h2>
                </div>
                <button
                  onClick={handleCancelLogout}
                  className="p-1 hover:bg-neutral-gray-100 dark:hover:bg-neutral-gray-700 rounded-lg transition-colors"
                >
                  <X size={20} className="text-neutral-gray-600 dark:text-neutral-gray-400" />
                </button>
              </div>

              {/* Content */}
              <p className="text-neutral-gray-700 dark:text-neutral-gray-300 mb-6">
                Are you sure you want to log out of your account?
              </p>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancelLogout}
                  className="px-5 py-2.5 bg-neutral-gray-100 dark:bg-neutral-gray-700 text-neutral-gray-700 dark:text-neutral-gray-200 font-medium rounded-xl hover:bg-neutral-gray-200 dark:hover:bg-neutral-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmLogout}
                  className="px-5 py-2.5 bg-primary-red text-white font-medium rounded-xl hover:bg-red-600 transition-colors shadow-sm"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SettingsPage;
