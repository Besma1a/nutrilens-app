# NutriLens Backend Architecture Audit
**Date:** 2026-05-14  
**Scope:** Full backend (Django 4.2 + DRF) + frontend API surface audit  
**Auditor:** Senior Software Architect (automated deep audit)

---

## A. Current Architecture Overview

### Technology Stack

The backend is a **Django 4.2** REST API using **Django REST Framework 3.14**. The frontend is a **React + Vite** SPA communicating with the backend over HTTP via a centralized `src/services/api.js` module. Authentication uses **DRF Token Authentication** for all user-facing endpoints.

### Project Root Layout

```
WEBSITE_NutrI/
├── backend/            ← Django project root
│   ├── config/         ← Django project configuration (settings, URLs, ASGI, WSGI)
│   ├── users/          ← Custom user model, registration, login, email/password flows
│   ├── profiles/       ← UserProfile, weight, body measurements, diet plans, templates
│   ├── meals/          ← Meal logging, AI food detection service, food database
│   ├── consultations/  ← Nutritionist profiles, appointments, feedback
│   ├── subscriptions/  ← Subscription plans, user subscriptions
│   ├── notifications/  ← In-app notification system (signals + views)
│   ├── adminpanel/     ← Parallel admin system with its own auth, all admin operations
│   ├── blogs/          ← Nutritionist-authored blog articles
│   ├── dashboard/      ← Nutritionist dashboard aggregation views
│   └── manage.py
├── src/                ← React frontend
│   ├── services/api.js ← All API calls centralised here
│   ├── context/        ← AuthContext, etc.
│   └── pages/, components/
└── vite.config.js
```

### Django App Responsibilities

| App | Responsibility |
|---|---|
| `config` | Global Django settings, root URL routing, WSGI/ASGI entry points |
| `users` | `CustomUser` model (auth + health profile merged), registration, JWT-free token auth, email verification, password reset |
| `profiles` | `UserProfile` (nutritional goals, subscription info), `WeightEntry`, `BodyMeasurement`, `NutritionistFeedback`, `DietPlan`, `DietPlanTemplate`, `PlanAssignment` |
| `meals` | `Meal`, `FoodItem`, `MealFoodItem`; AI food detection service (mock); throttle for AI uploads |
| `consultations` | `Nutritionist` directory, `Consultation` appointment lifecycle, `ConsultationFeedback`, `NutritionistFeedback` (per-consultation) |
| `subscriptions` | `SubscriptionPlan` (admin-managed catalog), `Subscription` (user record) |
| `notifications` | `Notification` in-app alerts; Django signals connect domain events to notifications |
| `adminpanel` | Parallel admin system: `AdminAccount`, `SupportTicket`, `Transaction`, `Testimonial`, `NutritionistAdminProfile`, `AdminNotification`, `NewsletterSubscriber` |
| `blogs` | `Blog` model; nutritionist authors submit → admin moderates → publish |
| `dashboard` | Aggregation views for nutritionist dashboard (stats, weekly calories, activity feed) |

### Authentication Architecture

There are **two entirely separate authentication systems**:

**1. User / Nutritionist auth (DRF Token)**  
- `POST /api/v1/users/auth/login/` → returns `Token <key>`  
- All protected endpoints require `Authorization: Token <key>`  
- Token is stored in memory (`globalToken` in `api.js`), never persisted to localStorage  
- Token rotation on password change and logout  

**2. Admin auth (custom bcrypt + Django signing)**  
- `POST /api/admin/login` → returns a time-limited signed token (7-day TTL)  
- Bearer scheme: `Authorization: Bearer <signed_token>`  
- `AdminAuth` DRF permission class decodes the token and attaches `request.admin`  
- Completely separate from `CustomUser`; `AdminAccount` is its own model with a raw `password_hash` field  

### Middleware Stack (order is correct)

```
CorsMiddleware         ← first: handles preflight before Django processes anything
SecurityMiddleware
SessionMiddleware
CommonMiddleware
CsrfViewMiddleware
AuthenticationMiddleware
MessageMiddleware
XFrameOptionsMiddleware
```

`CorsMiddleware` is correctly placed first. `SessionMiddleware` is present even though the API uses token auth, which is harmless.

### How Frontend Communicates with Backend

`src/services/api.js` computes the base URL dynamically:

