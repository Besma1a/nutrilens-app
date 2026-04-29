import { useEffect, useMemo, useState } from "react";
import { Camera, Lock, Save, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  nutritionistProfileApi,
  setGlobalToken,
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const SPECIALIZATION_OPTIONS = [
  { value: "weight_loss", label: "Weight Loss" },
  { value: "muscle_gain", label: "Muscle Gain" },
  { value: "disease_management", label: "Disease Management" },
  { value: "sports_nutrition", label: "Sports Nutrition" },
  { value: "general", label: "General Nutrition" },
];

const cardStyle = {
  background: "white",
  border: "1px solid var(--border)",
  borderRadius: "var(--r-lg)",
  padding: 24,
  boxShadow: "var(--shadow-sm)",
};

const inputStyle = {
  height: 42,
  width: "100%",
  border: "1px solid var(--border)",
  borderRadius: "var(--r-md)",
  padding: "0 12px",
  fontSize: 14,
  background: "#fafafa",
};

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--gray-600)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, updateUserState } = useAuth();
  const [tab, setTab] = useState("profile");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    specialization: "general",
    credentials: "",
    bio: "",
    profile_picture: "",
  });
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState("");

  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [profileMsg, setProfileMsg] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const specializationLabel = useMemo(
    () => SPECIALIZATION_OPTIONS.find((s) => s.value === profileData.specialization)?.label || "General Nutrition",
    [profileData.specialization]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await nutritionistProfileApi.getMyProfile();
        if (!mounted) return;
        setProfileData((prev) => ({
          ...prev,
          name: data?.name || "",
          email: data?.email || "",
          phone: data?.phone || "",
          specialization: data?.specialization || "general",
          credentials: data?.credentials || "",
          bio: data?.bio || "",
          profile_picture: data?.profile_picture || "",
        }));
        setProfilePicturePreview(
          data?.profile_picture
            ? data.profile_picture.startsWith("http")
              ? data.profile_picture
              : `${window.location.protocol}//${window.location.hostname}:8000${data.profile_picture}`
            : ""
        );
      } catch (err) {
        if (mounted) setProfileMsg(err?.message || "Failed to load profile.");
      } finally {
        if (mounted) setLoadingProfile(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const setProfileField = (key) => (value) =>
    setProfileData((prev) => ({ ...prev, [key]: value }));

  const onSaveProfile = async () => {
    setProfileMsg("");
    setProfileSaving(true);
    try {
      const payload = {
        ...profileData,
        ...(profilePictureFile ? { profile_picture: profilePictureFile } : {}),
      };
      const res = await nutritionistProfileApi.updateMyProfile(payload);
      if (res?.profile_picture) {
        setProfileData((prev) => ({ ...prev, profile_picture: res.profile_picture }));
        setProfilePicturePreview(
          res.profile_picture.startsWith("http")
            ? res.profile_picture
            : `${window.location.protocol}//${window.location.hostname}:8000${res.profile_picture}`
        );
        updateUserState((prev) => ({
          ...prev,
          profilePicture: res.profile_picture,
          profile_picture: res.profile_picture,
        }));
      }
      setProfilePictureFile(null);
      setProfileMsg("Profile saved successfully.");
      setIsEditing(false);
    } catch (err) {
      setProfileMsg(err?.message || "Could not save profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const onChangePassword = async () => {
    setPasswordMsg("");
    if (!passwordData.oldPassword) {
      setPasswordMsg("Current password is required.");
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordMsg("New password must be at least 8 characters.");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMsg("New password and confirmation do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await nutritionistProfileApi.changePassword({
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword,
        newPasswordConfirm: passwordData.confirmPassword,
      });
      const nextToken = res?.token;
      if (nextToken) {
        setGlobalToken(nextToken);
        localStorage.setItem("authToken", nextToken);
      }
      setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordMsg("Password updated successfully.");
    } catch (err) {
      setPasswordMsg(err?.message || "Could not update password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  // Get user's initials for avatar
  const getInitials = (name) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div>
      <div
        style={{
          background: "white",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-lg)",
          padding: "18px 18px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* Avatar */}
          <div style={{ position: "relative", width: 72, height: 72 }}>
            {profilePicturePreview ? (
              <img
                src={profilePicturePreview}
                alt={profileData.name || "Nutritionist"}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "1px solid rgba(0,0,0,.08)",
                  background: "#fff",
                }}
              />
            ) : (
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: "#8B5A2B",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                  fontWeight: 800,
                  color: "white",
                }}
              >
                {getInitials(profileData.name || "N")}
              </div>
            )}

            <input
              id="nutritionist-photo-input"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setProfilePictureFile(f);
                if (f) {
                  setProfilePicturePreview(URL.createObjectURL(f));
                  setIsEditing(true);
                }
              }}
            />
            <button
              type="button"
              onClick={() => document.getElementById("nutritionist-photo-input")?.click()}
              aria-label="Change profile photo"
              style={{
                position: "absolute",
                right: -4,
                bottom: -4,
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: "1px solid rgba(0,0,0,.10)",
                background: "white",
                boxShadow: "0 6px 16px rgba(0,0,0,.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Camera size={14} color="var(--ink-4)" />
            </button>
          </div>
          {/* Name and Gender */}
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--ink-2)" }}>
              {profileData.name || "Nutritionist"}
            </div>
            <div style={{ marginTop: 4, color: "var(--ink-5)", fontSize: 13 }}>
              {user?.gender ? user.gender : specializationLabel}
            </div>
          </div>
        </div>
        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="button"
            onClick={() => {
              setTab("profile");
              setIsEditing(true);
            }}
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--r-md)",
              padding: "8px 16px",
              fontWeight: 600,
              cursor: "pointer",
              background: "white",
              color: "var(--ink-3)",
              fontSize: 14,
            }}
          >
            Edit profile
          </button>
          <button
            type="button"
            onClick={() => {
              // Navigate out of the protected /nutritionist area first so
              // route guards don't redirect to /login during logout.
              navigate("/", { replace: true });
              logout();
            }}
            style={{
              border: "1px solid #fecaca",
              borderRadius: "var(--r-md)",
              padding: "8px 16px",
              fontWeight: 600,
              cursor: "pointer",
              background: "white",
              color: "#b42318",
              fontSize: 14,
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setTab("profile")}
          style={{
            border: "none",
            borderRadius: "var(--r-md)",
            padding: "9px 14px",
            fontWeight: 600,
            cursor: "pointer",
            background: tab === "profile" ? "var(--green-light)" : "var(--gray-100)",
          }}
        >
          <User size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
          My Profile
        </button>
        <button
          type="button"
          onClick={() => setTab("security")}
          style={{
            border: "none",
            borderRadius: "var(--r-md)",
            padding: "9px 14px",
            fontWeight: 600,
            cursor: "pointer",
            background: tab === "security" ? "var(--green-light)" : "var(--gray-100)",
          }}
        >
          <Lock size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
          Security
        </button>
      </div>

      {tab === "profile" && (
        <div style={cardStyle}>
          {loadingProfile ? (
            <div style={{ color: "var(--gray-500)" }}>Loading profile...</div>
          ) : (
            <>
              <Field label="Full Name">
                <input style={inputStyle} value={profileData.name} onChange={(e) => setProfileField("name")(e.target.value)} />
              </Field>
              <Field label="Email">
                <input style={{ ...inputStyle, background: "#f2f2f2" }} value={profileData.email} disabled />
              </Field>
              <Field label="Phone">
                <input style={inputStyle} value={profileData.phone} onChange={(e) => setProfileField("phone")(e.target.value)} />
              </Field>
              <Field label="Specialization">
                <select
                  style={{ ...inputStyle, cursor: "pointer" }}
                  value={profileData.specialization}
                  onChange={(e) => setProfileField("specialization")(e.target.value)}
                >
                  {SPECIALIZATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Credentials">
                <textarea
                  style={{ ...inputStyle, height: 90, paddingTop: 10, resize: "vertical" }}
                  value={profileData.credentials}
                  onChange={(e) => setProfileField("credentials")(e.target.value)}
                />
              </Field>
              <Field label="Bio">
                <textarea
                  style={{ ...inputStyle, height: 110, paddingTop: 10, resize: "vertical" }}
                  value={profileData.bio}
                  onChange={(e) => setProfileField("bio")(e.target.value)}
                />
              </Field>

              {profileMsg && (
                <div style={{ marginBottom: 12, color: profileMsg.includes("successfully") ? "var(--green-dark)" : "#b42318" }}>
                  {profileMsg}
                </div>
              )}

              {isEditing ? (
                <button
                  type="button"
                  onClick={onSaveProfile}
                  disabled={profileSaving}
                  style={{
                    border: "none",
                    borderRadius: "var(--r-md)",
                    padding: "10px 16px",
                    fontWeight: 700,
                    color: "white",
                    background: "var(--green)",
                    cursor: profileSaving ? "not-allowed" : "pointer",
                    opacity: profileSaving ? 0.7 : 1,
                  }}
                >
                  <Save size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
                  {profileSaving ? "Saving..." : "Save Changes"}
                </button>
              ) : null}
            </>
          )}
        </div>
      )}

      {tab === "security" && (
        <div style={cardStyle}>
          <Field label="Current Password">
            <input
              type="password"
              style={inputStyle}
              value={passwordData.oldPassword}
              onChange={(e) => setPasswordData((prev) => ({ ...prev, oldPassword: e.target.value }))}
            />
          </Field>
          <Field label="New Password">
            <input
              type="password"
              style={inputStyle}
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
            />
          </Field>
          <Field label="Confirm New Password">
            <input
              type="password"
              style={inputStyle}
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            />
          </Field>

          {passwordMsg && (
            <div style={{ marginBottom: 12, color: passwordMsg.includes("successfully") ? "var(--green-dark)" : "#b42318" }}>
              {passwordMsg}
            </div>
          )}

          <button
            type="button"
            onClick={onChangePassword}
            disabled={passwordSaving}
            style={{
              border: "none",
              borderRadius: "var(--r-md)",
              padding: "10px 16px",
              fontWeight: 700,
              color: "white",
              background: "var(--green)",
              cursor: passwordSaving ? "not-allowed" : "pointer",
              opacity: passwordSaving ? 0.7 : 1,
            }}
          >
            {passwordSaving ? "Updating..." : "Update Password"}
          </button>
        </div>
      )}
    </div>
  );
}
