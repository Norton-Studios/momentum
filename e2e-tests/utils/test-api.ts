import axios from 'axios';

export interface TestUser {
  email: string;
  password: string;
  apiToken: string;
  tenantId: string;
}

export class TestAPI {
  private baseURL = 'http://localhost:3001';
  private systemAdminToken = 'test-system-admin-token-12345';
  
  // Create a tenant and return the admin user credentials
  async createTestTenant(name: string = 'test-tenant'): Promise<TestUser> {
    const response = await axios.post(`${this.baseURL}/tenant`, {
      name,
      adminEmail: `admin@${name}.test`
    }, {
      headers: {
        'x-system-admin-token': this.systemAdminToken
      }
    });
    
    return {
      email: response.data.admin.email,
      password: response.data.admin.password,
      apiToken: response.data.admin.apiToken,
      tenantId: response.data.tenant.id
    };
  }
  
  // Create auth header for API calls
  createAuthHeader(user: TestUser): string {
    // Use API token as both username and password
    const credentials = Buffer.from(`${user.apiToken}:${user.apiToken}`).toString('base64');
    return `Basic ${credentials}`;
  }
  
  // Create a team using tenant credentials
  async createTeam(user: TestUser, name: string): Promise<any> {
    const response = await axios.post(`${this.baseURL}/team`, {
      name
    }, {
      headers: {
        'Authorization': this.createAuthHeader(user)
      }
    });
    
    return response.data;
  }
  
  // Get teams for a user
  async getTeams(user: TestUser): Promise<any[]> {
    const response = await axios.get(`${this.baseURL}/teams`, {
      headers: {
        'Authorization': this.createAuthHeader(user)
      }
    });
    
    return response.data;
  }
  
  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseURL}/`);
      return response.status === 200;
    } catch {
      return false;
    }
  }
}