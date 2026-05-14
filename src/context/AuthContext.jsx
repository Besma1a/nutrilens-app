import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { setGlobalToken, clearGlobalToken, subscriptionsApi, profileApi, onUnauthorized } from "../services/api";

export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// ─── Normalize backend snake_case → frontend camelCase ───────────────────────
function normalizeUser(raw) {
  if (!raw) return null;

  const stats = raw.stats
    ? {
        currentWeight: raw.stats.currentWeight ?? raw.stats.current_weight ?? null,
        startWeight:   raw.stats.startWeight   ?? raw.stats.start_weight   ?? null,
        goalWeight:    raw.stats.goalWeight     ?? raw.stats.goal_weight    ?? null,
        height:        raw.stats.height         ?? null,
        bodyFat:       raw.stats.bodyFat        ?? raw.stats.body_fat       ?? null,
      }
    : null;

  return {
    // Identity
    id:        raw.id        ?? null,
    username:  raw.username  ?? "",
    email:     raw.email     ?? "",
    firstName: raw.firstName ?? raw.first_name ?? "",
    lastName:  raw.lastName  ?? raw.last_name  ?? "",
    name:      raw.name      ?? `${raw.firstName ?? raw.first_name ?? ""} ${raw.lastName ?? raw.last_name ?? ""}`.trim(),
    gender:    raw.gender    ?? "",
    dob:       raw.dob       ?? raw.date_of_birth ?? "",
    location:  raw.location  ?? "",
    profilePicture: (() => {
      const pic = raw.profilePicture ?? raw.profile_picture ?? "";
      if (!pic) return "";
      if (pic.startsWith("http") || pic.startsWith("data:")) return pic;
      return `${window.location.protocol}//${window.location.hostname}:8000${pic}`;
    })(),

    // Goals & nutrition
    goalType:         raw.goalType         ?? raw.goal_type          ?? "",
    goalDesc:         raw.goalDesc         ?? raw.goal_desc          ?? "",
    dietStyle:        raw.dietStyle        ?? raw.diet_style         ?? "",
    activityLevel:    raw.activityLevel    ?? raw.activity_level     ?? "",
    sleepTargetHours: raw.sleepTargetHours ?? raw.sleep_target_hours ?? 7.5,

    // Goal Management
    goalSettingMode:   raw.goalSettingMode   ?? raw.goal_setting_mode   ?? "auto",
    managedBy:         raw.managedBy         ?? raw.managed_by           ?? null,
    managedByUsername: raw.managedByUsername ?? raw.managed_by_username ?? null,
    nutritionistId:    raw.nutritionistId    ?? raw.nutritionist_id      ?? null,

    // Target Macros
    dailyCalorieGoal: raw.dailyCalorieGoal ?? raw.daily_calorie_goal ?? null,
    proteinGoalG:     raw.proteinGoalG     ?? raw.protein_goal_g     ?? null,
    carbsGoalG:       raw.carbsGoalG       ?? raw.carbs_goal_g       ?? null,
    fatGoalG:         raw.fatGoalG         ?? raw.fat_goal_g         ?? null,

    // Contact
    phoneNumber: raw.phoneNumber ?? raw.phone_number ?? "",

    // Medical
    medicalConditions: raw.medicalConditions ?? raw.medical_conditions ?? [],
    medications:       raw.medications       ?? [],
    allergies:         raw.allergies         ?? [],

    // Subscription
    isSubscribed: raw.isSubscribed ?? raw.is_subscribed ?? null,
    planName:     raw.planName     ?? raw.plan_name     ?? raw.plan ?? null,
    subscriptionStatus: raw.subscriptionStatus ?? raw.status ?? null,
    subscriptionEndDate: raw.subscriptionEndDate ?? raw.endDate ?? null,
    subscriptionDaysRemaining: raw.subscriptionDaysRemaining ?? raw.daysRemaining ?? null,

    // Status flags
    emailVerified:      raw.emailVerified      ?? raw.email_verified      ?? false,
    onboardingComplete: raw.onboardingComplete ?? raw.onboarding_complete ?? false,
    isNutritionist:     raw.isNutritionist     ?? raw.is_nutritionist     ?? false,
    isStaff:            raw.isStaff            ?? raw.is_staff            ?? false,  // FIX: admin routing
    isSuperuser:        raw.isSuperuser        ?? raw.is_superuser        ?? false,  // FIX: admin routing

    // Scan tracking
    scansUsedToday: raw.scansUsedToday ?? raw.scans_used_today ?? 0,

    // Body stats
    stats,
  };
}

