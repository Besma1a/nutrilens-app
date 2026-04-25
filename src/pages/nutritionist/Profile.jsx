/**
 * Profile.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * BACKEND INTEGRATION GUIDE
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Replace every function inside the `/* ── API LAYER ── *\/` block below.
 *    Each function signature is stable — only swap the body.
 * 2. Pass your auth token via the AUTH_TOKEN constant or a context/hook.
 * 3. The component is fully controlled — all state lives in hooks, nothing
 *    is hard-coded in JSX.
 * 4. Mock delays are clearly marked with `// [MOCK]` — remove them in prod.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Save, User, Settings, Lock,
  Plus, Eye, EyeOff, Loader2, Camera
} from "lucide-react";
import { currentUser } from "../../data/mockData";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG — swap BASE_URL and AUTH_TOKEN for your real values
// ─────────────────────────────────────────────────────────────────────────────
const BASE_URL   = "/api/nutritionist";   // TODO: set your API base URL
const AUTH_TOKEN = null;                  // TODO: pull from AuthContext / localStorage


// ─────────────────────────────────────────────────────────────────────────────
// API LAYER — replace each body with a real fetch() call
// ─────────────────────────────────────────────────────────────────────────────

/** @param {object} data – { firstName, lastName, email, phone, specialization, licenseNumber, clinic, languages, bio } */
async function apiUpdateProfile() {
  // [REAL] uncomment ↓
  // const res = await fetch(`${BASE_URL}/profile`, {
  //   method: "PUT", headers: headers(), body: JSON.stringify(data)
  // });
  // if (!res.ok) throw new Error((await res.json()).message ?? res.statusText);
  // return res.json();

  await delay(800); // [MOCK] remove in production
  return { success: true };
}

async function apiUpdatePassword() {
  // [REAL] uncomment ↓
  // const res = await fetch(`${BASE_URL}/password`, {
  //   method: "PUT", headers: headers(), body: JSON.stringify(data)
  // });
  // if (!res.ok) throw new Error((await res.json()).message ?? res.statusText);
  // return res.json();

  await delay(800); // [MOCK]
  return { success: true };
}

/** @param {{ language: string, timezone: string, dateFormat: string, calorieUnit: string, workingHours: object }} data */
async function apiUpdatePreferences() {
  // [REAL] uncomment ↓
  // const res = await fetch(`${BASE_URL}/preferences`, {
  //   method: "PUT", headers: headers(), body: JSON.stringify(data)
  // });
  // if (!res.ok) throw new Error((await res.json()).message ?? res.statusText);
  // return res.json();

  await delay(800); // [MOCK]
  return { success: true };
}

/** @param {File} file – image file from <input type="file"> */
async function apiUploadAvatar(file) {
  // [REAL] uncomment ↓
  // const form = new FormData();
  // form.append("avatar", file);
  // const res = await fetch(`${BASE_URL}/avatar`, {
  //   method: "POST",
  //   headers: AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {},
  //   body: form
  // });
  // if (!res.ok) throw new Error((await res.json()).message ?? res.statusText);
  // return res.json(); // expects { avatarUrl: string }

  await delay(800); // [MOCK]
  return { avatarUrl: URL.createObjectURL(file) };
}

// helper
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM HOOK — async request state (loading / saved / error)
// ─────────────────────────────────────────────────────────────────────────────
function useApiStatus(resetAfter = 2200) {
  const [status, setStatus] = useState(null); // null | "loading" | "saved" | "error"
  const [errorMsg, setErrorMsg] = useState("");
  const timerRef = useRef(null);

  const run = useCallback(async (fn) => {
    clearTimeout(timerRef.current);
    setStatus("loading");
    setErrorMsg("");
    try {
      await fn();
      setStatus("saved");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Something went wrong.");
    } finally {
      timerRef.current = setTimeout(() => setStatus(null), resetAfter);
    }
  }, [resetAfter]);

  return { status, errorMsg, run };
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const card = {
  background: "white",
  border: "1px solid var(--border)",
  borderRadius: "var(--r-lg)",
  padding: "24px",
  boxShadow: "var(--shadow-sm)"
};

const inputBase = {
  height: 42,
  border: "1px solid var(--border)",
  borderRadius: "var(--r-md)",
  padding: "0 14px",
  fontSize: 13.5,
  width: "100%",
  outline: "none",
  transition: "border-color 0.15s",
  boxSizing: "border-box",
  background: "var(--gray-50, #fafafa)"
};

const labelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--gray-500)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: 6,
  display: "block"
};

