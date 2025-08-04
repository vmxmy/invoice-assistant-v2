// Backend API Client for communicating with Python backend
export class BackendApiError extends Error {
  statusCode;
  details;
  constructor(message, statusCode, details){
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'BackendApiError';
  }
}
export class BackendApiClient {
  config;
  constructor(config){
    this.config = config;
  }
  async scanEmails(userToken, request) {
    const response = await fetch(`${this.config.baseUrl}/api/v1/email/scan`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new BackendApiError(error.detail || 'Email scan failed', response.status, error);
    }
    return response.json();
  }
  async testEmailConnection(userToken, request) {
    const response = await fetch(`${this.config.baseUrl}/api/v1/email/test-connection`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new BackendApiError(error.detail || 'Connection test failed', response.status, error);
    }
    return response.json();
  }
  async getScanStatus(userToken, scanJobId) {
    const response = await fetch(`${this.config.baseUrl}/api/v1/email/scan/${scanJobId}`, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    if (!response.ok) {
      const error = await response.json();
      throw new BackendApiError(error.detail || 'Failed to get scan status', response.status, error);
    }
    return response.json();
  }
}
