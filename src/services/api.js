
const _backendBase = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')   // strip trailing slash if any
  : `${window.location.protocol}//${window.location.hostname}:8000`;

export const getAPIBaseUrl = () => `${_backendBase}/api/v1`;
export const getAPIRootUrl = () => `${_backendBase}/api`;

const BASE_URL          = getAPIBaseUrl() + "/users";
const MEALS_URL         = getAPIBaseUrl() + "/meals";
const PROFILES_URL      = getAPIBaseUrl() + "/profiles";
const SUBSCRIPTIONS_URL = getAPIBaseUrl() + "/subscriptions";
const PATIENTS_URL      = getAPIBaseUrl() + "/profiles";
const NOTIFICATIONS_URL = getAPIBaseUrl() + "/notifications";

// ─── Global token storage ─────────────────────────────────────────────────────

let globalToken = null;
let onUnauthorizedCallback = null;

const extractRawToken = (tokenLike) => {
  if (!tokenLike) return null;

  if (typeof tokenLike === "object") {
    const candidate = tokenLike.access || tokenLike.token || null;
    return typeof candidate === "string" ? candidate : null;
  }

  if (typeof tokenLike !== "string") return null;

  return tokenLike
    .replace(/^Bearer\s+/i, "")
    .replace(/^Token\s+/i, "")
    .trim();
};

export const setGlobalToken = (tokenLike) => {
  globalToken = extractRawToken(tokenLike);
};
export const clearGlobalToken = () => {
  globalToken = null;
};
export const getToken = () => globalToken;

/**
 * Register a callback to be invoked whenever a 401 Unauthorized response is received.
 */
export const onUnauthorized = (callback) => {
  onUnauthorizedCallback = callback;
};


// ─── Core request helper ──────────────────────────────────────────────────────

const request = async (url, method = "GET", body = null) => {
  const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;

  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Token ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  try {
    const response = await fetch(fullUrl, options);

    if (response.status === 204) return null;

    const text = await response.text();
    if (!text) return null;

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      if (!response.ok) throw new Error(`Server error ${response.status}`);
      return null;
    }

    if (!response.ok) {
      const errorMessage = extractErrorMessage(data);
      if (response.status === 401 && onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    if (error.message === "Failed to fetch") {
      throw new Error("Cannot reach server. Check your connection or try again.");
    }
    throw error;
  }
};

/**
 * Recursively extract a human-readable error message from a DRF error response.
 */
function extractErrorMessage(data) {
  if (!data) return "Something went wrong.";

  if (typeof data === "string") return data;

  if (Array.isArray(data)) {
    const msg = data.map(extractErrorMessage).filter(Boolean).join(" ");
    return msg || "Something went wrong.";
  }

  if (typeof data === "object") {
    if (data.detail) return String(data.detail);

    const messages = [];
    for (const [key, value] of Object.entries(data)) {
      const fieldMsg = extractErrorMessage(value);
      if (fieldMsg && fieldMsg !== "Something went wrong.") {
        if (key === "non_field_errors") {
          messages.push(fieldMsg);
        } else {
          const label = key.replace(/_/g, " ");
          messages.push(`${label}: ${fieldMsg}`);
        }
      }
    }
    if (messages.length > 0) return messages.join(" | ");
  }

  return "Something went wrong.";
}


// ─── AUTH ─────────────────────────────────────────────────────────────────────

export const registerUser = (fullName, email, password, password_confirm) =>
  request("/register/register/", "POST", { fullName, email, password, password_confirm });

export const loginUser = (email, password) =>
  request("/auth/login/", "POST", { email, password });

export const resendVerificationEmail = (email) =>
  request("/auth/resend-verification/", "POST", { email });

export const verifyEmail = (token) =>
  request(`/auth/verify-email/?token=${token}`, "GET");

export const requestPasswordReset = (email) =>
  request("/auth/password-reset/", "POST", { email });

export const confirmPasswordReset = (token, new_password, new_password_confirm) =>
  request("/auth/password-reset-confirm/", "POST", { token, new_password, new_password_confirm });


// ─── PROFILE (users app) ──────────────────────────────────────────────────────

export const saveHealthSetup = (data) =>
  request("/profile/health_setup/", "POST", data);

export const getMyProfile = () =>
  request("/profile/me/", "GET");

export const updateProfile = (data) =>
  (() => {
    const hasFile =
      data &&
      typeof data === "object" &&
      Object.values(data).some((v) => v instanceof File);

    if (!hasFile) {
      return request("/profile/update_profile/", "PATCH", data);
    }

    const form = new FormData();
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null) continue;
      // DRF expects snake_case field names (e.g. profile_picture)
      form.append(key, value);
    }

    return requestMultipart(`${BASE_URL}/profile/update_profile/`, form, "PATCH");
  })();

