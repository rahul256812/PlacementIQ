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
  getProfile: async () => {
    const res = await api.get('/auth/profile');
    return res.data;
  },
  updateProfile: async (data: any) => {
    const res = await api.put('/auth/profile', data);
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
  updateJob: async (id: string, data: any) => {
    const res = await api.put(`/jobs/${id}`, data);
    return res.data;
  },
  deleteJob: async (id: string) => {
    const res = await api.delete(`/jobs/${id}`);
    return res.data;
  },
  getJobHistory: async () => {
    const res = await api.get('/jobs/history');
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
  respondToOffer: async (applicationId: string, response: 'ACCEPTED' | 'DECLINED') => {
    const res = await api.patch(`/applications/${applicationId}/respond`, { response });
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

export const AnalyticsService = {
  getAdminAnalytics: async () => {
    const res = await api.get('/analytics/admin');
    return res.data;
  },
  getRecruiterAnalytics: async () => {
    const res = await api.get('/analytics/recruiter');
    return res.data;
  },
  getStudentAnalytics: async () => {
    const res = await api.get('/analytics/student');
    return res.data;
  },
};

export const RoundService = {
  getRounds: async (jobId: string) => {
    const res = await api.get(`/jobs/${jobId}/rounds`);
    return res.data;
  },
  saveRounds: async (jobId: string, rounds: any[]) => {
    const res = await api.post(`/jobs/${jobId}/rounds`, { rounds });
    return res.data;
  },
  progressCandidate: async (applicationId: string, status: 'QUALIFIED' | 'REJECTED', feedback?: string) => {
    const res = await api.post(`/applications/${applicationId}/progress`, { status, feedback });
    return res.data;
  },
  getMessages: async (jobId: string) => {
    const res = await api.get(`/jobs/${jobId}/messages`);
    return res.data;
  },
  sendMessage: async (jobId: string, data: { roundId: string | null; content: string }) => {
    const res = await api.post(`/jobs/${jobId}/messages`, data);
    return res.data;
  },
  saveMcqQuestions: async (roundId: string, questions: any[], mcqDuration?: number | null) => {
    const res = await api.post(`/rounds/${roundId}/mcqs`, { questions, mcqDuration });
    return res.data;
  },
  getMcqQuestions: async (roundId: string) => {
    const res = await api.get(`/rounds/${roundId}/mcqs`);
    return res.data;
  },
  publishMcqTest: async (roundId: string) => {
    const res = await api.post(`/rounds/${roundId}/mcq-publish`);
    return res.data;
  },
  publishCodingTest: async (roundId: string) => {
    const res = await api.post(`/rounds/${roundId}/coding-publish`);
    return res.data;
  },
  releaseMcqResults: async (roundId: string) => {
    const res = await api.post(`/rounds/${roundId}/mcq-release-results`);
    return res.data;
  },
  submitMcqAnswers: async (applicationId: string, roundId: string, data: { answers: any; timeTaken?: number }) => {
    const res = await api.post(`/applications/${applicationId}/rounds/${roundId}/mcq-submit`, data);
    return res.data;
  },
  autoShortlistMcq: async (roundId: string, count: number) => {
    const res = await api.post(`/rounds/${roundId}/auto-shortlist`, { count });
    return res.data;
  },
  saveCodingQuestion: async (roundId: string, data: any) => {
    const res = await api.post(`/rounds/${roundId}/coding`, data);
    return res.data;
  },
  getCodingQuestion: async (roundId: string) => {
    const res = await api.get(`/rounds/${roundId}/coding`);
    return res.data;
  },
  deleteCodingQuestion: async (roundId: string, questionId: string) => {
    const res = await api.delete(`/rounds/${roundId}/coding/${questionId}`);
    return res.data;
  },
  runCodingTest: async (roundId: string, data: { code: string; language: string; questionId?: string; runCount?: number }) => {
    const res = await api.post(`/rounds/${roundId}/coding/run`, data);
    return res.data;
  },
  submitCodingSolution: async (applicationId: string, roundId: string, data: { code: string; language: string; questionId?: string; timeTaken?: number }) => {
    const res = await api.post(`/applications/${applicationId}/rounds/${roundId}/coding-submit`, data);
    return res.data;
  },
  exitCodingTest: async (applicationId: string, roundId: string) => {
    const res = await api.post(`/applications/${applicationId}/rounds/${roundId}/coding-exit`);
    return res.data;
  },
  updateMeetLink: async (applicationId: string, roundId: string, data: { meetLink: string; isMeetLinkPublished: boolean }) => {
    const res = await api.post(`/applications/${applicationId}/rounds/${roundId}/meet-link`, data);
    return res.data;
  },
};

export default api;