// ─── Safely read/write localStorage ──────────────────────────────────────────
const storage = {
  getUser: () => {
    try {
      const s = localStorage.getItem('authUser');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  },
  setUser: (data) => {
    try { localStorage.setItem('authUser', JSON.stringify(data)); } catch {}
  },
  getToken: () => {
    try { return localStorage.getItem('authToken') || null; } catch { return null; }
  },
  setToken: (t) => {
    try { localStorage.setItem('authToken', t); } catch {}
  },
  clear: () => {
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
    } catch {}
  },
};

const normalizeToken = (tokenLike) => {
  if (!tokenLike) return null;

  if (typeof tokenLike === "object") {
    const candidate = tokenLike.access || tokenLike.token || null;
    return typeof candidate === "string"
      ? candidate.replace(/^Bearer\s+/i, "").replace(/^Token\s+/i, "").trim()
      : null;
  }

  if (typeof tokenLike !== "string") return null;

  return tokenLike
    .replace(/^Bearer\s+/i, "")
    .replace(/^Token\s+/i, "")
    .trim();
};

// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [token, setToken]     = useState(null);
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !loading && !!token && !!user;
  const isSubscribed    = !!user?.isSubscribed;

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = storage.getToken();
        const storedUser  = storage.getUser();

        if (storedToken && storedUser) {
          const normalizedToken = normalizeToken(storedToken);
          if (!normalizedToken) {
            storage.clear();
            clearGlobalToken();
            return;
          }

          setGlobalToken(normalizedToken);
          setToken(normalizedToken);
          storage.setToken(normalizedToken);
          setUser(normalizeUser(storedUser));
          
          // Fetch subscription status from backend after setting token
          try {
            const subscriptionData = await subscriptionsApi.getSubscription();
            setUser((prev) => {
              if (!prev) return prev;
              const updated = {
                ...prev,
                isSubscribed: subscriptionData.isSubscribed,
                planName: subscriptionData.plan,
                subscriptionStatus: subscriptionData.status,
                subscriptionEndDate: subscriptionData.endDate,
                subscriptionDaysRemaining: subscriptionData.daysRemaining,
              };
              storage.setUser(updated);
              return updated;
            });
          } catch (subError) {
            console.warn('Could not fetch subscription status on init:', subError);
            
            // FIX: If the token is invalid or unauthorized, clear the session entirely
            const errMsg = subError?.message || "";
            if (errMsg.toLowerCase().includes('invalid token') || errMsg.includes('401')) {
              logout();
            }
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth from localStorage:', error);
        storage.clear();
        clearGlobalToken();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // ── Auth actions ───────────────────────────────────────────────────────────

  const login = async (userData, authToken) => {
    const normalizedToken = normalizeToken(authToken);
    if (!normalizedToken) {
      throw new Error("Login response did not include a valid token.");
    }

    setGlobalToken(normalizedToken);
    setToken(normalizedToken);
    const normalized = normalizeUser(userData);
    setUser(normalized);
    storage.setToken(normalizedToken);
    storage.setUser(normalized);

    // Hydrate profile stats/goals from profiles app so dashboard fields
    // (goal weight, height, macros) are always available in auth state.
    // NOTE: this requires the /api/v1/profiles/ app to be registered in urls.py.
    // If that app is not set up yet, this silently skips — it does NOT break login.
    try {
      const profileData = await profileApi.getProfile();
      if (profileData) {
        updateUserState((prev) => ({
          ...prev,
          managedBy: profileData?.managed_by ?? prev?.managedBy ?? null,
          managedByUsername: profileData?.managed_by_username ?? prev?.managedByUsername ?? null,
          nutritionistId: profileData?.nutritionist_id ?? prev?.nutritionistId ?? null,
          stats: {
            ...(prev?.stats || {}),
            currentWeight: profileData?.current_weight_kg ?? prev?.stats?.currentWeight ?? null,
            startWeight: profileData?.start_weight_kg ?? prev?.stats?.startWeight ?? null,
            goalWeight: profileData?.goal_weight_kg ?? prev?.stats?.goalWeight ?? null,
            height: profileData?.height_cm ?? prev?.stats?.height ?? null,
          },
          dailyCalorieGoal: profileData?.daily_calorie_goal ?? prev?.dailyCalorieGoal ?? null,
          proteinGoalG: profileData?.protein_goal_g ?? prev?.proteinGoalG ?? null,
          carbsGoalG: profileData?.carbs_goal_g ?? prev?.carbsGoalG ?? null,
          fatGoalG: profileData?.fat_goal_g ?? prev?.fatGoalG ?? null,
        }));
      }
    } catch (profileError) {
      console.warn('Could not fetch profile stats on login (profiles app may not be set up):', profileError.message);
    }

    // Immediately hydrate subscription state from backend
    // (login response may not include subscription data)
    try {
      const subscriptionData = await subscriptionsApi.getSubscription();
      setUser((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          isSubscribed: subscriptionData.isSubscribed,
          planName: subscriptionData.plan,
          subscriptionStatus: subscriptionData.status,
          subscriptionEndDate: subscriptionData.endDate,
          subscriptionDaysRemaining: subscriptionData.daysRemaining,
        };
        storage.setUser(updated);
        return updated;
      });
    } catch (subError) {
      console.warn('Could not fetch subscription status on login:', subError);
    }
  };

  const registerUser = (userData, authToken) => {
    const normalizedToken = normalizeToken(authToken);
    if (!normalizedToken) {
      throw new Error("Registration response did not include a valid token.");
    }

    const normalized = normalizeUser(userData);
    setGlobalToken(normalizedToken);
    setToken(normalizedToken);
    setUser(normalized);
    storage.setToken(normalizedToken);
    storage.setUser(normalized); // FIX: store normalized (not raw) so page refresh works
  };

  const logout = useCallback(() => {
    console.warn("Logging out due to session expiration or user action.");
    clearGlobalToken();
    setToken(null);
    setUser(null);
    storage.clear();
  }, []);

  // Register global 401 handler
  useEffect(() => {
    onUnauthorized(() => {
      logout();
    });
  }, [logout]);

  // ── Update helpers ─────────────────────────────────────────────────────────

  const updateUserState = (updater) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next       = typeof updater === "function" ? updater(prev) : updater;
      const normalized = normalizeUser(next);

      // Some endpoints (e.g. users/profile) don't include subscription
      // or nutrition-goal fields. Preserve existing values in that case
      // so saving profile details never wipes subscription/progress state.
      const mergedStats = {
        ...(prev.stats || {}),
        ...(normalized.stats || {}),
      };
      const preserved = {
        ...normalized,
        isSubscribed:
          normalized.isSubscribed ?? prev.isSubscribed,
        planName:
          normalized.planName ?? prev.planName,
        subscriptionStatus:
          normalized.subscriptionStatus ?? prev.subscriptionStatus,
        subscriptionEndDate:
          normalized.subscriptionEndDate ?? prev.subscriptionEndDate,
        subscriptionDaysRemaining:
          normalized.subscriptionDaysRemaining ?? prev.subscriptionDaysRemaining,
        dailyCalorieGoal:
          normalized.dailyCalorieGoal ?? prev.dailyCalorieGoal,
        proteinGoalG:
          normalized.proteinGoalG ?? prev.proteinGoalG,
        carbsGoalG:
          normalized.carbsGoalG ?? prev.carbsGoalG,
        fatGoalG:
          normalized.fatGoalG ?? prev.fatGoalG,
        stats: mergedStats,
      };

      // Persist normalized data to localStorage so refresh sees the latest values
      storage.setUser(preserved);

      return preserved;
    });
  };

  // ── Onboarding ─────────────────────────────────────────────────────────────

  const completeHealthOnboarding = (dataOrResponse) => {
    const raw = dataOrResponse?.user ?? dataOrResponse;
    const next = normalizeUser({
      ...raw,
      onboardingComplete: true,
      onboarding_complete: true,
    });
    setUser(next);
    storage.setUser(next);
  };

  // ── Profile actions ────────────────────────────────────────────────────────

  const subscribe = async (planName) => {
    try {
      const response = await subscriptionsApi.subscribe(planName);
      // Update subscription state and clear any previously assigned nutritionist
      // so the user is forced through nutritionist selection on resubscription.
      updateUserState((prev) => ({
        ...prev,
        isSubscribed: response.isSubscribed,
        planName: response.plan,
        subscriptionStatus: response.status,
        subscriptionEndDate: response.endDate,
        subscriptionDaysRemaining: response.daysRemaining,
        managedBy: null,
        managedByUsername: null,
        nutritionistId: null,
      }));
      return response;
    } catch (error) {
      console.error('Subscription failed:', error);
      throw error;
    }
  };

  const unsubscribe = async () => {
    try {
      const response = await subscriptionsApi.unsubscribe();
      // Clear subscription state and nutritionist assignment so a cancelled
      // user sees no pre-assigned nutritionist on the Nutritionists page.
      updateUserState((prev) => ({
        ...prev,
        isSubscribed: response.isSubscribed,
        planName: response.plan,
        subscriptionStatus: response.status,
        subscriptionEndDate: response.endDate,
        subscriptionDaysRemaining: response.daysRemaining,
        managedBy: null,
        managedByUsername: null,
        nutritionistId: null,
      }));
      return response;
    } catch (error) {
      console.error('Unsubscribe failed:', error);
      throw error;
    }
  };

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await subscriptionsApi.getSubscription();
      // Update user state with subscription data from backend
      updateUserState((prev) => ({
        ...prev,
        isSubscribed: response.isSubscribed,
        planName: response.plan,
        subscriptionStatus: response.status,
        subscriptionEndDate: response.endDate,
        subscriptionDaysRemaining: response.daysRemaining,
      }));
      return response;
    } catch (error) {
      console.error('Failed to fetch subscription status:', error);
    }
  };

  // FIX: also patches localStorage so weight survives page refresh
  const updateWeight = (w) => {
    const parsed = parseFloat(w);
    setUser((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        stats: { ...(prev.stats || {}), currentWeight: parsed },
      };

      // Write the updated normalized user to localStorage immediately
      storage.setUser(next);

      return next;
    });
  };

  const recordScan = () => {
    updateUserState((prev) => ({
      ...prev,
      scansUsedToday: (prev.scansUsedToday || 0) + 1,
    }));
  };

  const refreshUser = async () => {
    try {
      const response = await fetch(
        `${window.location.protocol}//${window.location.hostname}:8000/api/v1/users/profile/me/`,
        {
          headers: {
            'Authorization': `Token ${normalizeToken(token)}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const userData = await response.json();
        let profileData = null;
        try {
          profileData = await profileApi.getProfile();
        } catch (profileError) {
          console.warn('Could not fetch profile stats on refresh:', profileError);
        }

        updateUserState({
          ...userData,
          managedBy: profileData?.managed_by ?? userData?.managed_by ?? null,
          managedByUsername: profileData?.managed_by_username ?? userData?.managed_by_username ?? null,
          nutritionistId: profileData?.nutritionist_id ?? userData?.nutritionist_id ?? null,
          ...(profileData
            ? {
                stats: {
                  currentWeight: profileData.current_weight_kg,
                  startWeight: profileData.start_weight_kg,
                  goalWeight: profileData.goal_weight_kg,
                  height: profileData.height_cm,
                },
                dailyCalorieGoal: profileData.daily_calorie_goal,
                proteinGoalG: profileData.protein_goal_g,
                carbsGoalG: profileData.carbs_goal_g,
                fatGoalG: profileData.fat_goal_g,
              }
            : {}),
        });
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  // ── Provider ───────────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        isAuthenticated,
        isSubscribed,
        login,
        logout,
        registerUser,
        completeHealthOnboarding,
        updateUserState,
        subscribe,
        unsubscribe,
        fetchSubscriptionStatus,
        updateWeight,
        recordScan,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}