```js
const BASE_URL = `${protocol}//${host}:8000/api/v1`;
```

This hardcodes port `8000`, so it works for local development but requires a proxy or config change for production. The file exports named API objects (`mealsApi`, `profileApi`, `consultationsApi`, `subscriptionsApi`, `notificationsApi`, `patientsApi`, `adminApi`, etc.) that each wrap `fetch()` calls with token injection and error normalisation.

All API calls use `fetch`, not Axios. Multipart requests (image uploads) use a separate `requestMultipart()` helper that omits `Content-Type` so the browser can set the boundary correctly.

---

## B. Current Database Situation

### Active Configuration: PostgreSQL

`backend/config/settings.py` configures **PostgreSQL exclusively**:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='nutrilens_db'),
        'USER': config('DB_USER', default='postgres'),
        'PASSWORD': config('DB_PASSWORD', default=''),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}
```

There are **zero SQLite references in any Python source file**. The migration to PostgreSQL is complete at the code level.

### Orphaned SQLite Files

Two SQLite files exist on disk and are not referenced by any code:

| File | Size | Status |
|---|---|---|
| `backend/db.sqlite3` | 556 KB | Leftover from early development. Safe to delete. |
| `backend/media_and_db/db.sqlite3` | 556 KB | Duplicate of the above, older backup. Safe to delete. |

**Action required:** Delete both files. They are not used, but they contain real data from the development phase, which is a potential data hygiene and security issue (credentials or user data may be present).

### ORM and Query System

All database interactions go through **Django ORM**. There are no raw SQL queries, no alternative ORMs (SQLAlchemy, Tortoise, etc.), and no direct `psycopg2` calls anywhere in the application code.

### Migrations

All 9 Django apps have migration files:

| App | Migration count | Notes |
|---|---|---|
| `users` | 7 | Clean history |
| `profiles` | 19 | Many iterations; `DietPlanTemplate` went through moderation status, image, category changes |
| `meals` | 4 | `DailyNutritionSummary` model was created in `0001_initial` and deleted in `0002` — it no longer exists in `models.py` but its DB table was properly dropped by migration |
| `consultations` | 2 | Clean |
| `subscriptions` | 2 | `SubscriptionPlan` added in `0002` |
| `notifications` | 1 | Clean |
| `adminpanel` | 6 | `NewsletterSubscriber` added in `0006` |
| `blogs` | 5 | `category` field added and then removed in `0005` |
| `dashboard` | 0 | No models; migration `__init__.py` present |

The migration history is consistent with the current model definitions.

---

## C. Problems & Inconsistencies Found

### Critical (must fix before production)

**C-1. `SECRET_KEY` is insecure in `.env`**  
`SECRET_KEY=django-insecure-your-secret-key`. This default key must be replaced with a cryptographically random secret before any production deployment. The admin panel token signing uses this key directly.

**C-2. `DEBUG = True` is hardcoded**  
`settings.py` has `DEBUG = True` as a constant rather than reading from an environment variable. Django disables many security checks, serves full tracebacks to clients, and loads additional memory when `DEBUG` is `True`. This must be `config('DEBUG', default=False, cast=bool)`.

**C-3. `ALLOWED_HOSTS` contains a wildcard**  
`ALLOWED_HOSTS = ['127.0.0.1', 'localhost', '*']`. The `'*'` wildcard makes the `ALLOWED_HOSTS` check completely ineffective, allowing host header injection attacks in production.

**C-4. CORS allows all origins with credentials**  
`CORS_ALLOW_ALL_ORIGINS = True` combined with `CORS_ALLOW_CREDENTIALS = True` means any website can make credentialed cross-origin requests to the API. The settings file itself contains a comment describing the fix, but it has not been applied.

**C-5. Three frontend meal-editing API calls have no backend implementation**  
The following methods exist in `src/services/api.js` but have **no corresponding `@action` in `MealViewSet`**:

| Frontend call | Target URL | Backend status |
|---|---|---|
| `mealsApi.addFood(mealId, ...)` | `POST /api/v1/meals/{id}/add-food/` | **Not implemented** |
| `mealsApi.editFood(mealId, pk, ...)` | `PATCH /api/v1/meals/{id}/food-items/{pk}/edit/` | **Not implemented** |
| `mealsApi.removeFood(mealId, pk)` | `DELETE /api/v1/meals/{id}/food-items/{pk}/remove/` | **Not implemented** |

Any frontend page that calls these methods will receive a `404` response. If food editing UI exists, it is silently broken.

### High (fix before shipping any feature that touches these paths)

**C-6. Free-plan AI scan limit uses the wrong filter**  
In `meals/services.py`, the per-day free scan counter is:
```python
Meal.objects.filter(user=user, logged_at__date=today, ai_confidence_score__isnull=False)
```
The `ai_confidence_score` field defaults to `0`, not `None`. Every meal (including manually entered ones with no AI processing) will have `ai_confidence_score=0`, which satisfies `__isnull=False`. This means the free-plan limit is counted against *all* meals logged today, not only AI-scanned ones. The correct filter is `ai_confidence_score__gt=0` or `image__isnull=False`.