export const logoutUser = () =>
  request("/auth/logout/", "POST");


// ─────────────────────────────────────────────────────────────────────────────
// PROFILES APP  →  /api/v1/profiles/
// ─────────────────────────────────────────────────────────────────────────────

export const profileApi = {
  getProfile:    ()     => request(`${PROFILES_URL}/profile/`),
  updateProfile: (data) => request(`${PROFILES_URL}/profile/`, "PATCH", data),

  getWeightHistory: async () => {
    const res = await request(`${PROFILES_URL}/weight/`);
    return res?.results || res || [];
  },
  getLatestWeight:  ()         => request(`${PROFILES_URL}/weight/latest/`),
  logWeight:        (payload)  => request(`${PROFILES_URL}/weight/`, "POST", payload),
  updateWeight:     (id, data) => request(`${PROFILES_URL}/weight/${id}/`, "PATCH", data),
  deleteWeight:     (id)       => request(`${PROFILES_URL}/weight/${id}/`, "DELETE"),

  getMeasurements: async () => {
    const res = await request(`${PROFILES_URL}/measurements/`);
    return res?.results || res || [];
  },
  getLatestMeasurement: ()         => request(`${PROFILES_URL}/measurements/latest/`),
  logMeasurement:       (payload)  => request(`${PROFILES_URL}/measurements/`, "POST", payload),
  updateMeasurement:    (id, data) => request(`${PROFILES_URL}/measurements/${id}/`, "PATCH", data),
  deleteMeasurement:    (id)       => request(`${PROFILES_URL}/measurements/${id}/`, "DELETE"),
};


// ─────────────────────────────────────────────────────────────────────────────
// MEALS APP  →  /api/v1/meals/
// ─────────────────────────────────────────────────────────────────────────────

const requestMultipart = async (fullUrl, formData, method = "POST") => {
  const token = getToken();
  const headers = {};
  if (token) headers["Authorization"] = `Token ${token}`;

  try {
    const response = await fetch(fullUrl, {
      method,
      headers,
      body: formData,
    });

    if (response.status === 204) return null;

    const text = await response.text();
    if (!text) return null;

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      if (!response.ok) throw new Error(`Server error ${response.status}`);
      return null;
    }

    if (!response.ok) {
      const errorMessage = extractErrorMessage(data);
      if (response.status === 401 && onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
      throw new Error(errorMessage);
    }
    return data;
  } catch (error) {
    if (error.message === "Failed to fetch") {
      throw new Error("Cannot reach server. Check your connection or try again.");
    }
    throw error;
  }
};

