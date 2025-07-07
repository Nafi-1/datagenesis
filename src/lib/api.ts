import axios from 'axios';
import { useStore } from '../store/useStore';
import toast from 'react-hot-toast';

// Global WebSocket reference for API integration
let globalWebSocket: WebSocket | null = null;

// Determine backend URL based on environment
const getBackendUrl = () => {
  // Always use proxy for better development experience
  return '/api';
};

// Create axios instance with dynamic base URL
const api = axios.create({
  baseURL: getBackendUrl(),
  timeout: 10000, // Reduced timeout for health checks
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
  
  return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response?.status || 'NETWORK';
    const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
    const url = error.config?.url || 'unknown';
    
    console.error(`❌ API Error: ${status} ${method} ${url}: ${error.message}`);
    
    if (error.response?.status === 401) {
      // Clear auth state on 401
      localStorage.removeItem('auth_token');
      useStore.getState().setUser(null);
    }
    return Promise.reject(error);
  }
);

export class ApiService {
  // Health check to verify backend connectivity
  static async healthCheck() {
    try {
      console.log('🔍 Health check starting...');
      
      // Use axios for consistency with other API calls
      const response = await api.get('/health');
      
      if (response.status === 200 && response.data) {
        console.log('💚 Backend is healthy:', response.data.message);
        return { healthy: true, data: response.data };
      } else {
        throw new Error(`Invalid response: ${response.status}`);
      }
        
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('💔 Backend health check failed:', errorMessage);
      
      // Check specific error types
      if (errorMessage.includes('Network Error') || errorMessage.includes('ERR_NETWORK')) {
        return { healthy: false, error: 'Backend server not running' };
      } else if (errorMessage.includes('timeout')) {
        return { healthy: false, error: 'Backend timeout - server slow' };
      } else {
        return { healthy: false, error: 'Connection failed' };
      }
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

  // Real-time data generation with WebSocket updates
  static async generateSyntheticDataWithUpdates(config: any, onUpdate?: (update: any) => void) {
    try {
      console.log('🚀 Starting real-time AI generation with config:', config);
      
      // Try to establish WebSocket connection for real-time updates
      if (!globalWebSocket || globalWebSocket.readyState !== WebSocket.OPEN) {
        try {
          const clientId = useStore.getState().user?.id || 'guest_user';
          globalWebSocket = new WebSocket(`ws://127.0.0.1:8000/ws/${clientId}`);
          
          globalWebSocket.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data);
              if (message.type === 'generation_update' && onUpdate) {
                onUpdate(message.data);
              }
            } catch (error) {
              console.error('❌ WebSocket message parsing error:', error);
            }
          };
          
          globalWebSocket.onopen = () => {
            console.log('✅ WebSocket connected for real-time updates');
          };
          
        } catch (wsError) {
          console.warn('⚠️ WebSocket connection failed, proceeding without real-time updates:', wsError);
        }
      }
      
      // Start the generation
      const response = await api.post('/generation/generate-local', config);
      console.log('✅ AI generation completed:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('❌ AI generation failed:', error);
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
      console.log('🎯 Attempting backend generation with config:', config);
      
      // Always try backend first
      try {
        const response = await api.post('/generation/generate-local', config);
        console.log('✅ Backend generation successful:', response.data);
        return response.data;
      } catch (backendError) {
        console.log('⚠️ Backend generation failed, falling back to local generation:', backendError.message);
        throw backendError;
      }
    } catch (error) {
      console.error('❌ Backend generation failed:', error);
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