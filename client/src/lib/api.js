async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  // Try to parse json even for errors
  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const msg = data?.message || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export const api = {
  products: {
    list: (params = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") return;
        qs.set(k, String(v));
      });
      const q = qs.toString();
      return request(`/api/products${q ? `?${q}` : ""}`);
    },
    create: (payload) =>
      request("/api/products", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    update: (id, payload) =>
      request(`/api/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    remove: (id) => request(`/api/products/${id}`, { method: "DELETE" }),
  },
  orders: {
    checkout: (payload) =>
      request("/api/orders/checkout", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    list: (params = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") return;
        qs.set(k, String(v));
      });
      const q = qs.toString();
      return request(`/api/orders${q ? `?${q}` : ""}`);
    },
    get: (id) => request(`/api/orders/${id}`),
  },
};
