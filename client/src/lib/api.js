import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Handle 401 errors (token refresh)
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                await axios.post(`${API_BASE_URL}/auth/refresh-token`, {}, { withCredentials: true });
                return api(originalRequest);
            } catch (err) {
                // Refresh failed, redirect to login
                return Promise.reject(err);
            }
        }

        return Promise.reject(error);
    }
);

// Auth APIs
export const authAPI = {
    loginApplicant: (data) => api.post('/auth/login-applicant', data),
    googleLogin: () => window.location.href = `${API_BASE_URL}/auth/google`,
    logout: () => api.get('/auth/logout'),
    getMe: () => api.get('/auth/me'),
    refreshToken: () => api.post('/auth/refresh-token'),
};

// Applicant APIs
export const applicantAPI = {
    getMyIPs: () => api.get('/user/my-ips'),
    createIP: (data) => api.post('/user/ip', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getIPById: (id) => api.get(`/user/ip/${id}`),
    replyToFER: (id, data) => api.post(`/user/ip/${id}/reply`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
};

// IP Attorney APIs
export const attorneyAPI = {
    createApplicant: (data) => api.post('/ip-attorney/create-applicant', data),
    getAllIPs: () => api.get('/ip-attorney/ips'),
    getIPById: (id) => api.get(`/ip-attorney/ips/${id}`),
    issueFER: (id, data) => api.post(`/ip-attorney/ips/${id}/fer`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    changeStatus: (id, data) => api.put(`/ip-attorney/ips/${id}/status`, data),
    runAnalysis: (id) => api.post(`/ip-attorney/ips/${id}/run-analysis`),
};

// Admin APIs
export const adminAPI = {
    getStats: () => api.get('/admin/stats'),
    getAllUsers: (params) => api.get('/admin/users', { params }),
    getUserById: (id) => api.get(`/admin/users/${id}`),
    getAllIPs: (params) => api.get('/admin/ips', { params }),
    getIPById: (id) => api.get(`/admin/ips/${id}`),

    // IP Attorney Management
    authorizeAttorney: (data) => api.post('/admin/attorneys/authorize', data),
    revokeAttorney: (id) => api.delete(`/admin/attorneys/${id}/revoke`),

    // IP Management
    assignIPToAttorney: (data) => api.post('/admin/ips/assign', data),
    createIP: (data) => api.post('/admin/ips/create', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
};

// Public APIs
export const publicAPI = {
    getApprovedIPs: () => api.get('/public/ips/approved'),
    getApprovedIPById: (id) => api.get(`/public/ips/approved/${id}`),
};

// Analysis APIs
export const analysisAPI = {
    getAnalysis: (ipId) => api.get(`/analysis/${ipId}`),
};

export default api;
