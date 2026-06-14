const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getHeaders() {
  const headers = {};
  
  // Get current user and active dataset from localStorage
  const userStr = localStorage.getItem('supplychainiq_current_user');
  const datasetStr = localStorage.getItem('supplychainiq_current_dataset');
  
  if (userStr) {
    const user = JSON.parse(userStr);
    if (user && user.email) {
      headers['X-User-Email'] = user.email;
    }
  }
  
  if (datasetStr) {
    const dataset = JSON.parse(datasetStr);
    if (dataset && dataset.dataset_id) {
      headers['X-Dataset-Id'] = dataset.dataset_id;
    }
  }
  
  return headers;
}

async function fetchJSON(url) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

async function postJSON(url, body) {
  const headers = {
    'Content-Type': 'application/json',
    ...getHeaders()
  };
  
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

export const api = {
  getHealth: () => fetchJSON('/health'),
  getKPIs: () => fetchJSON('/kpis'),
  getModels: () => fetchJSON('/models'),
  getSuppliers: () => fetchJSON('/suppliers'),
  getSupplier: (name) => fetchJSON(`/suppliers/${encodeURIComponent(name)}`),
  getInventory: () => fetchJSON('/inventory'),
  getAtRiskSKUs: () => fetchJSON('/inventory/at-risk'),
  predictDelay: (data) => postJSON('/predictions/delay', data),
  predictDemand: (data) => postJSON('/predictions/demand', data),
  getPredictionHistory: (email) => fetchJSON(`/predictions/history?user_email=${encodeURIComponent(email)}`),
  
  // Workspace API
  uploadDataset: (formData, email) => {
    return fetch(`${API_BASE}/datasets/upload`, {
      method: 'POST',
      headers: {
        'X-User-Email': email
      },
      body: formData
    }).then(res => {
      if (!res.ok) throw new Error(`Upload error: ${res.status}`);
      return res.json();
    });
  },
  listUserDatasets: () => fetchJSON('/datasets?source=user'),
  deleteDataset: (id) => fetch(`${API_BASE}/datasets/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }).then(res => {
    if (!res.ok) throw new Error(`Delete error: ${res.status}`);
    return res.json();
  })
};
