import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = sessionStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        sessionStorage.setItem('accessToken', data.data.accessToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const authService = {
  login:          (email, password) => api.post('/auth/login', { email: email.trim(), password }),
  logout:         ()                => api.post('/auth/logout'),
  refreshToken:   (token)           => api.post('/auth/refresh', { refreshToken: token }),
  me:             ()                => api.get('/auth/me'),
  changePassword: (body)            => api.post('/auth/change-password', body),
};

export const usersService = {
  list:       (params = {}) => api.get('/users',           { params }),
  get:        (id)          => api.get(`/users/${id}`),
  create:     (body)        => api.post('/users',           body),
  update:     (id, body)    => api.put(`/users/${id}`,      body),
  deactivate: (id)          => api.patch(`/users/${id}/deactivate`),
  activate:   (id)          => api.patch(`/users/${id}/activate`),
};

export const ticketsService = {
  dashboard:  ()            => api.get('/tickets/dashboard'),
  list:       (params = {}) => api.get('/tickets',                       { params }),
  get:        (id)          => api.get(`/tickets/${id}`),
  create:     (body)        => api.post('/tickets',                       body),
  update:     (id, body)    => api.put(`/tickets/${id}`,                  body),
  assign:     (id, body)    => api.patch(`/tickets/${id}/assign`,         body),
  setStatus:  (id, body)    => api.patch(`/tickets/${id}/status`,         body),
  delete:     (id)          => api.delete(`/tickets/${id}`),
  addComment: (id, body)    => api.post(`/tickets/${id}/comments`,        body),
  timeline:   (id)          => api.get(`/tickets/${id}/timeline`),
  activity:   (id)          => api.get(`/tickets/${id}/activity`),
  logEmail:   (id, body)    => api.post(`/tickets/${id}/activity/email`,  body),
};

export const emailService = {
  list:          (ticketId)          => api.get(`/tickets/${ticketId}/emails`),
  get:           (ticketId, emailId) => api.get(`/tickets/${ticketId}/emails/${emailId}`),
  send:          (ticketId, body)    => api.post(`/tickets/${ticketId}/emails/send`,    body),
  receive:       (ticketId, body)    => api.post(`/tickets/${ticketId}/emails/receive`, body),
  replyDefaults: (ticketId)          => api.get(`/tickets/${ticketId}/emails/reply-defaults`),
  smtpStatus:    (ticketId)          => api.get(`/tickets/${ticketId}/emails/smtp-status`),
};

export const categoriesService = {
  list: () => api.get('/categories'),
};

export const reportsService = {
  volumes:     (params = {}) => api.get('/reports/volumes',     { params }),
  status:      (params = {}) => api.get('/reports/status',      { params }),
  categories:  (params = {}) => api.get('/reports/categories',  { params }),
  performance: (params = {}) => api.get('/reports/performance', { params }),
  sla:         (params = {}) => api.get('/reports/sla',         { params }),
  export: (params = {}) => api.get('/reports/export', {
    params,
    responseType: params.format === 'csv' || params.format === 'excel' ? 'blob' : 'json',
  }),
};

export const importService = {
  template: (format = 'xlsx') =>
    api.get('/import/template', { params: { format }, responseType: 'blob' }),
  preview:  (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/import/preview', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  import: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/import/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const gdprService = {
  exportMyData: () => api.get('/gdpr/export-my-data', { responseType: 'blob' }),
  anonymiseUser: (userId) => api.post(`/gdpr/anonymise/${userId}`),
};

export const auditService = {
  list: (params = {}) => api.get('/audit', { params }),
};
