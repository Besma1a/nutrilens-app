const API_ROOT = `${window.location.protocol}//${window.location.hostname}:8000/api/admin`;

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("adminToken");
  const skipUnauthorizedRedirect = !!options.skipUnauthorizedRedirect;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && !skipUnauthorizedRedirect) {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    window.location.href = "/login";
    throw new Error("Unauthorized.");
  }

  if (!response.ok) {
    let detail = "Request failed.";
    try {
      const payload = await response.json();
      detail = payload.detail || Object.entries(payload).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`).join(" | ") || detail;
    } catch {
      // no-op
    }
    throw new Error(detail);
  }

  if (response.status === 204) return null;
  return response.json();
}

export const adminApi = {
  login: (email, password) =>
    apiFetch("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      skipUnauthorizedRedirect: true,
    }),
  me: () => apiFetch("/me"),
  profile: () => apiFetch("/profile"),
  updateProfile: (payload) =>
    apiFetch("/profile", { method: "PUT", body: JSON.stringify(payload) }),
  changePassword: (payload) =>
    apiFetch("/password", { method: "PUT", body: JSON.stringify(payload) }),
  notifications: ({ unreadOnly = false, limit = 20 } = {}) => {
    const params = new URLSearchParams();
    if (unreadOnly) params.set("unread_only", "true");
    if (limit) params.set("limit", String(limit));
    const qs = params.toString();
    return apiFetch(`/notifications${qs ? `?${qs}` : ""}`);
  },
  markAllNotificationsRead: () =>
    apiFetch("/notifications/mark-all-read", { method: "POST" }),
  markNotificationRead: (id) =>
    apiFetch(`/notifications/${id}/read`, { method: "PATCH" }),
};

export function saveAdminSession(token, admin) {
  localStorage.setItem("adminToken", token);
  localStorage.setItem("adminUser", JSON.stringify(admin));
}
