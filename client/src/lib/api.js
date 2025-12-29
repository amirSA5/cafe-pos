import { getAuth, clearAuth } from "./auth";

const API_BASE = ""; // same origin, Vite proxy handles /api

async function request(path, options = {}) {
  const auth = getAuth();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (auth?.token) headers.Authorization = `Bearer ${auth.token}`;

  const res = await fetch(API_BASE + path, { ...options, headers });

  if (!res.ok) {
    // Auto logout if token invalid
    if (res.status === 401) clearAuth();

    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      msg = data?.message || msg;
    } catch {}
    throw new Error(msg);
  }

  // 204 no content
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  auth: {
    login: (payload) =>
      request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
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

    summary: (params = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") return;
        qs.set(k, String(v));
      });
      const q = qs.toString();
      return request(`/api/orders/summary${q ? `?${q}` : ""}`);
    },
    void: (id, payload) =>
      request(`/api/orders/${id}/void`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
  users: {
    list: (params = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") return;
        qs.set(k, String(v));
      });
      const q = qs.toString();
      return request(`/api/users${q ? `?${q}` : ""}`);
    },
    create: (payload) =>
      request("/api/users", { method: "POST", body: JSON.stringify(payload) }),
    update: (id, payload) =>
      request(`/api/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    resetPassword: (id, payload) =>
      request(`/api/users/${id}/reset-password`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
  stock: {
    restock: (payload) =>
      request("/api/stock/restock", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    movements: (params = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") return;
        qs.set(k, String(v));
      });
      const q = qs.toString();
      return request(`/api/stock/movements${q ? `?${q}` : ""}`);
    },
  },
  // Suppliers
  suppliers: {
    list: (params = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") return;
        qs.set(k, String(v));
      });
      const q = qs.toString();
      return request(`/api/suppliers${q ? `?${q}` : ""}`);
    },
    create: (payload) =>
      request("/api/suppliers", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    update: (id, payload) =>
      request(`/api/suppliers/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    remove: (id) =>
      request(`/api/suppliers/${id}`, {
        method: "DELETE",
      }),
  },

  // Purchase Invoices
  purchaseInvoices: {
    list: (params = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") return;
        qs.set(k, String(v));
      });
      const q = qs.toString();
      return request(`/api/purchase-invoices${q ? `?${q}` : ""}`);
    },
    get: (id) => request(`/api/purchase-invoices/${id}`),
    create: (payload) =>
      request("/api/purchase-invoices", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    post: (id, payload = {}) =>
      request(`/api/purchase-invoices/${id}/post`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
};
