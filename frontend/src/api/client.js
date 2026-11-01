import { handleMockRequest } from './mockData';

const rawBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api';
const API_BASE = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

export const apiClient = async (endpoint, options = {}) => {
  const token = localStorage.getItem('elfaith_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  let response;
  let useFallback = false;

  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    // Check if response is HTML or 404/405 from static hosting (e.g. Vercel)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html') || response.status === 404 || response.status === 405) {
      useFallback = true;
    }
  } catch (networkErr) {
    // Network failure (no backend or offline)
    useFallback = true;
  }

  if (useFallback) {
    try {
      return await handleMockRequest(endpoint, options);
    } catch (fallbackErr) {
      throw fallbackErr;
    }
  }

  if (response.status === 401) {
    localStorage.removeItem('elfaith_token');
    localStorage.removeItem('elfaith_user');
    if (!window.location.pathname.startsWith('/login') && window.location.pathname !== '/') {
      window.location.href = '/login';
    }
  }

  let data;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = {};
    }
  } else {
    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || `Server returned error (${response.status})`);
    }
    data = { message: text };
  }

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
