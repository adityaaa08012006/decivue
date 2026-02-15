import React, { useState } from 'react';
import { FileText, Download, Calendar, Users, User, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const ReportsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(null); // tracks which report is loading
  const [toast, setToast] = useState(null);
  const [customReportOptions, setCustomReportOptions] = useState({
    startDate: '',
    endDate: '',
    includeArchived: false,
  });

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleGenerateMyActivity = async () => {
    try {
      setLoading('my-activity');
      const blob = await api.generateMyActivityReport();
      downloadBlob(blob, `decivue-my-activity-${Date.now()}.pdf`);
      showToast('success', 'Your activity report has been generated successfully!');
    } catch (error) {
      console.error('Failed to generate my activity report:', error);
      showToast('error', `Failed to generate report: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateOrganization = async () => {
    try {
      setLoading('organization');
      const blob = await api.generateOrganizationReport();
      downloadBlob(blob, `decivue-org-report-${Date.now()}.pdf`);
      showToast('success', 'Organization report has been generated successfully!');
    } catch (error) {
      console.error('Failed to generate organization report:', error);
      showToast('error', `Failed to generate report: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateCustom = async () => {
    try {
      setLoading('custom');
      const blob = await api.generateCustomReport(
        customReportOptions.startDate,
        customReportOptions.endDate,
        customReportOptions.includeArchived
      );
      downloadBlob(blob, `decivue-custom-report-${Date.now()}.pdf`);
      showToast('success', 'Custom report has been generated successfully!');
    } catch (error) {
      console.error('Failed to generate custom report:', error);
      showToast('error', `Failed to generate report: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  const isLead = user?.role === 'lead';

  return (
    <div className="flex h-screen bg-neutral-white dark:bg-neutral-gray-900">
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <div className="max-w-5xl mx-auto w-full p-8">
          {/* Toast Notification */}
          {toast && (
            <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg ${
              toast.type === 'success'
                ? 'bg-green-500 text-white'
                : 'bg-red-500 text-white'
            }`}>
              {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              <span>{toast.message}</span>
            </div>
          )}

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-neutral-black dark:text-white mb-2">
              Reports & Analytics
            </h1>
            <p className="text-neutral-gray-600 dark:text-neutral-gray-400">
              Generate PDF reports of your decisions, assumptions, and constraints
            </p>
          </div>

          {/* Individual Activity Report */}
          <div className="bg-white dark:bg-neutral-gray-800 rounded-xl border border-neutral-gray-200 dark:border-neutral-gray-700 p-6 mb-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <User className="text-primary-blue" size={24} />
                  <h2 className="text-xl font-bold text-neutral-black dark:text-white">
                    My Activity Report
                  </h2>
                </div>
                <p className="text-neutral-gray-600 dark:text-neutral-gray-400 mb-4">
                  Generate a report of all decisions and assumptions you've created.
                </p>
                <ul className="text-sm text-neutral-gray-600 dark:text-neutral-gray-400 space-y-1 mb-4">
                  <li>• Your decisions with lifecycle status</li>
                  <li>• Linked assumptions and constraints</li>
                  <li>• Activity timeline and metrics</li>
                </ul>
              </div>
              <button
                onClick={handleGenerateMyActivity}
                disabled={loading === 'my-activity'}
                className="flex items-center gap-2 px-6 py-3 bg-primary-blue text-white rounded-lg hover:bg-primary-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === 'my-activity' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Organization Report (Lead Only) */}
          {isLead && (
            <div className="bg-white dark:bg-neutral-gray-800 rounded-xl border border-neutral-gray-200 dark:border-neutral-gray-700 p-6 mb-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Users className="text-accent-purple" size={24} />
                    <h2 className="text-xl font-bold text-neutral-black dark:text-white">
                      Organization Report
                    </h2>
                    <span className="px-2 py-1 bg-accent-purple/20 text-accent-purple text-xs font-semibold rounded">
                      LEAD ONLY
                    </span>
                  </div>
                  <p className="text-neutral-gray-600 dark:text-neutral-gray-400 mb-4">
                    Generate a comprehensive report of all team decisions and activity.
                  </p>
                  <ul className="text-sm text-neutral-gray-600 dark:text-neutral-gray-400 space-y-1 mb-4">
                    <li>• All team decisions across the organization</li>
                    <li>• Organization-wide metrics and trends</li>
                    <li>• Complete assumptions and constraints inventory</li>
                  </ul>
                </div>
                <button
                  onClick={handleGenerateOrganization}
                  disabled={loading === 'organization'}
                  className="flex items-center gap-2 px-6 py-3 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading === 'organization' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      Generate Report
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Custom Report with Filters */}
          <div className="bg-white dark:bg-neutral-gray-800 rounded-xl border border-neutral-gray-200 dark:border-neutral-gray-700 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="text-accent-teal" size={24} />
              <h2 className="text-xl font-bold text-neutral-black dark:text-white">
                Custom Report
              </h2>
            </div>
            <p className="text-neutral-gray-600 dark:text-neutral-gray-400 mb-6">
              Generate a report with custom date range and filters.
            </p>

            {/* Date Range Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-neutral-black dark:text-white mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customReportOptions.startDate}
                  onChange={(e) => setCustomReportOptions({ ...customReportOptions, startDate: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-neutral-gray-300 dark:border-neutral-gray-600 bg-white dark:bg-neutral-gray-700 text-neutral-black dark:text-white focus:ring-2 focus:ring-primary-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-black dark:text-white mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={customReportOptions.endDate}
                  onChange={(e) => setCustomReportOptions({ ...customReportOptions, endDate: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-neutral-gray-300 dark:border-neutral-gray-600 bg-white dark:bg-neutral-gray-700 text-neutral-black dark:text-white focus:ring-2 focus:ring-primary-blue"
                />
              </div>
            </div>

            {/* Include Archived Checkbox */}
            <div className="flex items-center gap-3 mb-6">
              <input
                type="checkbox"
                id="includeArchived"
                checked={customReportOptions.includeArchived}
                onChange={(e) => setCustomReportOptions({ ...customReportOptions, includeArchived: e.target.checked })}
                className="w-4 h-4 text-primary-blue rounded focus:ring-2 focus:ring-primary-blue"
              />
              <label htmlFor="includeArchived" className="text-sm text-neutral-gray-600 dark:text-neutral-gray-400">
                Include retired decisions
              </label>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateCustom}
              disabled={loading === 'custom'}
              className="flex items-center gap-2 px-6 py-3 bg-accent-teal text-white rounded-lg hover:bg-accent-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'custom' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <FileText size={18} />
                  Generate Custom Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
