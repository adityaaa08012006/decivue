// API Service for communicating with backend
const API_BASE_URL = 'http://localhost:3001/api';

class ApiService {
  // Helper method for making requests
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
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

  async evaluateDecision(id) {
    return this.request(`/decisions/${id}/evaluate`, {
      method: 'POST',
    });
  }

  // Assumptions endpoints
  async getAssumptions(decisionId) {
    return this.request(`/assumptions?decisionId=${decisionId}`);
  }

  async createAssumption(data) {
    return this.request('/assumptions', {
      method: 'POST',
      body: JSON.stringify(data),
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

  // Constraints endpoints
  async getConstraints(decisionId) {
    return this.request(`/constraints?decisionId=${decisionId}`);
  }

  async getAllConstraints() {
    return this.request('/constraints/all');
  }

  // Evaluation history endpoints
  async getEvaluationHistory(decisionId) {
    return this.request(`/decisions/${decisionId}/history`);
  }

  // Health check
  async checkHealth() {
    return this.request('/health', { baseUrl: 'http://localhost:3001' });
  }
}

export default new ApiService();
