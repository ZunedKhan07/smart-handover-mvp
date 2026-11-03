import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 180000, // analysis calls GitHub and Gemini and can take a while
});

// Turn every failure into an Error with a message that is safe to show to the user.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.message ||
      (err.code === 'ECONNABORTED'
        ? 'The request timed out. Please try again.'
        : err.request
        ? 'Cannot reach the server. Make sure the backend is running.'
        : err.message);
    return Promise.reject(Object.assign(new Error(message), { status: err.response?.status }));
  }
);

// formData: repoUrl, documentation (text), documentationFile (file), force
export const analyzeRepository = (formData) => api.post('/repo/analyze', formData).then((r) => r.data);
export const getProject = (id) => api.get(`/repo/${id}`).then((r) => r.data.project);
export const getReport = (id) => api.get(`/reports/${id}`).then((r) => r.data.report);
export const approveReport = (id) => api.patch(`/reports/${id}/approve`).then((r) => r.data.report);
export const updateReport = (id, data) => api.patch(`/reports/${id}`, data).then((r) => r.data.report);

export default api;
