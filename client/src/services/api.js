import axios from 'axios';

const apiBase = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
export const getApiBaseUrl = () => (apiBase ? `${apiBase}/api` : '/api');

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 45000,
  headers: {
    'Accept': 'application/json'
  }
});

// Response interceptor for consistent error extraction
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const customError = {
      message: error.response?.data?.error?.message || error.message || 'An unexpected error occurred',
      code: error.response?.data?.error?.code || 'UNKNOWN_ERROR',
      details: error.response?.data?.error?.details || null,
      status: error.response?.status
    };
    return Promise.reject(customError);
  }
);

export const uploadResume = async (file) => {
  const formData = new FormData();
  formData.append('resume', file);
  return api.post('/candidates/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const getCandidate = async (candidateId) => {
  return api.get(`/candidates/${candidateId}`);
};

export const createWorkflowRun = async ({ candidateId, jobDescription }) => {
  return api.post('/runs', { candidateId, jobDescription });
};

export const getWorkflowRun = async (runId) => {
  return api.get(`/runs/${runId}`);
};

export const retryWorkflowStage = async (runId, stageKey) => {
  return api.post(`/runs/${runId}/stages/${stageKey}/retry`);
};

export const getWorkflowRunsHistory = async () => {
  return api.get('/runs');
};

export const getHealthStatus = async () => {
  return api.get('/health');
};

export default api;
