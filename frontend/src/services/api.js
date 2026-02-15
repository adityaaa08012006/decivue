// API Service for communicating with backend
const API_BASE_URL = 'http://localhost:3001/api';

class ApiService {
  constructor() {
    this.authToken = null;
  }

  // Set authentication token
  setAuthToken(token) {
    this.authToken = token;
  }

  // Get authentication token
  getAuthToken() {
    return this.authToken;
  }

  // Helper method for making requests
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add auth token if available
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const config = {
      headers,
      ...options,
    };

    try {
      const response = await fetch(url, config);

      // Handle 401 Unauthorized - token expired or invalid
      if (response.status === 401) {
        // Clear local storage and redirect to login
        localStorage.removeItem('decivue_session');
        localStorage.removeItem('decivue_user');
        this.authToken = null;

        // Reload page to show login screen
        if (!window.location.pathname.includes('/login')) {
          window.location.reload();
        }

        const error = await response.json().catch(() => ({ error: 'Unauthorized' }));
        throw new Error(error.error || 'Session expired. Please login again.');
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.error || error.message || `HTTP error! status: ${response.status}`);
      }

      // Handle 204 No Content (DELETE operations)
      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Convenience methods for HTTP verbs
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  // Decision endpoints
  async getDecisions() {
    return this.request('/decisions');
  }

  async getDecision(id) {
    return this.request(`/decisions/${id}`);
  }