**C-7. `NutritionistFeedback` model is defined twice under the same name**  
`consultations/models.py` has `consultations.NutritionistFeedback` (OneToOne to a Consultation). `profiles/models.py` also has `profiles.NutritionistFeedback` (standalone FKs to user and nutritionist). They serve different purposes but share a class name, causing confusion in imports, serializers, admin, and signals.

Additionally, `profiles/feedback.py` contains a **third copy** of `NutritionistFeedback` that is never imported by any `urls.py`, `views.py`, or migration. It is pure dead code from a refactor attempt.

**C-8. `profiles/feedback.py` is completely dead code**  
The file defines a model class that duplicates `profiles.NutritionistFeedback`. It has no migrations, is not in `INSTALLED_APPS`, and is not referenced anywhere. It should be deleted.

**C-9. Notification actor is always `None` in `NutritionistConsultationViewSet.approve()`**  
```python
nutritionist_user = getattr(consultation.nutritionist, 'user', None)
```
`consultation.nutritionist` is a `Nutritionist` model instance. `Nutritionist` has no `.user` attribute. The link between a `Nutritionist` and its `CustomUser` goes through `NutritionistAdminProfile.linked_user`. This means `nutritionist_user` is always `None`, so the notification's actor field is always `None`. The notification is still created but with no actor, which may affect frontend display.

