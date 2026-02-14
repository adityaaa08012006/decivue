import React, { useState } from 'react';
import { Plus, ArrowRight, PanelRightOpen, Clock, ChevronDown } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import Sidebar from './components/Sidebar';
import DecisionHealthOverview from './components/DecisionHealthOverview';
import DecisionLogTable from './components/DecisionLogTable';
import OrganisationOverview from './components/OrganisationOverview';
import DecisionMonitoring from './components/DecisionMonitoring';
import AssumptionsPage from './components/AssumptionsPage';
import OrganizationProfile from './components/OrganizationProfile';
import NotificationsPage from './components/NotificationsPage';
import DecisionFlow from './components/DecisionFlow';
import AddDecisionModal from './components/AddDecisionModal';
import api from './services/api';

function AppContent() {
  const { user, loading, logout, isLead } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' or 'register'
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [showAddDecisionModal, setShowAddDecisionModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showTimeSimMenu, setShowTimeSimMenu] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);

  const handleNavigate = (viewId) => {
    setCurrentView(viewId);
  };

  const handleDecisionCreated = () => {
    // Trigger refresh by changing key
    setRefreshKey(prev => prev + 1);
  };

  const handleTimeSimulation = async (days) => {
    try {
      setSimulating(true);
      setShowTimeSimMenu(false);
      setSimulationResult(null);

      const result = await api.simulateTime(days);

      setSimulationResult({
        success: true,
        days,
        evaluatedCount: result.evaluatedCount || 0,
        healthChanges: result.healthChanges || 0,
        lifecycleChanges: result.lifecycleChanges || 0,
        newNotifications: result.newNotifications || 0,
      });

      // Refresh the dashboard
      setRefreshKey(prev => prev + 1);

      // Auto-dismiss result after 5 seconds
      setTimeout(() => setSimulationResult(null), 5000);
    } catch (error) {
      console.error('Time simulation failed:', error);
      setSimulationResult({
        success: false,
        error: error.message || 'Simulation failed',
      });
      setTimeout(() => setSimulationResult(null), 5000);
    } finally {
      setSimulating(false);
    }
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mx-auto"></div>
          <p className="mt-4 text-neutral-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login/register
  if (!user) {
    if (authView === 'login') {
      return <LoginPage onNavigateToRegister={() => setAuthView('register')} />;
    }
    return <RegisterPage onNavigateToLogin={() => setAuthView('login')} />;
  }

  // Authenticated - show main app
  return (
    <div className="flex h-screen bg-neutral-white overflow-hidden">
      {/* Left Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        refreshKey={refreshKey}
        user={user}
        onLogout={logout}
      />

      {/* Main Content */}
      <div className="flex-1 h-screen flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {currentView === 'dashboard' && (
            <div className="p-8">
              {/* Header with Add Decision Input and Time Simulation */}
              <div className="mb-8 flex items-center gap-4">
                <div className="flex-1 max-w-2xl">
                  <button
                    onClick={() => setShowAddDecisionModal(true)}
                    className="w-full flex items-center gap-3 px-6 py-3 bg-white border-2 border-neutral-gray-300 rounded-xl hover:border-primary-blue transition-colors text-left group"
                  >
                    <Plus size={20} className="text-neutral-gray-500 group-hover:text-primary-blue transition-colors" />
                    <span className="text-neutral-gray-600 font-medium">Add a decision</span>
                    <ArrowRight size={20} className="text-neutral-gray-400 ml-auto group-hover:text-primary-blue transition-colors" />
                  </button>
                </div>

                {/* Time Simulation Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowTimeSimMenu(!showTimeSimMenu)}
                    disabled={simulating}
                    className="px-4 py-3 bg-primary-blue text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Clock size={20} />
                    {simulating ? 'Simulating...' : 'Time Jump'}
                    {!simulating && <ChevronDown size={16} />}
                  </button>

                  {/* Time Simulation Dropdown Menu */}
                  {showTimeSimMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                        Simulate Time Jump
                      </div>
                      {[
                        { label: '+7 days', days: 7 },
                        { label: '+30 days (1 month)', days: 30 },
                        { label: '+90 days (3 months)', days: 90 },
                        { label: '+180 days (6 months)', days: 180 },
                        { label: '+365 days (1 year)', days: 365 },
                      ].map((option) => (
                        <button
                          key={option.days}
                          onClick={() => handleTimeSimulation(option.days)}
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors font-medium"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Simulation Result Toast */}
              {simulationResult && (
                <div className={`mb-6 p-4 rounded-xl border-2 ${
                  simulationResult.success
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  {simulationResult.success ? (
                    <div>
                      <h3 className="font-bold text-green-900 mb-2">
                        🕐 Time Jump: +{simulationResult.days} days completed
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-green-800">
                        <div>
                          <span className="font-semibold">{simulationResult.evaluatedCount}</span> decisions evaluated
                        </div>
                        <div>
                          <span className="font-semibold">{simulationResult.healthChanges}</span> health changes
                        </div>
                        <div>
                          <span className="font-semibold">{simulationResult.lifecycleChanges}</span> lifecycle changes
                        </div>
                        <div>
                          <span className="font-semibold">{simulationResult.newNotifications}</span> new notifications
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-red-900">
                      <span className="font-bold">Error:</span> {simulationResult.error}
                    </div>
                  )}
                </div>
              )}

              {/* Decision Health Overview */}
              <DecisionHealthOverview key={`health-${refreshKey}`} />

              {/* Decision Log Table */}
              <DecisionLogTable key={`log-${refreshKey}`} />
            </div>
          )}

          {currentView === 'monitoring' && (
            <DecisionMonitoring
              key={`monitoring-${refreshKey}`}
              onAddDecision={() => setShowAddDecisionModal(true)}
            />
          )}
          {currentView === 'assumptions' && <AssumptionsPage />}
          {currentView === 'notifications' && <NotificationsPage />}
          {currentView === 'profile' && <OrganizationProfile />}
          {currentView === 'flow' && <DecisionFlow key={`flow-${refreshKey}`} />}
        </div>
      </div>

      {/* Right Sidebar - Sliding Window */}
      <OrganisationOverview isOpen={isOverviewOpen} onClose={() => setIsOverviewOpen(false)} />

      {/* Add Decision Modal */}
      <AddDecisionModal
        isOpen={showAddDecisionModal}
        onClose={() => setShowAddDecisionModal(false)}
        onSuccess={handleDecisionCreated}
      />
    </div>
  );
}

// Main App component wrapped with AuthProvider
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
