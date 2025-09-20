import axios from 'axios'
import toast from 'react-hot-toast'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Create axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const client = localStorage.getItem('aeo-client')
    if (client) {
      const { clientId } = JSON.parse(client)
      config.headers['X-Client-ID'] = clientId
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'An error occurred'
    
    // Don't show toast for certain errors
    const silentErrors = [401, 404]
    if (!silentErrors.includes(error.response?.status)) {
      toast.error(message)
    }
    
    return Promise.reject(error)
  }
)

// API functions
export const clientApi = {
  // Create new client
  create: (data: { companyName: string; websiteUrl: string; contactEmail?: string }) =>
    api.post('/clients', data),
  
  // Authenticate with PIN
  authenticate: (data: { pin: string; clientId: string }) =>
    api.post('/auth/client', data),
  
  // Get client info
  get: (clientId: string) =>
    api.get(`/clients/${clientId}`),
  
  // Get client analyses
  getAnalyses: (clientId: string, params?: { limit?: number; offset?: number }) =>
    api.get(`/clients/${clientId}/analyses`, { params }),
}

export const analysisApi = {
  // Start analysis
  analyze: (data: { url: string; clientId: string; options?: any }) =>
    api.post('/analysis', data),
  
  // Get analysis results
  get: (analysisId: string) =>
    api.get(`/analysis/${analysisId}`),
  
  // Get analysis fixes
  getFixes: (analysisId: string) =>
    api.get(`/analysis/${analysisId}/fixes`),
  
  // Generate specific fix
  generateFix: (analysisId: string, data: { category: string; fixType: string }) =>
    api.post(`/analysis/${analysisId}/generate-fix`, data),
}

export const fixApi = {
  // Get fix details
  get: (fixId: string) =>
    api.get(`/fixes/${fixId}`),
  
  // Mark fix as implemented
  implement: (fixId: string, data: { clientId: string; notes?: string }) =>
    api.post(`/fixes/${fixId}/implement`, data),
  
  // Get client fixes
  getClientFixes: (clientId: string, params?: { 
    implemented?: boolean; 
    category?: string; 
    severity?: string 
  }) =>
    api.get(`/fixes/client/${clientId}`, { params }),
}

export const dashboardApi = {
  // Get dashboard data
  get: (clientId: string) =>
    api.get(`/dashboard/${clientId}`),
  
  // Get detailed stats
  getStats: (clientId: string, params?: { days?: number }) =>
    api.get(`/dashboard/${clientId}/stats`, { params }),
}

export const healthApi = {
  // Basic health check
  check: () =>
    api.get('/health'),
  
  // Detailed health check
  detailed: () =>
    api.get('/health/detailed'),
}

export default api