export const mealsApi = {
  getToday:        ()          => request(`${MEALS_URL}/today/`),
  getDailySummary: ()          => request(`${MEALS_URL}/summary/`),
  getHistory:      (days = 7)  => request(`${MEALS_URL}/history/?days=${days}`),

  list:         ()          => request(`${MEALS_URL}/`),
  getOne:       (id)        => request(`${MEALS_URL}/${id}/`),
  createManual: (mealData)  => request(`${MEALS_URL}/`, "POST", mealData),
  deleteMeal:   (id)        => request(`${MEALS_URL}/${id}/`, "DELETE"),
  confirm:      (id)        => request(`${MEALS_URL}/${id}/confirm/`, "POST"),

  create: ({ meal_image, meal_type, consumed_at, notes }) => {
    const form = new FormData();
    form.append("image", meal_image);
    form.append("meal_type",  meal_type);
    if (consumed_at) form.append("consumed_at", consumed_at);
    if (notes)       form.append("notes",       notes);
    return requestMultipart(`${MEALS_URL}/`, form);
  },

  addFood: (mealId, { food_id, quantity, unit }) =>
    request(`${MEALS_URL}/${mealId}/add-food/`, "POST", { food_id, quantity, unit }),

  editFood: (mealId, foodItemPk, data) =>
    request(`${MEALS_URL}/${mealId}/food-items/${foodItemPk}/edit/`, "PATCH", data),

  removeFood: (mealId, foodItemPk) =>
    request(`${MEALS_URL}/${mealId}/food-items/${foodItemPk}/remove/`, "DELETE"),

  searchFoods: (query) =>
    request(`${MEALS_URL}/food-items/?search=${encodeURIComponent(query)}`),

  listFoods: () => request(`${MEALS_URL}/food-items/`),
};

const BLOGS_URL = getAPIBaseUrl() + "/blogs";
const TESTIMONIALS_URL = getAPIBaseUrl() + "/testimonials";
const SUPPORT_URL = getAPIBaseUrl() + "/support";

export const blogsApi = {
  list: () => request(`${BLOGS_URL}/`),
  getOne: (id) => request(`${BLOGS_URL}/${id}/`),
  create: ({ title, content, excerpt, image }) => {
    const form = new FormData();
    form.append("title", title);
    form.append("content", content);
    if (excerpt) form.append("excerpt", excerpt);
    if (image) form.append("image", image);
    return requestMultipart(`${BLOGS_URL}/`, form, "POST");
  },
  update: (id, { title, content, excerpt, image }) => {
    const form = new FormData();
    if (title !== undefined) form.append("title", title);
    if (content !== undefined) form.append("content", content);
    if (excerpt !== undefined) form.append("excerpt", excerpt);
    if (image !== undefined && image !== null) form.append("image", image);
    return requestMultipart(`${BLOGS_URL}/${id}/`, form, "PATCH");
  },
  remove: (id) => request(`${BLOGS_URL}/${id}/`, "DELETE"),
};

export const testimonialsApi = {
  listApproved: () => request(`${TESTIMONIALS_URL}/`),
  submit: ({ name, text, rating, plan }) =>
    request(`${TESTIMONIALS_URL}/`, "POST", { name, text, rating, plan }),
};

export const supportApi = {
  createTicket: ({ name, email, message }) =>
    request(`${SUPPORT_URL}/tickets/`, "POST", { name, email, message }),
};


// ─────────────────────────────────────────────────────────────────────────────
// CONSULTATIONS API  (user side)  →  /api/v1/consultations/consultations/
// ─────────────────────────────────────────────────────────────────────────────

const CONSULTATIONS_URL = getAPIBaseUrl() + "/consultations";
const USERS_URL = getAPIBaseUrl() + "/users";

export const consultationsApi = {

  list:     ()   => request(`${CONSULTATIONS_URL}/consultations/`),
  getOne:   (id) => request(`${CONSULTATIONS_URL}/consultations/${id}/`),

  past:     ()   => request(`${CONSULTATIONS_URL}/consultations/past/`),
  upcoming: ()   => request(`${CONSULTATIONS_URL}/consultations/upcoming/`),

  book: (data) =>
    request(`${CONSULTATIONS_URL}/consultations/`, "POST", data),

  cancel: (id) =>
    request(`${CONSULTATIONS_URL}/consultations/${id}/cancel/`, "POST"),

  getAllFeedback: () =>
    request(`${CONSULTATIONS_URL}/consultations/all-feedback/`),

  getFeedback: (consultationId) =>
    request(`${CONSULTATIONS_URL}/consultations/${consultationId}/feedback/`),

  addFeedback: (consultationId, data) =>
    request(`${CONSULTATIONS_URL}/consultations/${consultationId}/add-feedback/`, "POST", data),

  addUserFeedback: (consultationId, data) =>
    request(`${CONSULTATIONS_URL}/consultations/${consultationId}/add-user-feedback/`, "POST", data),

  listNutritionists: () =>
    request(`${CONSULTATIONS_URL}/nutritionists/`),

  getNutritionist: (id) =>
    request(`${CONSULTATIONS_URL}/nutritionists/${id}/`),
};