  async createDecision(data) {
    return this.request('/decisions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDecision(id, data) {
    return this.request(`/decisions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDecision(id) {
    return this.request(`/decisions/${id}`, {
      method: 'DELETE',
    });
  }

  async markDecisionReviewed(id) {
    return this.request(`/decisions/${id}/mark-reviewed`, {
      method: 'PUT',
    });
  }

  async retireDecision(id, reason) {
    return this.request(`/decisions/${id}/retire`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  }

  async evaluateDecision(id) {
    return this.request(`/decisions/${id}/evaluate`, {
      method: 'POST',
    });
  }

  // Assumptions endpoints
  async getAssumptions(decisionId, includeConflicts = true) {
    let query = '';
    if (decisionId) {
      query = `?decisionId=${decisionId}`;
      if (includeConflicts) {
        query += '&includeConflicts=true';
      }
    }
    return this.request(`/assumptions${query}`);
  }

  async createAssumption(data) {
    return this.request('/assumptions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAssumption(id, data) {
    return this.request(`/assumptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAssumption(id) {
    return this.request(`/assumptions/${id}`, {
      method: 'DELETE',
    });
  }

  async linkAssumptionToDecision(assumptionId, decisionId) {
    return this.request(`/assumptions/${assumptionId}/link`, {
      method: 'POST',
      body: JSON.stringify({ decisionId }),
    });
  }

  async reportConflict(assumptionId, conflictingAssumptionId, reason) {
    return this.request(`/assumptions/${assumptionId}/conflicts`, {
      method: 'POST',
      body: JSON.stringify({ conflictingAssumptionId, reason }),
    });
  }

  // Dependencies endpoints
  async getDependencies(decisionId) {
    return this.request(`/dependencies?decisionId=${decisionId}`);
  }

  async createDependency(data) {
    return this.request('/dependencies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteDependency(id) {
    return this.request(`/dependencies/${id}`, {
      method: 'DELETE',
    });
  }

  // Constraints endpoints
  async getConstraints(decisionId) {
    return this.request(`/constraints?decisionId=${decisionId}`);
  }

  async getAllConstraints() {
    return this.request('/constraints/all');
  }

  async createConstraint(constraint) {
    return this.request('/constraints', {
      method: 'POST',
      body: JSON.stringify(constraint),
    });
  }

  async deleteConstraint(id) {
    return this.request(`/constraints/${id}`, {
      method: 'DELETE',
    });
  }

  async linkConstraintToDecision(constraintId, decisionId) {
    return this.request('/constraints/link', {
      method: 'POST',
      body: JSON.stringify({ constraintId, decisionId }),
    });
  }

  // Evaluation history endpoints
  async getEvaluationHistory(decisionId) {
    return this.request(`/decisions/${decisionId}/history`);
  }

  // Organization Profile endpoints
  async getProfile() {
    return this.request('/profile');
  }

  async updateProfile(profileData) {
    return this.request('/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async getTimeline(limit = 50) {
    return this.request(`/timeline?limit=${limit}`);
  }

  // Notification endpoints
  async getNotifications(filters = {}) {
    const params = new URLSearchParams();
    if (filters.unreadOnly) params.append('unreadOnly', 'true');
    if (filters.severity) params.append('severity', filters.severity);
    if (filters.type) params.append('type', filters.type);
    if (filters.limit) params.append('limit', filters.limit);

    const query = params.toString();
    return this.request(`/notifications${query ? `?${query}` : ''}`);
  }

  async getUnreadNotificationCount() {
    return this.request('/notifications/unread-count');
  }

  async markNotificationRead(id) {
    return this.request(`/notifications/${id}/mark-read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsRead() {
    return this.request('/notifications/mark-all-read', {
      method: 'PUT',
    });
  }

  async dismissNotification(id) {
    return this.request(`/notifications/${id}/dismiss`, {
      method: 'PUT',
    });
  }

  async deleteNotification(id) {
    return this.request(`/notifications/${id}`, {
      method: 'DELETE',
    });
  }

  // Constraint Violation endpoints
  async getConstraintViolations(decisionId, includeResolved = false) {
    const params = new URLSearchParams();
    if (decisionId) params.append('decisionId', decisionId);
    if (includeResolved) params.append('includeResolved', 'true');

    const query = params.toString();
    return this.request(`/constraint-violations${query ? `?${query}` : ''}`);
  }

  async getConstraintViolation(id) {
    return this.request(`/constraint-violations/${id}`);
  }

  async resolveConstraintViolation(id) {
    return this.request(`/constraint-violations/${id}/resolve`, {
      method: 'PUT',
    });
  }

  async deleteConstraintViolation(id) {
    return this.request(`/constraint-violations/${id}`, {
      method: 'DELETE',
    });
  }

  async getViolationsByConstraint(constraintId) {
    return this.request(`/constraint-violations/by-constraint/${constraintId}`);
  }

  // Assumption Conflicts endpoints
  async getAssumptionConflicts(includeResolved = false) {
    const params = new URLSearchParams();
    if (includeResolved) params.append('includeResolved', 'true');
    const query = params.toString();
    return this.request(`/assumption-conflicts${query ? `?${query}` : ''}`);
  }

  async getAssumptionConflictsForAssumption(assumptionId) {
    return this.request(`/assumption-conflicts/${assumptionId}`);
  }

  async detectAssumptionConflicts(assumptionIds = null) {
    return this.request('/assumption-conflicts/detect', {
      method: 'POST',
      body: JSON.stringify({ assumptionIds }),
    });
  }

  async resolveAssumptionConflict(id, resolutionAction, resolutionNotes = '') {
    return this.request(`/assumption-conflicts/${id}/resolve`, {
      method: 'PUT',
      body: JSON.stringify({ resolutionAction, resolutionNotes }),
    });
  }

  async deleteAssumptionConflict(id) {
    return this.request(`/assumption-conflicts/${id}`, {
      method: 'DELETE',
    });
  }

  // Health check
  async checkHealth() {
    return this.request('/health', { baseUrl: 'http://localhost:3001' });
  }

  // Time simulation endpoint
  async simulateTime(days) {
    return this.request('/simulate-time', {
      method: 'POST',
      body: JSON.stringify({ days }),
    });
  }

  // Get current simulated time
  async getCurrentTime() {
    return this.request('/simulate-time/current');
  }

  // Parameter Templates endpoints
  async getParameterTemplates(category = null) {
    const query = category ? `?category=${category}` : '';
    return this.request(`/parameter-templates${query}`);
  }

  async addCustomTemplate(category, templateName) {
    return this.request('/parameter-templates', {
      method: 'POST',
      body: JSON.stringify({ category, templateName }),
    });
  }

  async deleteParameterTemplate(templateId) {
    return this.request(`/parameter-templates/${templateId}`, {
      method: 'DELETE',
    });
  }

  async getTemplateCategories() {
    return this.request('/parameter-templates/categories');
  }

  // Users endpoints
  async getOrganizationUsers() {
    return this.request('/users');
  }

  // Reports endpoints
  async generateTeamMemberReport(userId, startDate = null, endDate = null) {
    const payload = { userId };
    if (startDate) payload.startDate = startDate;
    if (endDate) payload.endDate = endDate;

    return this.request('/reports/team-member', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export default new ApiService();
