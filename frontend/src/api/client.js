const API_BASE = '/api';

export const apiClient = async (endpoint, options = {}) => {
  const token = localStorage.getItem('elfaith_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('elfaith_token');
    localStorage.removeItem('elfaith_user');
    if (!window.location.pathname.startsWith('/login') && window.location.pathname !== '/') {
      window.location.href = '/login';
    }
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
};

export const api = {
  get: (url) => apiClient(url, { method: 'GET' }),
  post: (url, body) => apiClient(url, { method: 'POST', body: JSON.stringify(body) }),
  put: (url, body) => apiClient(url, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (url, body) => apiClient(url, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (url) => apiClient(url, { method: 'DELETE' }),
  download: async (endpoint, filename) => {
    const token = localStorage.getItem('elfaith_token');
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error('File download failed');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download';
    document.body.appendChild(a);
    a.click();
    a.remove();
  },
};

