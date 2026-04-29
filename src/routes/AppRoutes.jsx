import { lazy, Suspense, useEffect, useLayoutEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // ✅ ADDED

import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import EmailVerification from "../pages/auth/Emailverification";
import PasswordResetRequest from "../pages/auth/PasswordResetRequest";
import PasswordResetConfirm from "../pages/auth/PasswordResetConfirm";
import HealthSetupPage from "../pages/auth/HealthSetupPage";

// --- Public landing ---
import PublicHome from "../pages/public/Home";
import Blog from "../pages/public/blog/Blog";
import Article from "../pages/public/blog/Article";
import DietPlans from "../pages/public/diet-plans/DietPlans";
import DietPlanDetail from "../pages/public/diet-plans/DietPlanDetail";
import Nutritionists from "../pages/public/Nutritionists";
import PublicTestimonialsPage from "../pages/public/TestimonialsPage";
import SupportTicketPage from "../pages/public/SupportTicketPage";
import AboutPage from "../pages/public/AboutPage";
import PlansPage from "../pages/public/PlansPage";

// --- Nutritionist ---
import NutritionistLayout from "../components/layout/NutritionistSidebar";
import Dashboard from "../pages/nutritionist/Dashboard";
import Clients from "../pages/nutritionist/Clients";
import CreatePlan from "../pages/nutritionist/CreatePlan";
import AssignPlan from "../pages/nutritionist/AssignPlan";
import Calendar from "../pages/nutritionist/Calendar";
import Progress from "../pages/nutritionist/Progress";
import Adjustments from "../pages/nutritionist/Adjustments";
import Profile from "../pages/nutritionist/Profile";
import Notifications from "../pages/nutritionist/Notifications";
import NutritionistBlog from "../pages/nutritionist/Blogs";

// --- User ---
import UserLayout from "../components/layout/UserLayout";
import SubscriptionGuard from "../components/subscription/SubscriptionGuard";

const UserDashboard    = lazy(() => import("../pages/user/Dashboard"));
const UserTracker      = lazy(() => import("../pages/user/Tracker"));
const UserProfile      = lazy(() => import("../pages/user/Profile"));
const UserMealPlan     = lazy(() => import("../pages/user/MealPlan"));
const UserConsultation = lazy(() => import("../pages/user/Consultation"));
const UserSubscribe    = lazy(() => import("../pages/user/Subscribe"));
const UserSelectNutritionist = lazy(() => import("../pages/user/SelectNutritionist"));
const UserProgress     = lazy(() => import("../pages/user/Progress"));
const UserNotifications = lazy(() => import("../pages/user/Notifications"));

// --- Admin ---
import AdminDashboard     from "../pages/admin/AdminDashboard";
import DashboardOverview  from "../pages/admin/DashboardOverview";
import UsersPage          from "../pages/admin/UsersPage";
import NutritionistsPage  from "../pages/admin/NutritionistsPage";
import SubscriptionsPage  from "../pages/admin/SubscriptionsPage";
import ContentPage        from "../pages/admin/ContentPage";
import SupportPage        from "../pages/admin/SupportPage";
import RevenuePage        from "../pages/admin/RevenuePage";
import TestimonialsPage   from "../pages/admin/TestimonialsPage";

// Loader
const PageLoader = () => (
  <div
    style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f0fdf4",
      fontSize: 15,
      color: "#22c55e",
    }}
  >
    Loading…
  </div>
);

// Disable browser scroll restoration before React renders anything
if (typeof window !== 'undefined') {
  window.history.scrollRestoration = 'manual';
}

function ScrollToTop() {
  const { pathname, state } = useLocation();
  useLayoutEffect(() => {
    if (!state?.scrollTo) {
      const root = document.getElementById('root');
      if (root) root.scrollTop = 0;
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [pathname]);
  return null;
}

export default function AppRoutes() {
  // ✅ AUTH STATE
  const { isAuthenticated, loading, user } = useAuth();
  const isNutritionist = user?.isNutritionist ?? false;

  // ✅ BLOCK APP UNTIL AUTH IS READY (FIX FOR REFRESH BUG)
  if (loading) {
    return <PageLoader />;
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* ── AUTH ──────────────────────────────────── */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<EmailVerification />} />
          <Route path="/health-setup" element={<HealthSetupPage />} />
          <Route path="/onboarding" element={<Navigate to="/health-setup" replace />} />
          <Route path="/password-reset/confirm" element={<PasswordResetConfirm />} />
          <Route path="/password-reset" element={<PasswordResetRequest />} />

          {/* ── ADMIN ─────────────────────────────────── */}
          <Route path="/admin" element={<AdminDashboard />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardOverview />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="nutritionists" element={<NutritionistsPage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
            <Route path="content" element={<ContentPage />} />
            <Route path="support" element={<SupportPage />} />
            <Route path="revenue" element={<RevenuePage />} />
            <Route path="testimonials" element={<TestimonialsPage />} />
          </Route>

          {/* ── NUTRITIONIST ─────────────────────────── */}
          <Route
            path="/nutritionist"
            element={
              isAuthenticated && isNutritionist ? (
                <NutritionistLayout />
              ) : isAuthenticated && !isNutritionist ? (
                <Navigate to="/user/dashboard" replace />
              ) : (
                <Navigate to="/" replace />
              )
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="clients" element={<Clients />} />
            <Route path="create-plan" element={<CreatePlan />} />
            <Route path="assign-plan" element={<AssignPlan />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="progress" element={<Progress />} />
            <Route path="adjustments" element={<Adjustments />} />
            <Route path="profile" element={<Profile />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="blogs" element={<NutritionistBlog />} />
          </Route>

          {/* ── USER (FIXED PROTECTION) ───────────────── */}
          <Route
            path="/user"
            element={
              isAuthenticated && !isNutritionist ? (
                <UserLayout />
              ) : isAuthenticated && isNutritionist ? (
                <Navigate to="/nutritionist/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<UserDashboard />} />
            <Route path="tracker" element={<UserTracker />} />
            <Route path="profile" element={<UserProfile />} />
            <Route path="subscribe" element={<UserSubscribe />} />
            <Route path="select-nutritionist" element={<UserSelectNutritionist />} />
            <Route path="progress" element={<UserProgress />} />
            <Route path="notifications" element={<UserNotifications />} />

<Route
              path="meal-plan"
              element={
                <SubscriptionGuard title="Meal Plans are Premium">
                  <UserMealPlan />
                </SubscriptionGuard>
              }
            />

            <Route
              path="consultation"
              element={
                <SubscriptionGuard title="Consultations are Premium">
                  <UserConsultation />
                </SubscriptionGuard>
              }
            />
          </Route>

          {/* ── PUBLIC ────────────────────────────────── */}
          <Route path="/" element={<PublicHome />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:id" element={<Article />} />
          <Route path="/diet" element={<DietPlans />} />
          <Route path="/diet/:id" element={<DietPlanDetail />} />
          <Route path="/nutritionists" element={<Nutritionists />} />
          <Route path="/testimonials" element={<PublicTestimonialsPage />} />
          <Route path="/support" element={<SupportTicketPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/plans" element={<PlansPage />} />

          {/* ── FALLBACK ──────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}