const RESPONSIVE_CSS = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

  .profile-root * { box-sizing: border-box; }

  .profile-header-card  { flex-direction: row; }
  .profile-grid         { grid-template-columns: 1fr 1fr; }
  .tab-strip            { overflow-x: auto; }
  .wh-row               { flex-direction: row; align-items: center; }

  @media (max-width: 900px) {
    .profile-grid { grid-template-columns: 1fr; }
  }

  @media (max-width: 640px) {
    .profile-header-card  { flex-direction: column; align-items: flex-start; gap: 16px !important; }
    .profile-stats        { gap: 20px !important; }
    .tab-strip button     { padding: 8px 12px !important; font-size: 12.5px !important; }
    .wh-row               { flex-direction: column; align-items: flex-start; gap: 6px; }
    .wh-times             { width: 100%; justify-content: flex-start; }
    .save-row             { flex-direction: column; }
    .save-row button      { width: 100%; justify-content: center; }
  }

  input:focus, select:focus, textarea:focus {
    border-color: var(--green) !important;
    box-shadow: 0 0 0 3px var(--green-light, #e6f4ea);
  }

  .profile-tab-content { animation: fadeIn 0.2s ease; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function FieldGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, ...rest }) {
  return (
    <input
      style={inputBase}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    />
  );
}

function SelectInput({ value, onChange, options }) {
  return (
    <select
      style={{ ...inputBase, cursor: "pointer" }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function SaveBtn({ status, onClick, label = "Save Changes", icon = <Save size={15} /> }) {
  const bgMap = {
    saved: "var(--green-dark, #276749)",
    error: "#c53030",
    loading: "var(--green)",
    default: "var(--green)"
  };
  const bg = bgMap[status] ?? bgMap.default;

  return (
    <button
      onClick={onClick}
      disabled={status === "loading"}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "11px 26px", borderRadius: "var(--r-md)",
        background: bg, color: "white", border: "none",
        fontSize: 14, fontWeight: 600,
        cursor: status === "loading" ? "not-allowed" : "pointer",
        opacity: status === "loading" ? 0.8 : 1,
        transition: "background 0.2s, opacity 0.2s"
      }}
    >
      {status === "loading" ? (
        <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Saving…</>
      ) : status === "saved" ? "✓ Saved!" : status === "error" ? "⚠ Error" : <>{icon} {label}</>}
    </button>
  );
}

function CancelBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "11px 22px", borderRadius: "var(--r-md)",
        border: "1px solid var(--border)", background: "white",
        fontSize: 14, fontWeight: 600, cursor: "pointer", color: "var(--gray-600)"
      }}
    >
      Cancel
    </button>
  );
}

function ErrorBanner({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      marginBottom: 16, padding: "10px 14px",
      borderRadius: "var(--r-md)",
      background: "#fff5f5", border: "1px solid #fed7d7",
      color: "#c53030", fontSize: 13
    }}>
      {msg}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD STRENGTH
