import React, { useState } from 'react';
import { Plus, ArrowRight, PanelRightOpen } from 'lucide-react';
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

function App() {
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [showAddDecisionModal, setShowAddDecisionModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleNavigate = (viewId) => {
    setCurrentView(viewId);
  };

  const handleDecisionCreated = () => {
    // Trigger refresh by changing key
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="flex h-screen bg-neutral-white overflow-hidden">
      {/* Left Sidebar */}
      <Sidebar currentView={currentView} onNavigate={handleNavigate} />

      {/* Main Content */}
      <div className="flex-1 h-screen flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {currentView === 'dashboard' && (
            <div className="p-8">
              {/* Header with Add Decision Input */}
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
              </div>

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

export default App;