**C-10. Duplicate URL registrations for dashboard and blogs**  
`config/urls.py` registers the same view module twice for two different prefixes:
```python
path("api/dashboard/",    include("dashboard.urls")),
path("api/v1/dashboard/", include("dashboard.urls")),   # duplicate
path("api/blogs/",        include("blogs.urls")),
path("api/v1/blogs/",     include("blogs.urls")),        # duplicate
```
Django will resolve both, creating six extra named URL patterns with a `1` suffix appended (Django's conflict resolution). The frontend uses only `/api/v1/` paths. The `/api/dashboard/` and `/api/blogs/` prefixes are leftover from before the `v1` convention was adopted. They should be removed.

**C-11. `PlanAssignment` endpoint breaks the versioning convention**  
`path("api/plan-assignments/<str:assignment_id>/", PlanAssignmentPatchView.as_view())` is mounted at `/api/plan-assignments/`, not `/api/v1/plan-assignments/`. The frontend `planAssignmentsApi.patch()` correctly targets `/api/plan-assignments/`, so the feature works, but the inconsistency will cause confusion when someone tries to find this endpoint in the versioned API tree.

**C-12. Duplicate `NutritionistPatientsView` route**  
Both `path('api/patients/', NutritionistPatientsView.as_view())` in `config/urls.py` and `path('patients/', NutritionistPatientsView.as_view())` inside `profiles/urls.py` (mounted at `api/v1/profiles/`) exist simultaneously. This means the view is accessible at both `/api/patients/` and `/api/v1/profiles/patients/`. The frontend `patientsApi.getManagedPatients()` uses `/api/v1/profiles/patients/`, making the `/api/patients/` registration redundant.

### Medium (technical debt and quality issues)

**C-13. `Celery` and `Redis` are in `requirements.txt` but are not configured**  
`celery==5.3.4` and `redis==5.0.1` are listed as dependencies. There is no `celery.py` app configuration, no `tasks.py` in any app, and no `CELERY_*` settings. These packages are unused at runtime. The `MealProcessingService` has comments indicating Celery is a planned future migration path, which is the right design, but the packages should not be declared as production requirements until they are actually configured and used.

**C-14. `whitenoise` is in `requirements.txt` but not wired in middleware**  
`whitenoise==6.6.0` is listed but `django.middleware.security.SecurityMiddleware` is not followed by `whitenoise.middleware.WhiteNoiseMiddleware`, and `WHITENOISE_MANIFEST_STRICT` is not set. Static files will not be served by WhiteNoise in production; `collectstatic` output will be unreachable.

**C-15. `UserProfileViewSet` in `profiles/views.py` is dead code**  
A fully implemented `UserProfileViewSet` class (lines 141–168 of `profiles/views.py`) exists with `profile` and `update_profile` actions, but it is never registered in `profiles/urls.py` or `config/urls.py`. The equivalent functionality is exposed through `CurrentUserProfileView`. This class should be removed.

**C-16. `FoodItem` has both a direct `meal` FK and a junction table `MealFoodItem`**  
`FoodItem.meal` is a direct FK to `Meal` (nullable). `MealFoodItem` is a separate junction table linking `Meal` to `FoodItem` with additional fields (quantity, unit, nutritional totals, flags). The `MealProcessingService` writes to `MealFoodItem` exclusively, and `MealSerializer` reads from `food_items` (the reverse FK name on `FoodItem`). This creates two redundant relationships. The `FoodItem.meal` field is never written to by any service or view, making it dead schema.

**C-17. Mock revenue functions are dead code in `adminpanel/views.py`**  
`_build_mock_revenue_payload()` (lines 74–100) and `_build_mock_transactions()` (lines 103–131) build fake revenue and transaction data. Neither function is called by any view. The active `AdminRevenueStatsView` and `AdminTransactionsView` read real data from `Transaction` and `Subscription`. These functions are leftover from before the real data layer was implemented.

**C-18. Test files are scattered in the backend root**  
`test_admin_login_variants.py`, `test_admin_password.py`, `test_complete_flow.py`, and `test_login_endpoint.py` sit at the root of `backend/`. These are ad-hoc script-style tests, not `unittest`/`pytest` test cases. They do not appear to be part of the Django test runner. They should either be converted to proper Django test cases inside each app's `tests.py` or removed entirely.

**C-19. `data.json` and `media_and_db/` in the backend**  
`backend/data.json` (likely a Django fixture dump) and `backend/media_and_db/` (a copy of media files and the SQLite database) are leftover development artifacts. They should be removed and, if the fixture data is needed, stored as a proper `fixtures/` directory inside the relevant app.

**C-20. `Notification` signal references `consultation.patient` which does not exist**  
In `notifications/signals.py` line 144:
```python
patient = getattr(instance, "patient", None) or getattr(instance, "user", None)
```
`Consultation` has a `user` FK, not a `patient` FK. `getattr(instance, "patient", None)` always returns `None`. The fallback `getattr(instance, "user", None)` works correctly, but the first `getattr` is meaningless noise.

### Low (code quality and minor inconsistencies)

**C-21. `UserPreferences.is_premium` diverges from `CustomUser.plan`**  
Subscription state is tracked in three places: `CustomUser.plan` (a CharField), `UserPreferences.is_premium` (a Boolean), and `Subscription.status` (the authoritative record). `build_user_payload()` in `users/views.py` reads `is_subscribed` from `prefs.is_premium` but neither `subscribe` nor `unsubscribe` in `subscriptions/views.py` update `UserPreferences`. This means the `is_subscribed` field in the login/register payload may be stale.

**C-22. `AdminAccount` bypasses Django's password infrastructure**  
`AdminAccount.password_hash` stores a raw bcrypt hash. Django's password validation, `PBKDF2` hashing, and `set_password`/`check_password` methods are not used. This is not incorrect, but it creates a parallel security surface that receives no benefit from future Django security improvements to the password system.

**C-23. `Subscription.save()` has a fragile `end_date` fallback**  
The `save()` override only auto-calculates `end_date` when `not self.pk and not self.end_date`. Since `end_date` is a non-nullable `DateTimeField`, creating a `Subscription` without setting `end_date` will cause a database-level `NOT NULL` constraint violation before `save()` even executes the auto-calculation block. The fallback is effectively unreachable for direct model instantiation and creates a false impression of safety.

---

## D. Feature / Data Flow Analysis

### D-1. User Registration Flow

```
Frontend RegisterPage.jsx
  → POST /api/v1/users/register/register/
    UserRegistrationViewSet.register()
      → UserRegistrationSerializer.save() → CustomUser created
      → Token.objects.get_or_create()
      → EmailVerificationToken created
      → send_verification_email() (SMTP or console fallback)
      → post_save signal fires → profiles.signals.create_user_profile()
         → UserProfile.objects.get_or_create(user=instance)
      → Returns { token, user: build_user_payload() }
Frontend stores token in memory (AuthContext)
```

**Validation:** `UserRegistrationSerializer` validates email uniqueness, password confirmation, minimum length.  
**Persistence:** `CustomUser`, `Token`, `EmailVerificationToken`, `UserProfile` (via signal) created atomically within the same request–response cycle.  
**Error path:** Duplicate email → 400 with DRF validation error. Email send failure is swallowed and printed to console.

---

### D-2. AI Meal Scan Flow

```
Frontend mealsApi.create()
  → POST /api/v1/meals/ (multipart: image + meal_type)
    MealViewSet.perform_create()
      → Meal saved to DB (image stored in backend/media/meals/)
      → If meal.image: MealProcessingService().process_meal_image(meal)
          → Check free plan scan limit (BUG: counts all meals, not just AI-scanned ones)
          → FoodDetectionService.detect(meal.image)
              → _validate_image() (type + size check)
              → _run_inference() → MOCK: picks 1–3 items from hardcoded database
              → _parse_raw_output() → list[DetectedFoodDTO]
              → _apply_confidence_filter() (threshold 0.50)
          → If success:
              → _persist_food_items(): FoodItem.get_or_create + MealFoodItem.update_or_create
              → _update_meal_totals(): Meal.total_calories + ai_confidence_score saved
      → Returns MealSerializer(meal).data
```

**Validation:** Image MIME type and size (10 MB max) checked in service layer, not serializer.  
**Persistence:** `Meal`, `FoodItem`, `MealFoodItem` written. `Meal.total_calories` is a denormalised sum updated in-place.  
**Error path:** Detection failure is logged and returns a result with `success=False`. The meal record is still saved even if detection fails, but with `total_calories=0` and no food items.  
**Note:** The AI model is a deterministic mock. Real YOLOv8 or Vision API integration requires replacing `FoodDetectionService._run_inference()` only; the rest of the pipeline is model-agnostic.

---

### D-3. Nutritionist Assigns Diet Plan

```
Frontend (nutritionist panel) patientsApi.assignDietPlan()
  → POST /api/v1/profiles/diet-plans/ { user: patient_id, title, plan_type, ... }
    DietPlanViewSet.perform_create()
      → Checks is_nutritionist flag
      → transaction.atomic():
          → DietPlan saved (assigned_by=nutritionist)
          → DietPlan.objects.filter(user=patient, is_active=True).exclude(pk=plan.pk).update(is_active=False)
          → _sync_profile_targets_from_active_diet_plan(plan):
              → UserProfile.daily_calorie_goal, protein_goal_g, etc. updated
              → goal_setting_mode set to "manual"
      → post_save signal fires → notifications.signals.notify_plan_assigned()
          → Notification created for patient user
```

**Validation:** `DietPlanSerializer` validates `user` field (patient ID). Access control checked in `perform_create`.  
**Persistence:** `DietPlan` created, previous active plan deactivated, `UserProfile` macro targets synced, `Notification` created. All in one transaction (except the notification).  
**Error path:** `PermissionError` raised if caller is not a nutritionist. No rollback needed for the notification since it is fire-and-forget outside the transaction.

---

### D-4. Subscription Flow

```
Frontend subscriptionsApi.subscribe({ planId })
  → POST /api/v1/subscriptions/subscribe/
    SubscriptionViewSet.subscribe()
      → SubscribeRequestSerializer validates plan name or planId
      → SubscriptionPlan fetched from DB
      → end_date = now + plan.duration_days
      → Subscription.objects.update_or_create(user=user, defaults={...})
      → If re-subscription: UserProfile.managed_by cleared
      → Transaction.objects.create(user, subscription, plan, amount, status="Paid")
      → Returns SubscriptionResponseSerializer(subscription).data
```

**Note:** There is no payment gateway integration. `Transaction` rows are created with `status="Paid"` and `method="Direct"` immediately, with no actual payment processing. The subscription system is a placeholder that records intent, not a real billing implementation.

---

### D-5. Weight Tracking with Automatic Goal Recalculation

```
Frontend profileApi.logWeight({ date, weight_kg })
  → POST /api/v1/profiles/weight/
    WeightEntryViewSet.perform_create()
      → WeightEntry saved
      → post_save signal fires → profiles.signals.sync_current_weight_on_save()
          → UserProfile.current_weight_kg = latest entry weight
          → If no start_weight_kg: UserProfile.start_weight_kg = earliest entry weight
          → If profile.goal_setting_mode == 'auto':
              → calculate_bmr() → calculate_tdee() → calculate_daily_calorie_goal()
              → calculate_macro_goals()
              → UserProfile.daily_calorie_goal, protein_goal_g, etc. updated
      → post_save signal fires → notifications.signals.notify_nutritionist_weigh_in()
          → If profile.managed_by: Notification created for nutritionist
```

**Validation:** `WeightEntrySerializer` enforces `unique_together = ['user', 'date']` — one entry per day.  
**Persistence:** `WeightEntry` saved, `UserProfile` updated synchronously in the same request via signal.

---

## E. Backend Completeness Audit

### What Works Correctly

- Full user registration, email verification, login, logout, password reset, profile update pipeline
- DRF Token authentication properly enforced across all protected endpoints
- Meal logging (manual and AI-scan), history, daily summary, food search
- Nutritionist directory, consultation booking, approval/rejection, cancel flows
- Diet plan assignment, template catalog, moderation workflow
- Nutritionist feedback (both per-consultation and standalone notes)
- Weight and body measurement tracking with auto-goal calculation
- Notification creation via Django signals for all major domain events
- Admin panel: user management, nutritionist management, content moderation, support tickets, testimonials, newsletter, revenue stats
- Subscription create/cancel/status flows
- Blog CRUD with moderation
- Public endpoints: stats, testimonials, support ticket creation, newsletter subscription

### What Is Fragile

- **Subscription state consistency**: `UserPreferences.is_premium`, `CustomUser.plan`, and `Subscription.status` can diverge. There is no single source of truth enforced at the application layer.
- **Free-plan scan limiting**: The scan counter is broken (see C-6). Free users can currently scan unlimited meals.
- **Notification actor for consultation approval**: Notification is created but actor is always `None` (see C-9).
- **Admin session security**: The admin token has no revocation mechanism. A compromised admin token is valid for its full 7-day TTL.
- **`Subscription.save()` end_date guard**: Fragile fallback that is effectively unreachable (see C-23).

### What Is Incomplete

- **Food editing for existing meals**: `mealsApi.addFood`, `mealsApi.editFood`, `mealsApi.removeFood` in the frontend have no backend implementation (see C-5). Any UI that exposes these calls is non-functional.
- **Real payment processing**: The subscription system records "paid" transactions immediately without any payment gateway. Stripe or any other processor needs to be integrated.
- **Real AI food detection**: `FoodDetectionService._run_inference()` is a deterministic mock that selects random items from a 10-item hardcoded database. The production model (YOLOv8, VLCL, or a Vision API) has not been integrated yet.
- **Celery task queue**: Declared as a dependency but not configured. Long-running tasks (AI inference, bulk notifications) run synchronously in the request thread, which will block under load.
- **Email in production**: Email is configured to fall back to the console backend if credentials are absent. Production deployments require a real SMTP provider or transactional email service.

### What Must Be Fixed Urgently

1. Replace `SECRET_KEY` with a cryptographically secure random value  
2. Set `DEBUG = False` via environment variable  
3. Lock down `ALLOWED_HOSTS` to actual production hostname(s)  
4. Lock down `CORS_ALLOWED_ORIGINS` to the actual frontend origin  
5. Fix the AI scan free-plan counter filter  
6. Implement or remove the three broken meal-food editing endpoints  

---

## F. Refactoring & Cleanup Plan

### Priority 1 — Security (before any public deployment)

1. Move `DEBUG`, `ALLOWED_HOSTS`, and `CORS_ALLOWED_ORIGINS` to environment variables with safe production defaults.  
2. Regenerate `SECRET_KEY` and rotate all existing admin tokens and user auth tokens.  
3. Add rate limiting to the admin login endpoint (`AdminLoginView`) — the current implementation has no brute-force protection.

### Priority 2 — Data integrity (fix silently broken behaviour)

4. Fix `ai_confidence_score__isnull=False` → `ai_confidence_score__gt=0` in `meals/services.py`.  
5. Fix the notification actor resolution in `consultations/views.py` `approve()` — look up `linked_user` via `NutritionistAdminProfile`.  
6. Synchronize subscription state: implement a `refresh_user_subscription_state(user)` utility that sets `UserPreferences.is_premium` and `CustomUser.plan` from `Subscription` after any subscribe/unsubscribe event.

### Priority 3 — Dead code removal

7. Delete `profiles/feedback.py`  
8. Delete `backend/db.sqlite3`, `backend/media_and_db/`, `backend/data.json`  
9. Remove `_build_mock_revenue_payload()` and `_build_mock_transactions()` from `adminpanel/views.py`  
10. Remove `UserProfileViewSet` from `profiles/views.py`  
11. Remove the redundant `/api/dashboard/` and `/api/blogs/` URL registrations from `config/urls.py`  
12. Remove the redundant `path('api/patients/', ...)` from `config/urls.py` (keep the one inside `profiles/urls.py`)  
13. Remove `getattr(instance, "patient", None)` dead branch from `notifications/signals.py`  
14. Move `test_*.py` files from the backend root into proper `tests/` directories

### Priority 4 — Schema cleanup

15. Remove `FoodItem.meal` FK field (it is never written) and keep only the `MealFoodItem` junction table as the canonical relationship. Create a migration to drop the column.  
16. Rename either `consultations.NutritionistFeedback` or `profiles.NutritionistFeedback` to eliminate the naming collision. Suggested names: `ConsultationNote` (consultations app) and `PatientProgressNote` or keep `NutritionistFeedback` (profiles app).

### Priority 5 — Architecture improvements

17. Configure WhiteNoise properly in `MIDDLEWARE` for serving static files in production.  
18. Move `PlanAssignment` endpoint to `/api/v1/plan-assignments/` and update `api.js` accordingly.  
19. Implement the three missing meal-food editing endpoints (`add-food`, `edit food-item`, `remove food-item`) on `MealViewSet`.  
20. Configure Celery and move `MealProcessingService.process_meal_image()` to a Celery task so AI inference does not block the HTTP request thread.  
21. Add `select_related` and `prefetch_related` to views that currently trigger N+1 queries (notably `AdminUsersView`, `AdminNutritionistsView`, `AdminTicketsView`).

---

## G. Recommended Final Architecture

### Folder Structure (proposed)

```
backend/
├── config/
│   ├── settings/
│   │   ├── base.py          ← shared settings
│   │   ├── development.py   ← DEBUG=True, SQLite or local PG
│   │   └── production.py    ← DEBUG=False, whitenoise, production CORS
│   ├── urls.py              ← versioned routes only (/api/v1/)
│   ├── asgi.py
│   └── wsgi.py
├── users/                   ← no change to responsibility; remove UserPreferences.is_premium
├── profiles/
│   ├── models.py            ← keep; rename NutritionistFeedback → PatientProgressNote
│   ├── views.py             ← remove dead UserProfileViewSet
│   ├── feedback.py          ← DELETE
│   └── ...
├── meals/
│   ├── models.py            ← remove FoodItem.meal FK
│   ├── services.py          ← fix scan counter; keep service layer design
│   ├── tasks.py             ← NEW: Celery task wrapping MealProcessingService
│   └── ...
├── consultations/
│   ├── models.py            ← rename NutritionistFeedback → ConsultationNote
│   └── ...
├── subscriptions/
│   ├── models.py
│   └── utils.py             ← NEW: refresh_user_subscription_state()
├── notifications/           ← no structural change
├── adminpanel/
│   ├── views.py             ← remove dead mock functions
│   └── ...
├── blogs/                   ← no change
├── dashboard/               ← no change
├── celery.py                ← NEW: Celery app config
└── requirements/
    ├── base.txt             ← psycopg2, DRF, etc.
    ├── development.txt      ← debug tools
    └── production.txt       ← gunicorn, whitenoise, celery, redis
```

### URL versioning (cleaned up `config/urls.py`)

```python
urlpatterns = [
    path("admin/",              admin.site.urls),
    path("api/v1/users/",       include("users.urls")),
    path("api/v1/meals/",       include("meals.urls")),
    path("api/v1/consultations/", include("consultations.urls")),
    path("api/v1/profiles/",    include("profiles.urls")),
    path("api/v1/subscriptions/", include("subscriptions.urls")),
    path("api/v1/notifications/", include("notifications.urls")),
    path("api/v1/dashboard/",   include("dashboard.urls")),
    path("api/v1/blogs/",       include("blogs.urls")),
    path("api/v1/plan-assignments/<str:assignment_id>/", PlanAssignmentPatchView.as_view()),
    path("api/v1/testimonials/", PublicTestimonialsView.as_view()),
    path("api/v1/support/tickets/", PublicSupportTicketCreateView.as_view()),
    path("api/v1/newsletter/subscribe/", NewsletterSubscribeView.as_view()),
    path("api/admin/",          include("adminpanel.urls")),
    path("api/v1/auth/token/",  authtoken_views.obtain_auth_token),
]
```

All double-mounted prefixes removed. All plan-assignment and patient routes moved under `/api/v1/`.

---

## H. UML / Class Diagram Corrections

### Current Entity Map and Relationships

```
CustomUser (users)
  ├── OneToOne → UserProfile (profiles)
  ├── OneToOne → UserPreferences (users)
  ├── OneToOne → Subscription (subscriptions)
  ├── FK ← Meal [user] (meals)
  ├── FK ← Consultation [user] (consultations)
  ├── FK ← WeightEntry [user] (profiles)
  ├── FK ← BodyMeasurement [user] (profiles)
  ├── FK ← NutritionistFeedback [user, nutritionist] (profiles)  ← patient and sender
  ├── FK ← DietPlan [user, assigned_by] (profiles)
  ├── FK ← DietPlanTemplate [created_by] (profiles)
  ├── FK ← Blog [author] (blogs)
  ├── FK ← Notification [recipient, actor] (notifications)
  └── FK ← EmailVerificationToken / PasswordResetToken (users)

UserProfile (profiles)
  ├── PK = user (OneToOne with CustomUser)
  ├── FK → CustomUser [managed_by]  ← the nutritionist user managing this patient
  └── computed: bmi, subscription_is_active, scans_used_today

Nutritionist (consultations)           ← NOT linked by FK to CustomUser
  ├── email matches CustomUser.email   ← lookup by email only (fragile)
  ├── OneToOne → NutritionistAdminProfile [nutritionist] (adminpanel)
  └── FK ← Consultation [nutritionist]

NutritionistAdminProfile (adminpanel)
  ├── OneToOne → Nutritionist
  └── FK → CustomUser [linked_user]   ← the CustomUser that "is" this nutritionist

Meal (meals)
  ├── FK → CustomUser [user]
  └── reverse FK ← FoodItem [meal]    ← DEAD (never written); should be removed
      reverse FK ← MealFoodItem [meal]  ← canonical relationship

FoodItem (meals)
  ├── FK → Meal [meal]               ← DEAD column, remove
  └── reverse FK ← MealFoodItem [food_item]

MealFoodItem (meals)
  ├── FK → Meal
  └── FK → FoodItem

Consultation (consultations)
  ├── FK → CustomUser [user]
  ├── FK → Nutritionist [nutritionist]
  ├── OneToOne ← NutritionistFeedback (consultations)  ← rename to ConsultationNote
  └── OneToOne ← ConsultationFeedback [consultation]

DietPlan (profiles)
  ├── FK → CustomUser [user]       ← patient
  ├── FK → CustomUser [assigned_by] ← nutritionist
  └── reverse FK ← PlanAssignment [diet_plan]

DietPlanTemplate (profiles)
  └── FK → CustomUser [created_by]  ← optional, null = system template

Subscription (subscriptions)
  ├── OneToOne → CustomUser [user]
  └── FK → SubscriptionPlan [subscription_plan]

Transaction (adminpanel)
  ├── FK → CustomUser [user]
  └── FK → Subscription [subscription]

AdminAccount (adminpanel)          ← completely separate from CustomUser
  └── reverse FK ← AdminNotification [recipient]

SupportTicket (adminpanel)
  ├── FK → CustomUser [user]  (nullable)
  └── reverse FK ← SupportTicketMessage [ticket]

Testimonial (adminpanel)
  └── FK → CustomUser [user] (nullable)

Notification (notifications)
  ├── FK → CustomUser [recipient]
  └── FK → CustomUser [actor] (nullable)

Blog (blogs)
  └── FK → CustomUser [author]

WeightEntry (profiles)
  └── FK → CustomUser [user]
      unique_together: [user, date]

BodyMeasurement (profiles)
  └── FK → CustomUser [user]

NutritionistFeedback (profiles)    ← rename to PatientProgressNote
  ├── FK → CustomUser [user]       ← patient receiving the note
  └── FK → CustomUser [nutritionist] ← nutritionist sending the note
```

### Key Corrections for Your UML Diagram

**Relationships to add:**
- `NutritionistAdminProfile` is the bridge between `Nutritionist` and `CustomUser`. Add it as an associative entity between the two.
- `PlanAssignment` is a child of `DietPlan` (one-to-many).
- `MealFoodItem` is a proper junction/association class between `Meal` and `FoodItem` (not a simple FK).
- `Transaction` has a FK to both `CustomUser` and `Subscription`.

**Relationships to remove:**
- Remove `FoodItem → Meal` direct FK from the diagram (dead column).
- Remove any diagram reference to `profiles/feedback.py` (dead file).

**Naming corrections:**
- `consultations.NutritionistFeedback` → rename to `ConsultationNote` in diagram and code.
- `profiles.NutritionistFeedback` → rename to `PatientProgressNote` in diagram and code.

**Design notes for the diagram:**
- `Nutritionist` and `CustomUser` are **not** directly linked by a FK. The lookup goes through email matching or through `NutritionistAdminProfile.linked_user`. This should be shown as a dashed association (non-FK relationship), not a solid FK arrow.
- `AdminAccount` is a completely separate entity hierarchy. It does not extend `CustomUser`. Show it in its own bounded region in the diagram.
- `DietPlanTemplate` and `DietPlan` are distinct entities. `DietPlanTemplate` is a reusable library object; `DietPlan` is a patient-specific assignment. Do not conflate them.
- `UserProfile` uses `user` as its **primary key** (not a separate `id`). This is a OneToOne with `primary_key=True`.

---

*End of audit. Total issues found: 23. Critical: 5. High: 7. Medium: 7. Low: 4.*
