import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  Download, 
  Sparkles, 
  Table,
  CheckCircle,
  AlertCircle,
  Loader,
  Edit2,
  Trash2,
  Plus
} from 'lucide-react';
import api from '../services/api';

const ImportDecisionsModal = ({ isOpen, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' or 'template'
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [abortController, setAbortController] = useState(null);

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = activeTab === 'ai' 
        ? ['application/pdf', 'text/plain', 'text/markdown', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        : ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(pdf|txt|md|docx|csv|xls|xlsx)$/i)) {
        setError(`Invalid file type. Please upload ${activeTab === 'ai' ? 'PDF, TXT, MD, or DOCX' : 'CSV or Excel'} files.`);
        return;
      }

      // Validate file size (10MB max)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      // Simulate file input change
      setFile(droppedFile);
      setError(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleAIExtract = async () => {
    if (!file) return;

    // Abort any previous request
    if (abortController) {
      abortController.abort();
    }

    const controller = new AbortController();
    setAbortController(controller);
    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('document', file);

      const response = await api.importDecisionsFromDocument(formData, controller.signal);
      
      // Check if request was aborted
      if (controller.signal.aborted) {
        return;
      }
      
      setExtractedData(response.decisions || []);
    } catch (err) {
      // Ignore abort errors
      if (err.name === 'AbortError' || controller.signal.aborted) {
        console.log('AI extraction cancelled');
        return;
      }
      
      console.error('AI extraction error:', err);
      setError(err.message || 'Failed to extract decisions from document');
    } finally {
      if (!controller.signal.aborted) {
        setIsProcessing(false);
        setAbortController(null);
      }
    }
  };

  const handleTemplateImport = async () => {
    if (!file) return;

    // Abort any previous request
    if (abortController) {
      abortController.abort();
    }

    const controller = new AbortController();
    setAbortController(controller);
    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('template', file);

      const response = await api.importDecisionsFromTemplate(formData, controller.signal);
      
      // Check if request was aborted
      if (controller.signal.aborted) {
        return;
      }
      
      setExtractedData(response.decisions || []);
    } catch (err) {
      // Ignore abort errors
      if (err.name === 'AbortError' || controller.signal.aborted) {
        console.log('Template import cancelled');
        return;
      }
      
      console.error('Template import error:', err);
      setError(err.message || 'Failed to parse template file');
    } finally {
      if (!controller.signal.aborted) {
        setIsProcessing(false);
        setAbortController(null);
      }
    }
  };

  const handleImportAll = async () => {
    if (!extractedData || extractedData.length === 0) return;

    // Abort any previous request
    if (abortController) {
      abortController.abort();
    }

    const controller = new AbortController();
    setAbortController(controller);
    setIsProcessing(true);
    setError(null);

    try {
      await api.bulkImportDecisions({ decisions: extractedData }, controller.signal);
      
      // Check if request was aborted
      if (controller.signal.aborted) {
        return;
      }
      
      onSuccess?.();
      handleClose();
    } catch (err) {
      // Ignore abort errors
      if (err.name === 'AbortError' || controller.signal.aborted) {
        console.log('Bulk import cancelled');
        return;
      }
      
      console.error('Bulk import error:', err);
      setError(err.message || 'Failed to import decisions');
    } finally {
      if (!controller.signal.aborted) {
        setIsProcessing(false);
        setAbortController(null);
      }
    }
  };

  const handleRemoveDecision = (index) => {
    setExtractedData(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditDecision = (index, field, value) => {
    setExtractedData(prev => prev.map((decision, i) => 
      i === index ? { ...decision, [field]: value } : decision
    ));
  };

  const handleAddAssumption = (index) => {
    const assumption = prompt('Enter new assumption:');
    if (assumption && assumption.trim()) {
      setExtractedData(prev => prev.map((decision, i) => 
        i === index 
          ? { ...decision, assumptions: [...(decision.assumptions || []), assumption.trim()] }
          : decision
      ));
    }
  };

  const handleRemoveAssumption = (decisionIndex, assumptionIndex) => {
    setExtractedData(prev => prev.map((decision, i) => 
      i === decisionIndex 
        ? { 
            ...decision, 
            assumptions: decision.assumptions.filter((_, ai) => ai !== assumptionIndex) 
          }
        : decision
    ));
  };

  const downloadTemplate = () => {
    const csvContent = `title,description,category,assumptions,constraints,expiryDate
"Migrate to Cloud Infrastructure","Move from on-premise to AWS cloud services","Technical Initiative","AWS pricing stable;Team has cloud skills","Budget: $500k max","2026-12-31"
"Increase Marketing Budget","Allocate $200k for Q2 campaigns","Budget & Financial","Market conditions favorable;ROI target 3x","Budget Policy","2026-06-30"`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'decision_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    // Abort any ongoing API requests
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    
    // Reset all state
    setFile(null);
    setExtractedData(null);
    setError(null);
    setActiveTab('ai');
    setEditingIndex(null);
    setIsProcessing(false); // Reset processing state
    onClose();
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Strategic Initiative': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
      'Budget & Financial': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      'Technical Initiative': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      'Policy & Compliance': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
      'Operational': 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300',
    };
    return colors[category] || 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-neutral-gray-700 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Upload className="text-blue-600 dark:text-blue-400" size={28} />
              Import Decisions
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Extract decisions from documents or import via template
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white dark:hover:bg-neutral-gray-700 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-neutral-gray-700 bg-gray-50 dark:bg-neutral-gray-900">
          <div className="flex">
            <button
              onClick={() => {
                setActiveTab('ai');
                setFile(null);
                setExtractedData(null);
                setError(null);
              }}
              className={`flex-1 px-6 py-3 font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'ai'
                  ? 'bg-white dark:bg-neutral-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
              }`}
            >
              <Sparkles size={18} />
              AI Extraction
            </button>
            <button
              onClick={() => {
                setActiveTab('template');
                setFile(null);
                setExtractedData(null);
                setError(null);
              }}
              className={`flex-1 px-6 py-3 font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'template'
                  ? 'bg-white dark:bg-neutral-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
              }`}
            >
              <Table size={18} />
              Template Import
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!extractedData ? (
            // Upload Section
            <div className="space-y-6">
              {activeTab === 'template' && (
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
                  <Download className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={20} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      Don't have a template? Download our CSV template to get started.
                    </p>
                    <button
                      onClick={downloadTemplate}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
                    >
                      Download Template (CSV)
                    </button>
                  </div>
                </div>
              )}

              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-gray-300 dark:border-neutral-gray-600 rounded-xl p-12 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors bg-gray-50 dark:bg-neutral-gray-900"
              >
                <FileText className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Drop your file here or click to browse
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {activeTab === 'ai' 
                    ? 'Supports: PDF, TXT, MD, DOCX (max 10MB)'
                    : 'Supports: CSV, XLSX (max 10MB)'
                  }
                </p>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept={activeTab === 'ai' ? '.pdf,.txt,.md,.docx' : '.csv,.xlsx,.xls'}
                />
                <label
                  htmlFor="file-upload"
                  className="inline-block px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 cursor-pointer transition-colors"
                >
                  Select File
                </label>
              </div>

              {/* Selected File */}
              {file && (
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{file.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Process Button */}
              {file && !isProcessing && (
                <button
                  onClick={activeTab === 'ai' ? handleAIExtract : handleTemplateImport}
                  className="w-full py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {activeTab === 'ai' ? <Sparkles size={20} /> : <Table size={20} />}
                  {activeTab === 'ai' ? 'Extract with AI' : 'Parse Template'}
                </button>
              )}

              {/* Processing Loader */}
              {isProcessing && (
                <div className="text-center py-8">
                  <Loader className="animate-spin mx-auto text-blue-600 dark:text-blue-400 mb-4" size={48} />
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                    {activeTab === 'ai' ? 'Analyzing document...' : 'Parsing template...'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">This may take a few moments</p>
                </div>
              )}
            </div>
          ) : (
            // Preview Section
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    Extracted Decisions ({extractedData.length})
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Review and edit before importing
                  </p>
                </div>
                <button
                  onClick={() => setExtractedData(null)}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                >
                  ← Upload Different File
                </button>
              </div>

              {/* Decisions List */}
              <div className="space-y-4">
                {extractedData.map((decision, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 dark:border-neutral-gray-700 rounded-lg p-4 bg-white dark:bg-neutral-gray-800 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={decision.title}
                          onChange={(e) => handleEditDecision(index, 'title', e.target.value)}
                          className="text-lg font-semibold text-gray-800 dark:text-gray-200 w-full border-b border-transparent hover:border-gray-300 dark:hover:border-neutral-gray-600 focus:border-blue-500 dark:focus:border-blue-400 outline-none bg-transparent px-1 -ml-1"
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <select
                            value={decision.category || ''}
                            onChange={(e) => handleEditDecision(index, 'category', e.target.value)}
                            className={`text-xs px-2 py-1 rounded-full font-medium cursor-pointer ${getCategoryColor(decision.category)}`}
                          >
                            <option value="" className="bg-white dark:bg-neutral-gray-700 text-gray-900 dark:text-white">Select Category</option>
                            <option value="Strategic Initiative" className="bg-white dark:bg-neutral-gray-700 text-gray-900 dark:text-white">Strategic Initiative</option>
                            <option value="Budget & Financial" className="bg-white dark:bg-neutral-gray-700 text-gray-900 dark:text-white">Budget & Financial</option>
                            <option value="Technical Initiative" className="bg-white dark:bg-neutral-gray-700 text-gray-900 dark:text-white">Technical Initiative</option>
                            <option value="Policy & Compliance" className="bg-white dark:bg-neutral-gray-700 text-gray-900 dark:text-white">Policy & Compliance</option>
                            <option value="Operational" className="bg-white dark:bg-neutral-gray-700 text-gray-900 dark:text-white">Operational</option>
                          </select>
                          {decision.confidence && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Confidence: {decision.confidence}%
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveDecision(index)}
                        className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <textarea
                      value={decision.description || ''}
                      onChange={(e) => handleEditDecision(index, 'description', e.target.value)}
                      className="w-full text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-neutral-gray-700 border border-gray-200 dark:border-neutral-gray-600 rounded p-2 hover:border-gray-300 dark:hover:border-neutral-gray-500 focus:border-blue-500 dark:focus:border-blue-400 outline-none resize-none"
                      rows={2}
                      placeholder="Decision description..."
                    />

                    {/* Assumptions */}
                    {decision.assumptions && decision.assumptions.length > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Assumptions ({decision.assumptions.length})
                          </p>
                          <button
                            onClick={() => handleAddAssumption(index)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
                          >
                            <Plus size={14} />
                            Add
                          </button>
                        </div>
                        <div className="space-y-1">
                          {decision.assumptions.map((assumption, ai) => (
                            <div
                              key={ai}
                              className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-neutral-gray-700 p-2 rounded group"
                            >
                              <span className="flex-1">• {assumption}</span>
                              <button
                                onClick={() => handleRemoveAssumption(index, ai)}
                                className="opacity-0 group-hover:opacity-100 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-opacity"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={20} />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {extractedData && (
          <div className="p-6 border-t border-gray-200 dark:border-neutral-gray-700 bg-gray-50 dark:bg-neutral-gray-900 flex items-center justify-between">
            <button
              onClick={handleClose}
              className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImportAll}
              disabled={isProcessing || extractedData.length === 0}
              className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader className="animate-spin" size={18} />
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  Import {extractedData.length} Decision{extractedData.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportDecisionsModal;
