const BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (res.status === 204) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export const api = {
  getSizes: () => request('/sizes'),
  createSize: (data) => request('/sizes', { method: 'POST', body: JSON.stringify(data) }),
  updateSize: (id, data) => request(`/sizes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSize: (id) => request(`/sizes/${id}`, { method: 'DELETE' }),
  recommend: (data) => request('/recommend', { method: 'POST', body: JSON.stringify(data) }),
  getCustomers: () => request('/customers'),
  deleteCustomer: (id) => request(`/customers/${id}`, { method: 'DELETE' }),
  // AI / Calibration
  getCalibration: () => request('/calibration'),
  createCalibration: (data) => request('/calibration', { method: 'POST', body: JSON.stringify(data) }),
  deleteCalibration: (id) => request(`/calibration/${id}`, { method: 'DELETE' }),
  aiMeasure: (data) => request('/ai-measure', { method: 'POST', body: JSON.stringify(data) }),
};
