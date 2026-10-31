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
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (networkErr) {
    throw new Error(
      `Cannot connect to backend server at ${API_BASE}. ` +
      (window.location.hostname.includes('vercel.app')
        ? 'Your backend server is running locally on your PC, not in the cloud. Access the system at http://localhost:5173 or deploy the backend to a cloud host and configure VITE_API_URL.'
        : 'Please ensure the backend server is running on port 5000.')
    );
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
      if (response.status === 404) {
        throw new Error(
          window.location.hostname.includes('vercel.app')
            ? `Backend API is not deployed on Vercel (404). This Vercel link only hosts the frontend. To use the full system with the database, open http://localhost:5173 on your computer, or deploy the backend server to Render/Railway and set VITE_API_URL.`
            : `API endpoint '${endpoint}' was not found (404).`
        );
      }
      throw new Error(`Server returned error (${response.status}): ${text.slice(0, 120)}`);
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

