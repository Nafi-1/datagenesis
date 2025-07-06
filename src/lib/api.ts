import axios from 'axios';
import { useStore } from '../store/useStore';
import toast from 'react-hot-toast';

// Determine backend URL based on environment
const getBackendUrl = () => {
  // In development, try direct connection first, then fall back to proxy
  if (import.meta.env.DEV) {
    // Use proxy for better development experience
    return '/api';
  }
  // For production, use relative path
  return '/api';
};

// Create axios instance with dynamic base URL
const api = axios.create({
  baseURL: getBackendUrl(),
  timeout: 15000, // Increase timeout to allow backend to start
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Add guest token for guest users
  const { isGuest } = useStore.getState();
  if (isGuest && !token) {
    config.headers.Authorization = `Bearer guest-access`;
  }
  
  console.log(`🔗 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  (error) => {
    const status = error.response?.status || 'NETWORK';
    const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
    const url = error.config?.url || 'unknown';
    
    console.error(`❌ API Error: ${status} ${method} ${url}`, {
      message: error.message,
      code: error.code,
      response: error.response?.data
    });
    
    if (error.response?.status === 401) {
      // Clear auth state on 401
      localStorage.removeItem('auth_token');
      useStore.getState().setUser(null);
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      console.error('🔌 Backend connection refused - Please ensure backend is running on http://127.0.0.1:8000');
      console.error('💡 Try running: cd backend && python run.py');
    }
    return Promise.reject(error);
  }
);

export class ApiService {
  // Health check to verify backend connectivity
  static async healthCheck() {
    try {
      console.log('🔍 Checking backend health...');
      // Try direct connection first, then proxy
      const healthUrls = ['/api/health'];
      
      let lastError;
      for (const healthUrl of healthUrls) {
        try {
          console.log(`🔍 Trying health check URL: ${healthUrl}`);
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
            signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
          console.log(`💚 Backend is healthy via ${healthUrl}:`, data);
      return { healthy: true, data };
        } catch (error) {
          const errorMessage = (error && typeof error === 'object' && 'message' in error) ? (error as any).message : error;
          console.log(`❌ Health check failed for ${healthUrl}:`, errorMessage);
          lastError = error;
          continue;
        }
      }
      
      throw lastError || new Error('All health check URLs failed');
    } catch (error) {
      const errorMessage = (error instanceof Error) ? error.message : (typeof error === 'object' && error && 'message' in error) ? (error as any).message : String(error);
      console.error('💔 Backend health check failed:', errorMessage);
      return { healthy: false, error: errorMessage || 'Connection failed' };
    }
  }

  // Generation endpoints
  static async startGeneration(data: any) {
    try {
      console.log('🚀 Starting generation with data:', data);
      const response = await api.post('/generation/start', data);
      console.log('✅ Generation started:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Generation start failed:', error);
      throw error;
    }
  }

  static async getGenerationStatus(jobId: string) {
    try {
      const response = await api.get(`/generation/status/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get generation status:', error);
      throw error;
    }
  }

  static async getUserJobs() {
    try {
      const response = await api.get('/generation/jobs');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get user jobs:', error);
      throw error;
    }
  }

  static async analyzeData(data: any) {
    try {
      console.log('📊 Analyzing data:', data);
      const response = await api.post('/generation/analyze', data);
      console.log('✅ Data analysis complete:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Data analysis failed:', error);
      throw error;
    }
  }

  // Schema generation from natural language with better error handling
  static async generateSchemaFromDescription(description: string, domain: string, dataType: string) {
    try {
      console.log('🧠 Generating schema from description:', { description: description.substring(0, 100), domain, dataType });
      
      // First check if backend is healthy
      const health = await this.healthCheck();
      if (!health.healthy) {
        throw new Error(`Backend unavailable: ${health.error}`);
      }
      
      const response = await api.post('/generation/schema-from-description', {
        description,
        domain,
        data_type: dataType
      });
      
      console.log('✅ Schema generated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Schema generation failed:', error);
      
      // Provide specific error messages
      // Narrow error type before property access
      if (
        typeof error === 'object' &&
        error !== null &&
        ('code' in error || 'message' in error)
      ) {
        const err = error as { code?: string; message?: string; response?: any };
        if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error')) {
          throw new Error('Backend service is not running. Please start the backend server.');
        } else if (err.response?.status === 404) {
          throw new Error('Schema generation endpoint not found. Please check backend configuration.');
        } else if (err.response?.status >= 500) {
          throw new Error('Backend server error. Please check server logs.');
        } else if (err.message?.includes('Backend unavailable')) {
          throw error; // Re-throw our custom error
        }
        throw new Error(`Schema generation failed: ${err.message}`);
      }
      throw new Error('Schema generation failed: Unknown error');
    }
  }

  // Local data generation for guests with backend attempt first
  static async generateLocalData(config: any) {
    try {
      console.log('🎯 Attempting local generation with config:', config);
      
      // First try backend even for guests
      try {
        const response = await api.post('/generation/generate-local', config);
        console.log('✅ Backend local generation successful:', response.data);
        return response.data;
      } catch (backendError) {
        console.log('⚠️ Backend unavailable for local generation, this will use frontend fallback');
        throw backendError;
      }
    } catch (error) {
      console.error('❌ Local generation API request failed:', error);
      throw error;
    }
  }

  // Analytics endpoints
  static async getSystemMetrics() {
    try {
      const response = await api.get('/analytics/metrics');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get system metrics:', error);
      throw error;
    }
  }

  static async getAgentStatus() {
    try {
      const response = await api.get('/agents/status');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get agent status:', error);
      throw error;
    }
  }

  // Real-time WebSocket connection
  static createWebSocketConnection(userId: string) {
    const wsUrl = `ws://127.0.0.1:8000/ws/${userId}`;
    console.log('🔌 Creating WebSocket connection:', wsUrl);
    return new WebSocket(wsUrl);
  }
}

export default api;