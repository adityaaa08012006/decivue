import React, { useState } from "react";
import {
  Plus,
  ArrowRight,
  PanelRightOpen,
  Clock,
  ChevronDown,
} from "lucide-react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import LandingPage from './components/LandingPage';
import OrganizationTypeSelector from './components/OrganizationTypeSelector';
import TemplatePreview from './components/TemplatePreview';
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import Sidebar from "./components/Sidebar";
import DecisionHealthOverview from "./components/DecisionHealthOverview";
import DecisionLogTable from "./components/DecisionLogTable";
import OrganisationOverview from "./components/OrganisationOverview";
import DecisionMonitoring from "./components/DecisionMonitoring";
import AssumptionsPage from "./components/AssumptionsPage";
import OrganizationProfile from "./components/OrganizationProfile";
import NotificationsPage from "./components/NotificationsPage";
import DecisionFlowGraph from "./components/DecisionFlowGraph";
import SettingsPage from "./components/SettingsPage";
import TeamPage from "./components/TeamPage";
import AddDecisionModal from "./components/AddDecisionModal";
import api from "./services/api";

function AppContent() {
  const { user, loading, logout, isLead } = useAuth();
  const [showLanding, setShowLanding] = useState(true);
  const [showOrgSelector, setShowOrgSelector] = useState(false);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [selectedOrgType, setSelectedOrgType] = useState(null);
  const [authView, setAuthView] = useState("login"); // 'login' or 'register'
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [currentView, setCurrentView] = useState("dashboard");
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
    setRefreshKey((prev) => prev + 1);
  };

  const handleNotificationAction = () => {
    // Trigger refresh when notifications are updated
    setRefreshKey((prev) => prev + 1);
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
      setRefreshKey((prev) => prev + 1);

      // Auto-dismiss result after 5 seconds
      setTimeout(() => setSimulationResult(null), 5000);
    } catch (error) {
      console.error("Time simulation failed:", error);
      setSimulationResult({
        success: false,
        error: error.message || "Simulation failed",
      });
      setTimeout(() => setSimulationResult(null), 5000);
    } finally {
      setSimulating(false);
    }
  };

  const handleResetTime = async () => {
    try {
      setSimulating(true);
      setShowTimeSimMenu(false);
      setSimulationResult(null);

      await api.resetTimeSimulation();

      setSimulationResult({
        success: true,
        reset: true,
      });

      // Refresh the dashboard
      setRefreshKey((prev) => prev + 1);

      // Auto-dismiss result after 3 seconds
      setTimeout(() => setSimulationResult(null), 3000);
    } catch (error) {
      console.error("Time reset failed:", error);
      setSimulationResult({
        success: false,
        error: error.message || "Reset failed",
      });
      setTimeout(() => setSimulationResult(null), 5000);
    } finally {
      setSimulating(false);
    }
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-white dark:bg-neutral-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mx-auto"></div>
          <p className="mt-4 text-neutral-gray-600 dark:text-neutral-gray-400">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated - show landing page, org selector, template preview, or login/register
  if (!user) {
    // Show organization type selector
    if (showOrgSelector) {
      return (
        <OrganizationTypeSelector
          onSelect={(orgType) => {
            if (orgType.id === 'skip') {
              setShowOrgSelector(false);
              setShowLanding(false);
              setAuthView('register');
            } else {
              setSelectedOrgType(orgType);
              setShowOrgSelector(false);
              setShowTemplatePreview(true);
            }
          }}
          onBack={() => {
            setShowOrgSelector(false);
            setShowLanding(true);
          }}
        />
      );
    }

    // Show template preview
    if (showTemplatePreview && selectedOrgType) {
      return (
        <TemplatePreview
          orgType={selectedOrgType}
          onContinue={() => {
            setShowTemplatePreview(false);
            setShowLanding(false);
            setAuthView('register');
          }}
          onBack={() => {
            setShowTemplatePreview(false);
            setShowOrgSelector(true);
          }}
        />
      );
    }

    // Show landing page
    if (showLanding) {
      return (
        <LandingPage 
          onGetStarted={() => {
            setShowLanding(false);
            setShowOrgSelector(true);
          }}
          onSeeDemo={() => {
            setShowLanding(false);
            setAuthView('login');
          }}
        />
      );
    }
    
    // Show login
    if (authView === 'login') {
      return (
        <div>
          <LoginPage onNavigateToRegister={() => setAuthView('register')} />
          <button 
            onClick={() => {
              setShowLanding(true);
              setShowOrgSelector(false);
              setShowTemplatePreview(false);
            }}
            className="fixed top-6 left-6 text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      );
    }
    
    // Show register
    return (
      <div>
        <RegisterPage onNavigateToLogin={() => setAuthView('login')} />
        <button 
          onClick={() => {
            setShowLanding(true);
            setShowOrgSelector(false);
            setShowTemplatePreview(false);
          }}
          className="fixed top-6 left-6 text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← Back to Home
        </button>
      </div>
    );
  }

  // Authenticated - show main app
  return (
    <div className="flex h-screen bg-neutral-white dark:bg-neutral-gray-900 overflow-hidden">
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
          {currentView === "dashboard" && (
            <div className="p-8">
              {/* Header with Add Decision Input and Time Simulation */}
              <div className="mb-8 flex items-center gap-4">
                <div className="flex-1 max-w-2xl">
                  <button
                    onClick={() => setShowAddDecisionModal(true)}
                    className="w-full flex items-center gap-3 px-6 py-3 bg-white dark:bg-neutral-gray-800 border-2 border-neutral-gray-300 dark:border-neutral-gray-700 rounded-xl hover:border-primary-blue dark:hover:border-primary-blue transition-colors text-left group"
                  >
                    <Plus
                      size={20}
                      className="text-neutral-gray-500 dark:text-neutral-gray-400 group-hover:text-primary-blue transition-colors"
                    />
                    <span className="text-neutral-gray-600 dark:text-neutral-gray-300 font-medium">
                      Add a decision
                    </span>
                    <ArrowRight
                      size={20}
                      className="text-neutral-gray-400 dark:text-neutral-gray-500 ml-auto group-hover:text-primary-blue transition-colors"
                    />
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
                    {simulating ? "Simulating..." : "Time Jump"}
                    {!simulating && <ChevronDown size={16} />}
                  </button>

                  {/* Time Simulation Dropdown Menu */}
                  {showTimeSimMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-neutral-gray-700 py-2 z-50">
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-neutral-gray-700">
                        Simulate Time Jump
                      </div>
                      {[
                        { label: "+7 days", days: 7 },
                        { label: "+30 days (1 month)", days: 30 },
                        { label: "+90 days (3 months)", days: 90 },
                        { label: "+180 days (6 months)", days: 180 },
                        { label: "+365 days (1 year)", days: 365 },
                      ].map((option) => (
                        <button
                          key={option.days}
                          onClick={() => handleTimeSimulation(option.days)}
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900 hover:text-orange-600 dark:hover:text-orange-400 transition-colors font-medium"
                        >
                          {option.label}
                        </button>
                      ))}
                      <div className="border-t border-gray-100 dark:border-neutral-gray-700 my-2"></div>
                      <button
                        onClick={handleResetTime}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
                      >
                        Reset to Real Time
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Simulation Result Toast */}
              {simulationResult && (
                <div
                  className={`mb-6 p-4 rounded-xl border-2 ${
                    simulationResult.success
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                  }`}
                >
                  {simulationResult.success ? (
                    <div>
                      {simulationResult.reset ? (
                        <h3 className="font-bold text-green-900 dark:text-green-300">
                          ⏰ Time simulation reset to real time
                        </h3>
                      ) : (
                        <>
                          <h3 className="font-bold text-green-900 dark:text-green-300 mb-2">
                            🕐 Time Jump: +{simulationResult.days} days
                            completed
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-green-800 dark:text-green-400">
                            <div>
                              <span className="font-semibold">
                                {simulationResult.evaluatedCount}
                              </span>{" "}
                              decisions evaluated
                            </div>
                            <div>
                              <span className="font-semibold">
                                {simulationResult.healthChanges}
                              </span>{" "}
                              health changes
                            </div>
                            <div>
                              <span className="font-semibold">
                                {simulationResult.lifecycleChanges}
                              </span>{" "}
                              lifecycle changes
                            </div>
                            <div>
                              <span className="font-semibold">
                                {simulationResult.newNotifications}
                              </span>{" "}
                              new notifications
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-red-900 dark:text-red-300">
                      <span className="font-bold">Error:</span>{" "}
                      {simulationResult.error}
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

          {currentView === "monitoring" && (
            <DecisionMonitoring
              key={`monitoring-${refreshKey}`}
              onAddDecision={() => setShowAddDecisionModal(true)}
            />
          )}
          {currentView === "assumptions" && <AssumptionsPage />}
          {currentView === "notifications" && (
            <NotificationsPage
              onNotificationAction={handleNotificationAction}
            />
          )}
          {currentView === "profile" && <OrganizationProfile />}
          {currentView === "flow" && (
            <DecisionFlowGraph key={`flow-${refreshKey}`} />
          )}
          {currentView === "team" && <TeamPage />}
          {currentView === "settings" && <SettingsPage />}
        </div>
      </div>

      {/* Right Sidebar - Sliding Window */}
      <OrganisationOverview
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
      />

      {/* Add Decision Modal */}
      <AddDecisionModal
        isOpen={showAddDecisionModal}
        onClose={() => setShowAddDecisionModal(false)}
        onSuccess={handleDecisionCreated}
      />
    </div>
  );
}

// Main App component wrapped with providers
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
