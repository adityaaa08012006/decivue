import React, { useState, useEffect } from 'react';
import { X, FileText, Download, Clock, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import api from '../services/api';

const TeamMemberReportModal = ({ user, onClose }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingPDF, setLoadingPDF] = useState(false);
  const [error, setError] = useState(null);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    generateReport();
  }, [user]);

  const generateReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await api.generateTeamMemberReport(user.id);
      
      setReport(data.report);
      setCached(data.cached);
      setLoading(false);
    } catch (err) {
      console.error('Failed to generate report:', err);
      setError(err.message || 'Failed to generate report. Please try again.');
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!report) return;

    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${user.fullName || user.email}-performance-report-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = async () => {
    try {
      setLoadingPDF(true);
      const blob = await api.generateTeamMemberReportPDF(user.id);
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${user.fullName || user.email}-performance-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      alert('Failed to download PDF report. Please try again.');
    } finally {
      setLoadingPDF(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-white dark:bg-neutral-gray-800 rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-gray-200 dark:border-neutral-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-blue to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {user.fullName?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-neutral-black dark:text-white flex items-center gap-2">
                <FileText className="text-primary-blue" size={24} />
                Performance Report
              </h2>
              <p className="text-sm text-neutral-gray-600 dark:text-neutral-gray-400">
                {user.fullName || user.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!loading && report && (
              <>
                {cached && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-xs font-medium">
                    <Clock size={14} />
                    Cached
                  </div>
                )}
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-white dark:bg-neutral-gray-700 text-neutral-black dark:text-white border border-neutral-gray-300 dark:border-neutral-gray-600 rounded-lg hover:bg-neutral-gray-50 dark:hover:bg-neutral-gray-600 transition-colors flex items-center gap-2 text-sm font-medium"
                  title="Download as Markdown"
                >
                  <Download size={16} />
                  MD
                </button>
                <button
                  onClick={handleDownloadPDF}
                  disabled={loadingPDF}
                  className="px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Download as PDF"
                >
                  {loadingPDF ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  PDF
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-gray-100 dark:hover:bg-neutral-gray-700 rounded-lg transition-colors"
              title="Close"
            >
              <X size={24} className="text-neutral-gray-600 dark:text-neutral-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="animate-spin text-primary-blue" size={48} />
              <div className="text-center">
                <p className="text-lg font-semibold text-neutral-black dark:text-white mb-2">
                  Generating AI-Powered Report...
                </p>
                <p className="text-sm text-neutral-gray-600 dark:text-neutral-gray-400">
                  Analyzing decision patterns, assumptions, and collaboration metrics
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertCircle className="text-red-600" size={32} />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
                  Report Generation Failed
                </p>
                <p className="text-sm text-neutral-gray-600 dark:text-neutral-gray-400 mb-4">
                  {error}
                </p>
                <button
                  onClick={generateReport}
                  className="px-6 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {!loading && !error && report && (
            <div className="prose prose-lg prose-blue dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  // Customize heading styles
                  h1: ({ node, ...props }) => (
                    <h1 className="text-3xl font-bold text-neutral-black dark:text-white mb-4 mt-6" {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 className="text-2xl font-bold text-neutral-black dark:text-white mb-3 mt-5 flex items-center gap-2 border-b border-neutral-gray-200 dark:border-neutral-gray-700 pb-2" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-xl font-semibold text-neutral-black dark:text-white mb-2 mt-4" {...props} />
                  ),
                  // Customize list styles
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc list-inside space-y-2 text-neutral-gray-700 dark:text-neutral-gray-300 mb-4" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal list-inside space-y-2 text-neutral-gray-700 dark:text-neutral-gray-300 mb-4" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="text-neutral-gray-700 dark:text-neutral-gray-300" {...props} />
                  ),
                  // Customize paragraph styles
                  p: ({ node, ...props }) => (
                    <p className="text-neutral-gray-700 dark:text-neutral-gray-300 mb-4 leading-relaxed" {...props} />
                  ),
                  // Customize strong/bold styles
                  strong: ({ node, ...props }) => (
                    <strong className="font-bold text-neutral-black dark:text-white" {...props} />
                  ),
                  // Customize code styles
                  code: ({ node, inline, ...props }) => (
                    inline 
                      ? <code className="px-1.5 py-0.5 bg-neutral-gray-100 dark:bg-neutral-gray-700 text-primary-blue rounded text-sm font-mono" {...props} />
                      : <code className="block p-4 bg-neutral-gray-100 dark:bg-neutral-gray-700 rounded-lg text-sm font-mono overflow-x-auto mb-4" {...props} />
                  ),
                  // Customize blockquote styles
                  blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 border-primary-blue pl-4 py-2 italic text-neutral-gray-600 dark:text-neutral-gray-400 bg-blue-50 dark:bg-blue-900/20 rounded-r mb-4" {...props} />
                  ),
                }}
              >
                {report}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-neutral-gray-200 dark:border-neutral-gray-700 bg-neutral-gray-50 dark:bg-neutral-gray-900">
          <div className="flex items-center gap-2 text-xs text-neutral-gray-600 dark:text-neutral-gray-400">
            <TrendingUp size={14} />
            <span>Powered by Google Gemini AI</span>
            {cached && (
              <span className="text-neutral-gray-500 dark:text-neutral-gray-500">
                • Valid for 24 hours
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-neutral-gray-200 dark:bg-neutral-gray-700 text-neutral-black dark:text-white rounded-lg hover:bg-neutral-gray-300 dark:hover:bg-neutral-gray-600 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamMemberReportModal;