export const nutritionistProfileApi = {
  getMyProfile: () =>
    request(`${CONSULTATIONS_URL}/nutritionists/me/`),

  updateMyProfile: (data) =>
    (() => {
      const hasFile =
        data &&
        typeof data === "object" &&
        data.profile_picture instanceof File;

      if (!hasFile) {
        return request(`${CONSULTATIONS_URL}/nutritionists/me/`, "PATCH", data);
      }

      const form = new FormData();
      const fields = [
        "name",
        "phone",
        "specialization",
        "bio",
        "credentials",
        "availability_url",
        "zoom_meeting_link",
      ];
      for (const key of fields) {
        if (data[key] !== undefined && data[key] !== null) {
          form.append(key, data[key]);
        }
      }
      form.append("profile_picture", data.profile_picture);

      return requestMultipart(`${CONSULTATIONS_URL}/nutritionists/me/`, form, "PATCH");
    })(),

  changePassword: ({ oldPassword, newPassword, newPasswordConfirm }) =>
    request(`${USERS_URL}/profile/change_password/`, "POST", {
      old_password: oldPassword,
      new_password: newPassword,
      new_password_confirm: newPasswordConfirm,
    }),
};


// ─────────────────────────────────────────────────────────────────────────────
// NUTRITIONIST SESSIONS API  (Calendar.jsx)
// →  /api/v1/consultations/nutritionist-sessions/
// ─────────────────────────────────────────────────────────────────────────────

export const nutritionistSessionsApi = {
  list: () =>
    request(`${CONSULTATIONS_URL}/nutritionist-sessions/`),

  approve: (id, zoomLink = "") =>
    request(
      `${CONSULTATIONS_URL}/nutritionist-sessions/${id}/approve/`,
      "POST",
      { zoom_link: zoomLink }
    ),

  reject: (id) =>
    request(
      `${CONSULTATIONS_URL}/nutritionist-sessions/${id}/reject/`,
      "POST"
    ),
};


// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTIONS API  →  /api/v1/subscriptions/
// ─────────────────────────────────────────────────────────────────────────────

export const subscriptionsApi = {
  listPlans: () =>
    request(`${SUBSCRIPTIONS_URL}/`, "GET"),

  subscribe: (planOrPayload) =>
    request(
      `${SUBSCRIPTIONS_URL}/subscribe/`,
      "POST",
      typeof planOrPayload === "object" ? planOrPayload : { plan: planOrPayload }
    ),

  unsubscribe: () =>
    request(`${SUBSCRIPTIONS_URL}/unsubscribe/`, "POST"),

  getSubscription: () =>
    request(`${SUBSCRIPTIONS_URL}/get_subscription/`, "GET"),
};


// ─────────────────────────────────────────────────────────────────────────────
// PATIENTS API  (nutritionist side)
// ─────────────────────────────────────────────────────────────────────────────

