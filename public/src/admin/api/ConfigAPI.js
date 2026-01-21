/**
 * ConfigAPI - Handles all API communication with the backend
 * Provides live config updates without file downloads
 */

export class ConfigAPI {
  constructor(baseURL = '') {
    this.baseURL = baseURL;
    this.isOnline = true;
  }

  /**
   * Check if API is available
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseURL}/api/health`);
      if (response.ok) {
        this.isOnline = true;
        return await response.json();
      }
    } catch (error) {
      this.isOnline = false;
      console.warn('API health check failed:', error);
    }
    return null;
  }

  /**
   * Get current configuration from server
   */
  async getConfig() {
    try {
      const response = await fetch(`${this.baseURL}/api/config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const config = await response.json();
      this.isOnline = true;
      return config;
    } catch (error) {
      this.isOnline = false;
      console.error('Error fetching config:', error);
      throw error;
    }
  }

  /**
   * Update configuration on server
   */
  async updateConfig(config) {
    try {
      const response = await fetch(`${this.baseURL}/api/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      this.isOnline = true;
      return result;
    } catch (error) {
      this.isOnline = false;
      console.error('Error updating config:', error);
      throw error;
    }
  }

  /**
   * Get quotas from server
   */
  async getQuotas() {
    try {
      const response = await fetch(`${this.baseURL}/api/quotas`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const quotas = await response.json();
      this.isOnline = true;
      return quotas;
    } catch (error) {
      this.isOnline = false;
      console.error('Error fetching quotas:', error);
      throw error;
    }
  }

  /**
   * Update quotas on server
   */
  async updateQuotas(quotas) {
    try {
      const response = await fetch(`${this.baseURL}/api/quotas`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(quotas)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      this.isOnline = true;
      return result;
    } catch (error) {
      this.isOnline = false;
      console.error('Error updating quotas:', error);
      throw error;
    }
  }

  /**
   * Check if server is online
   */
  isServerOnline() {
    return this.isOnline;
  }
}

/**
 * Singleton instance
 */
export const configAPI = new ConfigAPI();
