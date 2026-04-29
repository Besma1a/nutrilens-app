import { useEffect, useState } from "react";
import { T, css, Avatar, FormInput, FormTextarea, SuccessMsg, ErrorMsg } from "./adminUtils";
import { adminApi } from "../../services/adminApi";

const ADMIN_INIT = { name: "", email: "", phone: "", role: "", timezone: "", bio: "" };

export default function AdminProfilePage() {
  const [profile, setProfile] = useState(ADMIN_INIT);
  const [initialProfile, setInitialProfile] = useState(ADMIN_INIT);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState(null);
  const [pwErrors, setPwErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");

  const update = (key, value) => {
    setSaved(false);
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    adminApi
      .profile()
      .then((data) => {
        setProfile(data);
        setInitialProfile(data);
      })
      .catch(() => {});
  }, []);

  const validatePassword = () => {
    const errors = {};
    if (!pwForm.current.trim()) errors.current = "Enter your current password";
    if (pwForm.next.length < 8) errors.next = "New password must be at least 8 characters";
    if (pwForm.next !== pwForm.confirm) errors.confirm = "Passwords don't match";
    return errors;
  };

  const handlePasswordSave = () => {
    const errors = validatePassword();
    if (Object.keys(errors).length > 0) {
      setPwErrors(errors);
      return;
    }
    adminApi.changePassword({ currentPassword: pwForm.current, newPassword: pwForm.next })
      .then(() => {
        setPwMsg({ type: "success", text: "Password updated successfully." });
        setPwForm({ current: "", next: "", confirm: "" });
        setPwErrors({});
        setTimeout(() => setPwMsg(null), 3000);
      })
      .catch((e) => setPwMsg({ type: "error", text: e.message }));
  };

  const handleSaveProfile = () => {
    adminApi
      .updateProfile({
        name: profile.name,
        phone: profile.phone,
        timezone: profile.timezone,
      })
      .then((res) => {
        setProfile(res);
        setInitialProfile(res);
        setSaved(true);
        setSuccessMsg("Profile updated successfully");
        setIsEditing(false);
        setTimeout(() => setSuccessMsg(""), 2000);
      });
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");
    } catch {
      // ignore
    }
    window.location.href = "/";
  };

  return (
    <>
      <SuccessMsg message={successMsg} show={!!successMsg} />

      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 32, ...css.cardPad }}>
        <Avatar name={profile.name} size={80} />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: T.text, margin: 0, marginBottom: 4 }}>
            {profile.name}
          </h1>
          <p style={{ fontSize: 13, color: T.gray, margin: 0 }}>
            {profile.role} • {profile.timezone}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            style={css.btn(T.white, T.text, `1px solid ${T.border}`)}
            onClick={() => {
              if (tab !== "profile") setTab("profile");
              setIsEditing(true);
              setSaved(false);
            }}
          >
            Edit Profile
          </button>
          <button
            style={css.btn(T.red, "#fff")}
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div style={{ display: "flex", gap: 2, background: T.grayLt, padding: 4, borderRadius: 12, marginBottom: 24, width: "fit-content" }}>
        {["profile", "security"].map(tabName => (
          <button
            key={tabName}
            onClick={() => {
              setTab(tabName);
              setPwMsg(null);
            }}
            style={{
              ...css.btn(tab === tabName ? T.white : "transparent", tab === tabName ? T.text : T.gray),
              border: "none",
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: tab === tabName ? 600 : 500,
              borderRadius: 10,
              textTransform: "capitalize",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {tabName}
          </button>
        ))}
      </div>

      {/* PROFILE TAB */}
      {tab === "profile" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
            <div style={css.cardPad}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0, marginBottom: 16 }}>
                Personal Information
              </h3>
              {isEditing ? (
                <>
                  <FormInput
                    label="Full Name"
                    value={profile.name}
                    onChange={e => update("name", e.target.value)}
                  />
                  <FormInput
                    label="Email Address"
                    type="email"
                    value={profile.email}
                    onChange={() => {}}
                  />
                  <FormInput
                    label="Phone Number"
                    type="tel"
                    value={profile.phone}
                    onChange={e => update("phone", e.target.value)}
                  />
                  <FormInput
                    label="Time Zone"
                    value={profile.timezone}
                    onChange={e => update("timezone", e.target.value)}
                  />
                </>
              ) : (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: T.gray, display: "block", marginBottom: 5 }}>
                      Full Name
                    </label>
                    <div style={{ fontSize: 14, color: T.text, padding: "10px 12px", background: T.bg, borderRadius: 8 }}>
                      {profile.name || "—"}
                    </div>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: T.gray, display: "block", marginBottom: 5 }}>
                      Email Address
                    </label>
                    <div style={{ fontSize: 14, color: T.text, padding: "10px 12px", background: T.bg, borderRadius: 8 }}>
                      {profile.email || "—"}
                    </div>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: T.gray, display: "block", marginBottom: 5 }}>
                      Phone Number
                    </label>
                    <div style={{ fontSize: 14, color: T.text, padding: "10px 12px", background: T.bg, borderRadius: 8 }}>
                      {profile.phone || "—"}
                    </div>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: T.gray, display: "block", marginBottom: 5 }}>
                      Time Zone
                    </label>
                    <div style={{ fontSize: 14, color: T.text, padding: "10px 12px", background: T.bg, borderRadius: 8 }}>
                      {profile.timezone || "—"}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={css.cardPad}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0, marginBottom: 16 }}>
                Role & Permissions
              </h3>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.gray, display: "block", marginBottom: 5 }}>
                  Job Title
                </label>
                <div style={{ fontSize: 14, color: T.text, padding: "10px 12px", background: T.bg, borderRadius: 8 }}>
                  {profile.role}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.gray, display: "block", marginBottom: 5 }}>
                  Permissions
                </label>
                <div style={{ fontSize: 13, color: T.text }}>
                  <div style={{ marginBottom: 6 }}>✓ Full Platform Access</div>
                  <div style={{ marginBottom: 6 }}>✓ User Management</div>
                  <div style={{ marginBottom: 6 }}>✓ Billing & Revenue</div>
                  <div>✓ Content Moderation</div>
                </div>
              </div>
            </div>
          </div>

          {isEditing && (
            <div style={css.cardPad}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button style={css.btn(T.green, "#fff")} onClick={handleSaveProfile}>
                  Save Changes
                </button>
                <button
                  style={css.btn(T.white, T.text, `1px solid ${T.border}`)}
                  onClick={() => {
                    setProfile(initialProfile);
                    setIsEditing(false);
                    setSaved(false);
                  }}
                >
                  Cancel
                </button>
                {saved && <span style={{ fontSize: 12, color: T.greenTx, fontWeight: 600 }}>Saved</span>}
              </div>
            </div>
          )}
        </>
      )}

      {/* SECURITY TAB */}
      {tab === "security" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={css.cardPad}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0, marginBottom: 16 }}>
              Change Password
            </h3>
            <ErrorMsg error={Object.values(pwErrors)[0]} show={Object.keys(pwErrors).length > 0} />

            <FormInput
              label="Current Password"
              type="password"
              value={pwForm.current}
              onChange={e => {
                setPwForm(prev => ({ ...prev, current: e.target.value }));
                setPwErrors(prev => ({ ...prev, current: "" }));
                setPwMsg(null);
              }}
              error={pwErrors.current}
            />
            <FormInput
              label="New Password"
              type="password"
              value={pwForm.next}
              onChange={e => {
                setPwForm(prev => ({ ...prev, next: e.target.value }));
                setPwErrors(prev => ({ ...prev, next: "" }));
                setPwMsg(null);
              }}
              error={pwErrors.next}
            />
            <FormInput
              label="Confirm New Password"
              type="password"
              value={pwForm.confirm}
              onChange={e => {
                setPwForm(prev => ({ ...prev, confirm: e.target.value }));
                setPwErrors(prev => ({ ...prev, confirm: "" }));
                setPwMsg(null);
              }}
              error={pwErrors.confirm}
            />

            {pwMsg && (
              <div
                style={{
                  background: pwMsg.type === "success" ? T.greenLight : T.redLt,
                  color: pwMsg.type === "success" ? T.greenTx : T.redTx,
                  padding: "10px 12px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 12,
                }}
              >
                {pwMsg.text}
              </div>
            )}

            <button style={css.btn(T.green, "#fff")} onClick={handlePasswordSave}>
              Update Password
            </button>
          </div>

          <div style={css.cardPad}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0, marginBottom: 16 }}>
              Security
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ paddingBottom: 12, borderBottom: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4 }}>
                  Two-Factor Authentication
                </div>
                <div style={{ fontSize: 12, color: T.green, fontWeight: 600 }}>Enabled</div>
              </div>
              <div style={{ paddingBottom: 12, borderBottom: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4 }}>
                  Password Strength
                </div>
                <div style={{ fontSize: 12, color: T.green, fontWeight: 600 }}>Strong</div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4 }}>
                  Last Updated
                </div>
                <div style={{ fontSize: 12, color: T.gray }}>3 months ago</div>
              </div>
            </div>

           
          </div>
        </div>
      )}
    </>
  );
}