export const patientsApi = {
  /**
   * GET /api/v1/meals/patients/:id/food-logs/
   */
  getFoodLogs: (patientId, params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined))
    ).toString();
    const url = `${MEALS_URL}/patients/${patientId}/food-logs/${qs ? `?${qs}` : ""}`;
    return request(url);
  },

  /**
   * GET /api/v1/profiles/weight/for_patient/?patient_id=<id>
   */
  getWeightHistory: (patientId, params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries({ patient_id: patientId, ...params }).filter(([, v]) => v !== undefined))
    ).toString();
    const url = `${PROFILES_URL}/weight/for_patient/${query ? `?${query}` : ""}`;
    return request(url);
  },

  /**
   * POST /api/v1/profiles/assign-patient/
   */
  assignPatient: (patientId) => {
    return request(`${PROFILES_URL}/assign-patient/`, "POST", { patient_id: patientId });
  },

  selectNutritionist: (nutritionistId) => {
    return request(`${PROFILES_URL}/select-nutritionist/`, "POST", { nutritionist_id: nutritionistId });
  },

  /**
   * GET /api/v1/profiles/patients/
   * Returns full NutritionistPatientSerializer shape including profile data + active plan.
   */
  getManagedPatients: () => {
    return request(`${PATIENTS_URL}/patients/`);
  },

  /**
   * GET /api/v1/profiles/feedback/?patient_id=<id>
   */
  getPatientFeedback: (patientId) => {
    return request(`${PROFILES_URL}/feedback/?patient_id=${patientId}`);
  },

  /**
   * POST /api/v1/profiles/feedback/
   */
  sendFeedback: (patientId, title, message) => {
    return request(`${PROFILES_URL}/feedback/`, "POST", {
      user: patientId,
      title,
      message,
    });
  },

  /**
   * GET /api/v1/profiles/feedback/
   */
  getFeedback: () => {
    return request(`${PROFILES_URL}/feedback/`);
  },

  /**
   * GET /api/v1/profiles/diet-plans/?patient_id=<id>
   */
  getDietPlans: (patientId) => {
    return request(`${PROFILES_URL}/diet-plans/?patient_id=${patientId}`);
  },

  /**
   * GET /api/v1/profiles/diet-plans/active/?patient_id=<id>
   */
  getActiveDietPlan: (patientId) => {
    return request(`${PROFILES_URL}/diet-plans/active/?patient_id=${patientId}`);
  },

  /**
   * PATCH /api/v1/profiles/diet-plans/:id/?patient_id=<id>
   * Nutritionist updates a managed patient's plan (calorie / macro targets).
   */
  updatePatientDietPlan: (patientId, planId, data) => {
    const q = new URLSearchParams({ patient_id: String(patientId) }).toString();
    return request(`${PROFILES_URL}/diet-plans/${planId}/?${q}`, "PATCH", data);
  },

  /**
   * POST /api/v1/profiles/diet-plans/
   * Nutritionist assigns a new diet plan to a patient.
   */
  assignDietPlan: (patientId, planData) => {
    return request(`${PROFILES_URL}/diet-plans/`, "POST", {
      user: patientId,
      ...planData,
    });
  },

  /**
   * POST /api/v1/profiles/feedback/mark_as_read/
   * Patient marks a received feedback note as read.
   */
  markFeedbackAsRead: (feedbackId) =>
    request(`${PROFILES_URL}/feedback/mark_as_read/`, "POST", { feedback_id: feedbackId }),
};

export const dietPlansApi = {
  /**
   * GET /api/v1/profiles/diet-plans/active/
   * Current authenticated user's active diet plan.
   */
  getActive: async () => {
    try {
      return await request(`${PROFILES_URL}/diet-plans/active/`);
    } catch (err) {
      const msg = err?.message || "";
      if (msg === "No active diet plan found.") {
        return null;
      }
      throw err;
    }
  },

  /**
   * GET /api/v1/profiles/diet-plans/
   * All diet plans for current authenticated user.
   */
  getAll: () => {
    return request(`${PROFILES_URL}/diet-plans/`);
  },
};