// ─────────────────────────────────────────────────────────────────────────────
function calcStrength(pass) {
  let s = 0;
  if (pass.length >= 8) s++;
  if (/[A-Z]/.test(pass)) s++;
  if (/[0-9]/.test(pass)) s++;
  if (/[^A-Za-z0-9]/.test(pass)) s++;
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Profile() {
  const navigate  = useNavigate();
  const [tab, setTab] = useState("profile");

  // ── API hooks
  const profileApi  = useApiStatus();
  const passwordApi = useApiStatus();
  const prefsApi    = useApiStatus();

  // ── Avatar
  const [avatarUrl, setAvatarUrl] = useState(null);

  // ── Profile form state
  const [profileData, setProfileData] = useState({
    firstName:      "Sara",
    lastName:       "Rahman",
    email:          currentUser.email,
    phone:          currentUser.phone,
    specialization: "Clinical Nutrition & Dietetics",
    licenseNumber:  currentUser.license,
    clinic:         currentUser.clinic,
    languages:      currentUser.languages,
    bio:            "Senior Clinical Nutritionist with 8+ years of experience in medical nutrition therapy, weight management, and chronic disease dietary management."
  });

  const setProfile = (key) => (val) => setProfileData((p) => ({ ...p, [key]: val }));

  // ── Preferences form state
  const [prefsData, setPrefsData] = useState({
    language:    "Arabic",
    timezone:    "Africa/Algiers (UTC+1)",
    dateFormat:  "DD/MM/YYYY",
    calorieUnit: "kcal"
  });
  const setPref = (key) => (val) => setPrefsData((p) => ({ ...p, [key]: val }));

  const [workingHours, setWorkingHours] = useState({
    Monday:    { start: "09:00", end: "17:00" },
    Tuesday:   { start: "09:00", end: "17:00" },
    Wednesday: { start: "09:00", end: "17:00" },
    Thursday:  { start: "09:00", end: "17:00" },
    Friday:    { start: "09:00", end: "17:00" }
  });
  const setWH = (day, field) => (e) =>
    setWorkingHours((p) => ({ ...p, [day]: { ...p[day], [field]: e.target.value } }));

  // ── Password form state
  const [passwordData, setPasswordData]     = useState({ current: "", new: "", confirm: "" });
  const [showPasswords, setShowPasswords]   = useState({ current: false, new: false, confirm: false });
  const [passwordError, setPasswordError]   = useState("");
  const passwordStrength = calcStrength(passwordData.new);

  const handlePasswordField = (field, value) => {
    setPasswordData((p) => ({ ...p, [field]: value }));
    setPasswordError("");
  };
  const toggleShow = (field) => setShowPasswords((p) => ({ ...p, [field]: !p[field] }));

  // ── Handlers
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { avatarUrl: url } = await apiUploadAvatar(file);
      setAvatarUrl(url);
    } catch {
      alert("Avatar upload failed. Please try again.");
    }
  };

  const handleSaveProfile = () =>
    profileApi.run(() => apiUpdateProfile(profileData));

  const handleSavePrefs = () =>
    prefsApi.run(() => apiUpdatePreferences({ ...prefsData, workingHours }));

  const handleUpdatePassword = () => {
    setPasswordError("");
    if (!passwordData.current) return setPasswordError("Current password is required.");
    if (passwordData.new.length < 8) return setPasswordError("New password must be at least 8 characters.");
    if (passwordData.new !== passwordData.confirm) return setPasswordError("Passwords do not match.");

    passwordApi.run(async () => {
      await apiUpdatePassword({ currentPassword: passwordData.current, newPassword: passwordData.new });
      setPasswordData({ current: "", new: "", confirm: "" });
    });
  };

  // ── Tabs config
  const TABS = [
    { id: "profile",  label: "My Profile", Icon: User },
    { id: "settings", label: "Settings",   Icon: Settings },
    { id: "security", label: "Security",   Icon: Lock }
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="profile-root">
      <style>{RESPONSIVE_CSS}</style>

     

      {/* ── Profile header card */}
      <div
        className="profile-header-card"
        style={{
          ...card,
          display: "flex", gap: 20, flexWrap: "wrap",
          background: "white",
          marginBottom: 20
        }}
      >
        {/* Avatar */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{
            width: 84, height: 84, borderRadius: "50%",
            background: avatarUrl ? "transparent" : "linear-gradient(135deg,#5A8FBF,#7B6EA8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, fontWeight: 700, color: "white",
            border: "4px solid white", boxShadow: "var(--shadow-md)", overflow: "hidden"
          }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : `${profileData.firstName[0]}${profileData.lastName[0]}`}
          </div>
          <label
            title="Change photo"
            style={{
              position: "absolute", bottom: 0, right: 0,
              width: 28, height: 28, borderRadius: "50%",
              background: "var(--green)", border: "2px solid white",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "opacity 0.15s"
            }}
          >
            <Camera size={13} color="white" />
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
          </label>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--gray-800)" }}>{currentUser.fullName}</div>
          <div style={{ fontSize: 13, color: "var(--gray-600)", marginTop: 3 }}>
            {currentUser.title} · {currentUser.clinic}
          </div>
          <div className="profile-stats" style={{ display: "flex", gap: 28, marginTop: 16, flexWrap: "wrap" }}>
            {[
              [currentUser.patientsCount, "Patients"],
              [currentUser.experience,    "Experience"],
              [`${currentUser.rating}★`,  "Rating"],
              [currentUser.plansCreated,  "Plans Created"]
            ].map(([v, l]) => (
              <div key={l}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--gray-800)" }}>{v}</div>
                <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 1 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <span style={{
          alignSelf: "flex-start",
          padding: "5px 13px", borderRadius: 20, fontSize: 12, fontWeight: 600,
          background: "var(--green-light)", color: "var(--green-dark)"
        }}>● Active</span>
      </div>

      {/* ── Tab strip */}
      <div className="tab-strip" style={{
        display: "flex", gap: 4,
        background: "var(--gray-100)", borderRadius: "var(--r-lg)",
        padding: 4, width: "fit-content", maxWidth: "100%", marginBottom: 24
      }}>
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 18px", borderRadius: "var(--r-md)", border: "none",
              fontSize: 13.5, fontWeight: tab === id ? 600 : 500,
              color: tab === id ? "var(--gray-800)" : "var(--gray-500)",
              background: tab === id ? "white" : "transparent",
              cursor: "pointer", whiteSpace: "nowrap",
              boxShadow: tab === id ? "var(--shadow-sm)" : "none",
              transition: "background 0.15s, color 0.15s"
            }}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ════════════════════ PROFILE TAB ════════════════════ */}
      {tab === "profile" && (
        <div className="profile-tab-content">
          <div className="profile-grid" style={{ display: "grid", gap: 20, marginBottom: 24 }}>

            {/* Personal info */}
            <div style={card}>
              <SectionTitle>Personal Information</SectionTitle>
              {[
                { label: "First Name", key: "firstName", type: "text" },
                { label: "Last Name",  key: "lastName",  type: "text" },
                { label: "Email",      key: "email",     type: "email" },
                { label: "Phone",      key: "phone",     type: "tel" }
              ].map(({ label, key, type }) => (
                <FieldGroup key={key} label={label}>
                  <TextInput type={type} value={profileData[key]} onChange={setProfile(key)} />
                </FieldGroup>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Professional details */}
              <div style={card}>
                <SectionTitle>Professional Details</SectionTitle>
                {[
                  { label: "Specialization", key: "specialization" },
                  { label: "License Number", key: "licenseNumber"  },
                  { label: "Clinic",         key: "clinic"         },
                  { label: "Languages",      key: "languages"      }
                ].map(({ label, key }) => (
                  <FieldGroup key={key} label={label}>
                    <TextInput value={profileData[key]} onChange={setProfile(key)} />
                  </FieldGroup>
                ))}
              </div>

              {/* Bio */}
              <div style={card}>
                <SectionTitle>Bio</SectionTitle>
                <textarea
                  style={{ ...inputBase, height: "auto", minHeight: 110, padding: "12px 14px", resize: "vertical" }}
                  value={profileData.bio}
                  onChange={(e) => setProfile("bio")(e.target.value)}
                />
              </div>
            </div>
          </div>

          {profileApi.errorMsg && <ErrorBanner msg={profileApi.errorMsg} />}
          <div className="save-row" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <SaveBtn status={profileApi.status} onClick={handleSaveProfile} />
            <CancelBtn onClick={() => navigate("/nutritionist/dashboard")} />
          </div>
        </div>
      )}

      {/* ════════════════════ SETTINGS TAB ════════════════════ */}
      {tab === "settings" && (
        <div className="profile-tab-content">
          <div className="profile-grid" style={{ display: "grid", gap: 20, marginBottom: 24 }}>

            {/* Preferences */}
            <div style={card}>
              <SectionTitle>Preferences</SectionTitle>

              <FieldGroup label="Language">
                <SelectInput value={prefsData.language} onChange={setPref("language")}
                  options={["Arabic", "French", "English"]} />
              </FieldGroup>

              <FieldGroup label="Timezone">
                <SelectInput value={prefsData.timezone} onChange={setPref("timezone")}
                  options={["Africa/Algiers (UTC+1)", "Europe/Paris (UTC+2)", "UTC"]} />
              </FieldGroup>

              <FieldGroup label="Date Format">
                <SelectInput value={prefsData.dateFormat} onChange={setPref("dateFormat")}
                  options={["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]} />
              </FieldGroup>

              <FieldGroup label="Calorie Unit">
                <SelectInput value={prefsData.calorieUnit} onChange={setPref("calorieUnit")}
                  options={["kcal", "kJ"]} />
              </FieldGroup>
            </div>

            {/* Working hours */}
            <div style={card}>
              <SectionTitle>Working Hours</SectionTitle>
              {Object.entries(workingHours).map(([day, { start, end }]) => (
                <div
                  key={day}
                  className="wh-row"
                  style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "10px 0", borderBottom: "1px solid var(--border-light, #f0f0f0)"
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--gray-700)", minWidth: 96 }}>{day}</span>
                  <div className="wh-times" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input style={{ ...inputBase, width: 92, height: 36, fontSize: 13 }}
                      type="time" value={start} onChange={setWH(day, "start")} />
                    <span style={{ color: "var(--gray-300)", flexShrink: 0 }}>–</span>
                    <input style={{ ...inputBase, width: 92, height: 36, fontSize: 13 }}
                      type="time" value={end} onChange={setWH(day, "end")} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {prefsApi.errorMsg && <ErrorBanner msg={prefsApi.errorMsg} />}
          <div className="save-row" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <SaveBtn status={prefsApi.status} onClick={handleSavePrefs} />
            <CancelBtn onClick={() => navigate("/nutritionist/dashboard")} />
          </div>
        </div>
      )}

      {/* ════════════════════ SECURITY TAB ════════════════════ */}
      {tab === "security" && (
        <div className="profile-tab-content" style={{ maxWidth: 520, width: "100%" }}>
          <div style={card}>
            <SectionTitle>Change Password</SectionTitle>

            {[
              { label: "Current Password",     field: "current", autoComplete: "current-password" },
              { label: "New Password",         field: "new",     autoComplete: "new-password" },
              { label: "Confirm New Password", field: "confirm", autoComplete: "new-password" }
            ].map(({ label, field, autoComplete }) => (
              <FieldGroup key={field} label={label}>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPasswords[field] ? "text" : "password"}
                    style={inputBase}
                    value={passwordData[field]}
                    onChange={(e) => handlePasswordField(field, e.target.value)}
                    placeholder="••••••••"
                    autoComplete={autoComplete}
                  />
                  <button
                    type="button"
                    onClick={() => toggleShow(field)}
                    style={{
                      position: "absolute", right: 13, top: "50%",
                      transform: "translateY(-50%)",
                      background: "none", border: "none",
                      cursor: "pointer", color: "var(--gray-400)", lineHeight: 0
                    }}
                  >
                    {showPasswords[field] ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </FieldGroup>
            ))}

            {/* Strength bar — only shown when new password has content */}
            {passwordData.new && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
                  Password Strength
                </div>
                <div style={{ display: "flex", gap: 5 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} style={{
                      flex: 1, height: 5, borderRadius: 999,
                      background: i <= passwordStrength
                        ? (passwordStrength >= 4 ? "var(--green)" : "var(--amber, #f59e0b)")
                        : "var(--gray-200)",
                      transition: "background 0.3s"
                    }} />
                  ))}
                </div>
                <div style={{ fontSize: 12, marginTop: 6, color: passwordStrength >= 3 ? "var(--green-dark)" : "var(--gray-500)" }}>
                  {passwordStrength >= 4 ? "Strong ✓" : passwordStrength >= 2 ? "Medium — add symbols or numbers" : "Weak — too short or simple"}
                </div>
              </div>
            )}

            <ErrorBanner msg={passwordError || passwordApi.errorMsg} />

            <SaveBtn
              status={passwordApi.status}
              onClick={handleUpdatePassword}
              label="Update Password"
              icon={<Lock size={15} />}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TINY HELPER
// ─────────────────────────────────────────────────────────────────────────────
function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--gray-700)", marginBottom: 18, paddingBottom: 10, borderBottom: "1px solid var(--border-light, #f0f0f0)" }}>
      {children}
    </div>
  );
}