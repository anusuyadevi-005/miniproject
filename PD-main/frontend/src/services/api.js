// Light fetch wrapper mimicking Axios response structure ({ data })
export const api = {
  async get(url, options = {}) {
    const res = await fetch(url, { method: 'GET', ...options });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || data?.message || `HTTP error! Status: ${res.status}`);
    }
    return { data, status: res.status };
  },

  async post(url, body, options = {}) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      body: JSON.stringify(body),
      ...options
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || data?.message || `HTTP error! Status: ${res.status}`);
    }
    return { data, status: res.status };
  },

  async put(url, body, options = {}) {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      body: JSON.stringify(body),
      ...options
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || data?.message || `HTTP error! Status: ${res.status}`);
    }
    return { data, status: res.status };
  },

  async delete(url, options = {}) {
    const res = await fetch(url, { method: 'DELETE', ...options });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || data?.message || `HTTP error! Status: ${res.status}`);
    }
    return { data, status: res.status };
  }
};
