import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const AuthService = {
  login: async (data: any) => {
    const res = await api.post('/auth/login', data);
    return res.data;
  },
  signup: async (data: any) => {
    const res = await api.post('/auth/signup', data);
    return res.data;
  },
};

export const JobService = {
  getAllJobs: async () => {
    const res = await api.get('/jobs');
    return res.data;
  },
  getRecruiterJobs: async () => {
    const res = await api.get('/jobs/me');
    return res.data;
  },
  createJob: async (data: any) => {
    const res = await api.post('/jobs', data);
    return res.data;
  },
};

export const ApplicationService = {
  applyToJob: async (jobId: string, data: any) => {
    const res = await api.post(`/applications/${jobId}`, data);
    return res.data;
  },
  getMyApplications: async () => {
    const res = await api.get('/applications/me');
    return res.data;
  },
  getJobApplicants: async (jobId: string) => {
    const res = await api.get(`/applications/job/${jobId}`);
    return res.data;
  },
  updateStatus: async (applicationId: string, status: string) => {
    const res = await api.patch(`/applications/${applicationId}/status`, { status });
    return res.data;
  },
};

export const AdminService = {
  getRecruiters: async () => {
    const res = await api.get('/admin/recruiters');
    return res.data;
  },
  updateRecruiterStatus: async (id: string, status: string) => {
    const res = await api.patch(`/admin/recruiters/${id}/status`, { status });
    return res.data;
  },
};

export default api;