export const dietPlanTemplatesApi = {
  /**
   * Public catalog (blog-like GET)
   * GET /api/v1/profiles/diet-plan-templates/
   */
  list: () => request(`${PROFILES_URL}/diet-plan-templates/`),

  /**
   * Nutritionist library (own + system templates)
   * GET /api/v1/profiles/diet-plan-templates/?scope=mine
   */
  listMine: () => request(`${PROFILES_URL}/diet-plan-templates/?scope=mine`),

  /**
   * POST /api/v1/profiles/diet-plan-templates/
   */
  create: (payload) => {
    if (payload instanceof FormData) {
      return requestMultipart(`${PROFILES_URL}/diet-plan-templates/`, payload, "POST");
    }
    return request(`${PROFILES_URL}/diet-plan-templates/`, "POST", payload);
  },

  /**
   * PATCH /api/v1/profiles/diet-plan-templates/:id/
   */
  update: (id, payload) => {
    if (payload instanceof FormData) {
      return requestMultipart(`${PROFILES_URL}/diet-plan-templates/${id}/`, payload, "PATCH");
    }
    return request(`${PROFILES_URL}/diet-plan-templates/${id}/`, "PATCH", payload);
  },

  /**
   * DELETE /api/v1/profiles/diet-plan-templates/:id/
   */
  remove: (id) => request(`${PROFILES_URL}/diet-plan-templates/${id}/`, "DELETE"),
};

export const publicDietPlanTemplatesApi = {
  /**
   * Public catalog (no auth required)
   * GET /api/v1/profiles/public-diet-plan-templates/
   */
  list: () => request(`${PROFILES_URL}/public-diet-plan-templates/`),

  /**
   * GET /api/v1/profiles/public-diet-plan-templates/:id/
   */
  getOne: (id) => request(`${PROFILES_URL}/public-diet-plan-templates/${id}/`),
};

// ─────────────────────────────────────────────────────────────────────────────
// PLAN ASSIGNMENTS (P3)  →  /api/plan-assignments/  (root /api, not /api/v1/)
// ─────────────────────────────────────────────────────────────────────────────

export const planAssignmentsApi = {
  /**
   * PATCH /api/plan-assignments/:id/
   * Body: partial camelCase { mealIds?, portionSize?, scheduledDate?, notes? }
   * Returns the updated assignment object (payload `data` unwrapped).
   */
  patch: async (assignmentId, body) => {
    const url = `${getAPIRootUrl()}/plan-assignments/${encodeURIComponent(assignmentId)}/`;
    const res = await request(url, "PATCH", body);
    if (res && typeof res === "object" && "data" in res) return res.data;
    return res;
  },
};


// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS API  →  /api/v1/notifications/
// ─────────────────────────────────────────────────────────────────────────────

export const notificationsApi = {
  /**
   * GET /api/v1/notifications/
   * Returns all notifications for the current user, newest first.
   * Pass { unreadOnly: true } to filter to unread ones.
   */
  list: ({ unreadOnly = false } = {}) => {
    const qs = unreadOnly ? "?unread_only=true" : "";
    return request(`${NOTIFICATIONS_URL}/${qs}`);
  },

  /**
   * PATCH /api/v1/notifications/<id>/read/
   * Mark a single notification as read. Returns the updated notification.
   */
  markRead: (id) =>
    request(`${NOTIFICATIONS_URL}/${id}/read/`, "PATCH"),

  /**
   * POST /api/v1/notifications/mark-all-read/
   * Bulk-mark every unread notification as read.
   * Returns { marked_read: <count> }.
   */
  markAllRead: () =>
    request(`${NOTIFICATIONS_URL}/mark-all-read/`, "POST"),

  /**
   * DELETE /api/v1/notifications/<id>/delete/
   * Permanently remove a notification.
   */
  delete: (id) =>
    request(`${NOTIFICATIONS_URL}/${id}/delete/`, "DELETE"),
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC STATS  →  /api/v1/users/public-stats/  (no auth required)
// ─────────────────────────────────────────────────────────────────────────────

export const publicApi = {
  /**
   * GET /api/v1/users/public-stats/
   * Returns { member_count: number, recent_avatars: [{initial, color}] }
   */
  stats: () =>
    fetch(`${BASE_URL}/public-stats/`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .catch(() => null),
};