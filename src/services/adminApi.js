const API_ROOT = `${window.location.protocol}//localhost:8000/api/admin`;

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
      detail = payload.detail || detail;
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
};

export function saveAdminSession(token, admin) {
  localStorage.setItem("adminToken", token);
  localStorage.setItem("adminUser", JSON.stringify(admin));
}
