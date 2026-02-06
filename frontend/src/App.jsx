import React, { useState } from 'react';
import { Plus, ArrowRight, PanelRightOpen } from 'lucide-react';
import Sidebar from './components/Sidebar';
import DecisionHealthOverview from './components/DecisionHealthOverview';
import DecisionLogTable from './components/DecisionLogTable';
import OrganisationOverview from './components/OrganisationOverview';
import DecisionMonitoring from './components/DecisionMonitoring';

function App() {
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');

  const handleNavigate = (viewId) => {
    setCurrentView(viewId);
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
                  <button className="w-full flex items-center gap-3 px-6 py-3 bg-white border-2 border-neutral-gray-300 rounded-xl hover:border-primary-blue transition-colors text-left group">
                    <Plus size={20} className="text-neutral-gray-500 group-hover:text-primary-blue transition-colors" />
                    <span className="text-neutral-gray-600 font-medium">Add a decision</span>
                    <ArrowRight size={20} className="text-neutral-gray-400 ml-auto group-hover:text-primary-blue transition-colors" />
                  </button>
                </div>
                <button className="px-6 py-3 bg-status-green text-white font-semibold rounded-xl hover:bg-green-600 transition-colors">
                  Add entry
                </button>
                <button
                  onClick={() => setIsOverviewOpen(true)}
                  className="px-4 py-3 bg-primary-blue text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  <PanelRightOpen size={20} />
                  Overview
                </button>
              </div>

              {/* Decision Health Overview */}
              <DecisionHealthOverview />

              {/* Decision Log Table */}
              <DecisionLogTable />
            </div>
          )}

          {currentView === 'monitoring' && <DecisionMonitoring />}
        </div>
      </div>

      {/* Right Sidebar - Sliding Window */}
      <OrganisationOverview isOpen={isOverviewOpen} onClose={() => setIsOverviewOpen(false)} />
    </div>
  );
}

export default App;
