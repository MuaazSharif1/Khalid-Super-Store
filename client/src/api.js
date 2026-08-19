const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");

// Resolves a stored image value (either a relative /uploads/... path or a full URL)
// into an absolute URL the browser can load.
export function resolveImageUrl(image) {
  if (!image) return "";
  if (/^https?:\/\//i.test(image)) return image;
  return `${API_ORIGIN}${image}`;
}

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Something went wrong. Please try again.");
  }
  return data;
}

async function uploadImage(file, token) {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(`${API_URL}/admin/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Image upload failed");
  return data; // { url: "/uploads/xyz.jpg" }
}

async function uploadMedia(file, token) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/admin/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data; // { media }
}

async function uploadPaymentScreenshot(orderId, file, token) {
  const formData = new FormData();
  formData.append("screenshot", file);

  const res = await fetch(`${API_URL}/orders/${orderId}/payment-screenshot`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data; // { order }
}

export const api = {
  uploadImage,
  uploadMedia,
  uploadPaymentScreenshot,

  // Public
  getCategories: () => request("/categories"),
  getProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/products${qs ? `?${qs}` : ""}`);
  },
  getProduct: (slug) => request(`/products/${slug}`),
  getStores: () => request("/stores"),
  getSiteSettings: () => request("/settings"),

  // Auth
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password } }),
  register: (payload) => request("/auth/register", { method: "POST", body: payload }),
  googleLogin: (credential) => request("/auth/google", { method: "POST", body: { credential } }),
  me: (token) => request("/auth/me", { token }),
  getAddresses: (token) => request("/auth/addresses", { token }),
  addAddress: (payload, token) => request("/auth/addresses", { method: "POST", body: payload, token }),

  // Orders
  createOrder: (payload, token) => request("/orders", { method: "POST", body: payload, token }),
  createSafepaySession: (payload, token) => request("/payments/session", { method: "POST", body: payload, token }),
  safepayStatus: (orderId, token) => request(`/payments/status/${orderId}`, { token }),
  myOrders: (token) => request("/orders/my", { token }),
  myOrderHistory: (token) => request("/orders/my/history", { token }),
  getOrder: (id, token) => request(`/orders/${id}`, { token }),

  // Admin — dashboard
  adminStats: (token) => request("/admin/stats", { token }),
  adminNotifications: (token) => request("/admin/notifications", { token }),

  // Admin — products
  adminProducts: (token) => request("/admin/products", { token }),
  adminCreateProduct: (payload, token) => request("/admin/products", { method: "POST", body: payload, token }),
  adminUpdateProduct: (id, payload, token) => request(`/admin/products/${id}`, { method: "PUT", body: payload, token }),
  adminDeleteProduct: (id, token) => request(`/admin/products/${id}`, { method: "DELETE", token }),

  // Admin — categories
  adminCategories: (token) => request("/admin/categories", { token }),
  adminCreateCategory: (payload, token) => request("/admin/categories", { method: "POST", body: payload, token }),
  adminUpdateCategory: (id, payload, token) => request(`/admin/categories/${id}`, { method: "PUT", body: payload, token }),
  adminReorderCategory: (id, direction, token) =>
    request(`/admin/categories/${id}/reorder`, { method: "PUT", body: { direction }, token }),
  adminDeleteCategory: (id, token) => request(`/admin/categories/${id}`, { method: "DELETE", token }),

  // Admin — media library
  adminMedia: (token) => request("/admin/media", { token }),
  adminDeleteMedia: (id, token) => request(`/admin/media/${id}`, { method: "DELETE", token }),

  // Admin — customers
  adminCustomers: (token) => request("/admin/customers", { token }),

  // Admin — orders
  adminOrders: (params = {}, token) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/orders${qs ? `?${qs}` : ""}`, { token });
  },
  adminGetOrder: (id, token) => request(`/admin/orders/${id}`, { token }),
  adminUpdateOrderStatus: (id, status, note, token) =>
    request(`/admin/orders/${id}/status`, { method: "PUT", body: { status, note }, token }),
  adminUpdateOrderNotes: (id, admin_notes, token) =>
    request(`/admin/orders/${id}/notes`, { method: "PUT", body: { admin_notes }, token }),
  adminConfirmPayment: (id, note, token) =>
    request(`/admin/orders/${id}/payment/confirm`, { method: "PUT", body: { note }, token }),
  adminRejectPayment: (id, note, token) =>
    request(`/admin/orders/${id}/payment/reject`, { method: "PUT", body: { note }, token }),

  // Admin — settings (CMS)
  adminGetSettings: (token) => request("/admin/settings", { token }),
  adminUpdateSettings: (key, value, token) =>
    request(`/admin/settings/${key}`, { method: "PUT", body: value, token }),
};

export default api;
