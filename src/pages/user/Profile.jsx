import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/layout/Toast';
import { profileApi, updateProfile, getMyProfile } from '../../services/api';
import { Save, User, Activity, Heart, Lock, LogOut, Camera } from 'lucide-react';

const DIET_STYLES    = ['Mediterranean','Low-Carb','Keto','Vegan','Paleo','Balanced','High-Protein','Gluten-Free'];
const ACTIVITY_LVLS  = ['Sedentary','Lightly Active','Moderately Active','Very Active','Extremely Active'];
const GOAL_TYPES     = ['Lose Weight','Gain Muscle','Maintain Weight','Improve Endurance','Eat Healthier'];

const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(String(email).toLowerCase());
};
const validateHeight = (value) => {
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) return 'Height must be a positive number';
  if (num < 50 || num > 250) return 'Height must be between 50cm and 250cm';
  return null;
};
const validateWeight = (value) => {
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) return 'Weight must be a positive number';
  if (num < 20 || num > 300) return 'Weight must be between 20kg and 300kg';
  return null;
};
const validateBodyFat = (value) => {
  const num = parseFloat(value);
  if (isNaN(num) || num < 0 || num > 100) return 'Body fat must be between 0% and 100%';
  return null;
};

const isSet = (v) => v !== null && v !== undefined && v !== '';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap');

.pf{font-family:'Inter',sans-serif;background:#ffffff;min-height:100vh;padding:32px 28px 64px;color:#2B5726;box-sizing:border-box;}
.pf*{box-sizing:border-box;margin:0;padding:0;}

.pf-hero{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px 28px;margin-bottom:24px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;box-shadow:0 1px 4px rgba(0,0,0,0.04);position:relative;overflow:hidden;}
.pf-hero::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#2B5726,#DEE660);}
.pf-avatar{width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#2B5726,#A50C05);display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;color:#fff;flex-shrink:0;}
.pf-hero-info{flex:1;min-width:140px;}
.pf-hero-name{font-size:20px;font-weight:800;color:#2B5726;letter-spacing:-0.4px;font-family:'Outfit',sans-serif;}
.pf-hero-sub{font-size:13px;color:#64748b;font-weight:500;margin-top:2px;}
.pf-hero-stats{display:flex;gap:28px;flex-wrap:wrap;}
.pf-hero-stat{text-align:center;}
.pf-hero-stat-val{font-size:20px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;}
.pf-hero-stat-lbl{font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-top:1px;}
.pf-edit-btn{padding:9px 20px;border-radius:9px;border:1.5px solid #e2e8f0;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .2s;align-self:flex-start;}
.pf-edit-btn.viewing{background:#fff;color:#1e293b;}
.pf-edit-btn.editing{background:#0f172a;color:#fff;border-color:#0f172a;}
.pf-edit-btn:hover.viewing{border-color:#10b981;color:#10b981;}

.pf-tabs{display:flex;gap:3px;background:#f1f5f9;border-radius:12px;padding:4px;margin-bottom:24px;width:fit-content;flex-wrap:wrap;}
.pf-tab{display:flex;align-items:center;gap:7px;padding:9px 18px;border-radius:9px;border:none;font-size:13.5px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .18s;color:#64748b;background:transparent;}
.pf-tab.on{background:#fff;color:#0f172a;box-shadow:0 1px 4px rgba(0,0,0,0.08);}
.pf-tab:hover:not(.on){color:#334155;}

.pf-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:22px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.04);}
.pf-card+.pf-card{margin-top:14px;}
.pf-card-title{font-size:13px;font-weight:700;color:#0f172a;margin-bottom:18px;display:flex;align-items:center;gap:8px;}
.pf-card-title::before{content:'';width:3px;height:16px;background:#10b981;border-radius:4px;display:inline-block;}

.pf-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.pf-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
.pf-field{}
.pf-field-label{font-size:11.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:7px;}
.pf-field-val{padding:10px 14px;background:#f8fafc;border-radius:9px;border:1px solid #e2e8f0;font-size:13.5px;color:#0f172a;font-weight:600;min-height:42px;display:flex;align-items:center;}
.pf-input{height:42px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 14px;font-size:13.5px;font-family:inherit;color:#0f172a;background:#fff;outline:none;width:100%;font-weight:500;transition:border-color .18s,box-shadow .18s;}
.pf-input:focus{border-color:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,.1);}
.pf-select{height:42px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 14px;font-size:13.5px;font-family:inherit;color:#0f172a;background:#fff;outline:none;width:100%;font-weight:500;cursor:pointer;transition:border-color .18s,box-shadow .18s;}
.pf-select:focus{border-color:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,.1);}

.pf-section-divider{height:1px;background:#f1f5f9;margin:20px 0;}

.pf-bmi-row{margin-top:18px;display:flex;align-items:center;gap:12px;padding:14px 18px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;}
.pf-bmi-val{font-size:28px;font-weight:800;letter-spacing:-1px;}
.pf-bmi-info{}
.pf-bmi-label{font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;}
.pf-bmi-status{font-size:13px;font-weight:700;margin-top:1px;}

.pf-goal-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px;margin-top:0;}
.pf-goal-item{background:#f8fafc;border:1px solid #e2e8f0;border-radius:11px;padding:16px;}
.pf-goal-item-label{font-size:10.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px;}
.pf-goal-item-val{font-size:14px;font-weight:700;color:#0f172a;}
.pf-activity-badge{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:#065f46;background:#ecfdf5;padding:5px 12px;border-radius:20px;}

.pf-grid-med{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.pf-med-item{padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;display:flex;align-items:flex-start;justify-content:space-between;gap:8px;}
.pf-med-item-nm{font-size:13.5px;font-weight:700;color:#0f172a;}
.pf-med-item-dt{font-size:12px;color:#64748b;margin-top:2px;}
.pf-med-remove{background:none;border:none;cursor:pointer;color:#94a3b8;font-size:16px;line-height:1;padding:0;flex-shrink:0;}
.pf-med-remove:hover{color:#ef4444;}
.pf-add-row{display:flex;gap:8px;margin-bottom:14px;}
.pf-add-input{flex:1;height:38px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13px;font-family:inherit;outline:none;color:#0f172a;background:#fff;}
.pf-add-input:focus{border-color:#10b981;}
.pf-add-btn-sm{padding:0 16px;height:38px;border:1.5px solid #e2e8f0;border-radius:9px;background:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;color:#0f172a;}
.pf-add-btn-sm:hover{border-color:#10b981;color:#10b981;}
.pf-tag{display:inline-flex;align-items:center;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;margin:4px;gap:6px;}
.pf-tag-amber{background:#fef3c7;color:#92400e;}
.pf-tag-green{background:#ecfdf5;color:#065f46;}
.pf-tag-remove{background:none;border:none;cursor:pointer;color:inherit;opacity:.6;font-size:14px;padding:0;line-height:1;}
.pf-tag-remove:hover{opacity:1;}

.pf-security-wrap{max-width:480px;}
.pf-pw-field{margin-bottom:16px;}
.pf-pw-label{font-size:11.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:7px;}
.pf-pw-submit{width:100%;padding:12px;background:#0f172a;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;transition:background .2s;}
.pf-pw-submit:hover{background:#1e293b;}

.pf-save-row{display:flex;gap:10px;margin-top:24px;}
.pf-save-btn{padding:11px 26px;background:#10b981;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:8px;transition:background .2s;}
.pf-save-btn:hover{background:#059669;}
.pf-save-btn:disabled{background:#94a3b8;cursor:not-allowed;}
.pf-cancel-btn{padding:11px 22px;border:1.5px solid #e2e8f0;background:#fff;border-radius:10px;font-size:14px;font-weight:600;color:#475569;cursor:pointer;font-family:inherit;transition:border-color .2s;}
.pf-cancel-btn:hover{border-color:#94a3b8;}

@media(max-width:860px){.pf-grid-med{grid-template-columns:1fr;}.pf-goal-grid{grid-template-columns:1fr 1fr;}}
@media(max-width:640px){
  .pf{padding:20px 14px 48px;}
  .pf-grid-2{grid-template-columns:1fr;}
  .pf-grid-3{grid-template-columns:1fr 1fr;}
  .pf-goal-grid{grid-template-columns:1fr;}
  .pf-tabs{width:100%;}
  .pf-tab{flex:1;justify-content:center;padding:9px 10px;font-size:12.5px;}
  .pf-hero-stats{gap:16px;}
}
@media(max-width:400px){.pf-grid-3{grid-template-columns:1fr;}}
`;

const Field = ({ name, label, type = 'text', opts = [], span = false, isEditing, form, set }) => (
  <div style={span ? { gridColumn: '1/-1' } : {}}>
    <div className="pf-field-label">{label}</div>
    {isEditing
      ? type === 'select'
        ? <select className="pf-select" value={form[name] || ''} onChange={e => set(name, e.target.value)}>
            <option value="">— Select —</option>
            {opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        : <input className="pf-input" type={type} value={form[name] ?? ''} step={type === 'number' ? '0.1' : undefined}
            onChange={e => set(name, e.target.value)} />
      : <div className="pf-field-val">
          {type === 'date' && form[name]
            ? new Date(form[name]).toLocaleDateString('en-GB')
            : (form[name] || '—')}
        </div>
    }
  </div>
);

export default function Profile() {
  const { user, updateUserState, updateWeight, logout } = useAuth();
  const toast    = useToast();
  const navigate = useNavigate();
  const [photoSaving, setPhotoSaving] = useState(false);

  const handleLogout = () => { logout(); window.location.href = '/'; };

  const [tab,              setTab]              = useState('personal');
  const [isEditing,        setIsEditing]        = useState(false);
  const [isSaving,         setIsSaving]         = useState(false);
  const [profile,          setProfile]          = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSyncBlocked,    setIsSyncBlocked]    = useState(false);

  const [form, setForm] = useState({
    firstName:'', lastName:'', email:'', phoneNumber:'', location:'', dob:'', gender:'Female',
    height:'', weight:'', goalWeight:'', bodyFat:'',
    goalDesc:'', goalType:'Lose Weight',
    dietStyle:'Mediterranean', activityLevel:'Moderately Active',
    sleepTargetHours: 7.5,
  });

  const [conditions,   setConditions]   = useState([]);
  const [allergies,    setAllergies]    = useState([]);
  const [meds,         setMeds]         = useState([]);
  const [newCondition, setNewCondition] = useState('');
  const [newAllergy,   setNewAllergy]   = useState('');
  const [passwordForm, setPasswordForm] = useState({ current:'', next:'', confirm:'' });

  // ── Load profile from backend on mount ────────────────────────────────────
  // After fetching, patch current_weight_kg with the value already in context
  // (persisted to localStorage by updateWeight). The Django signal that writes
  // current_weight_kg can lag behind, so we never let it overwrite a value
  // the user already confirmed saving.
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoadingProfile(true);
        const data = await profileApi.getProfile();

        const contextWeight = user?.stats?.currentWeight ?? null;
        const patchedData = {
          ...data,
          current_weight_kg:
            contextWeight != null ? contextWeight : data?.current_weight_kg,
        };

        setProfile(patchedData);
      } catch (err) {
        console.error('Failed to load profile:', err);
        toast({ message: 'Failed to sync profile from server', type: 'error' });
      } finally {
        setIsLoadingProfile(false);
      }
    };
    loadProfile();
  }, []);

  // ── Helper: sync user + profile data into the form ────────────────────────
  const syncFormFromUser = (userData, profileData) => {
    if (!userData) return;

    setForm((prev) => {
      const heightValue = isSet(profileData?.height_cm)
        ? String(profileData.height_cm)
        : isSet(userData.stats?.height)
          ? String(userData.stats.height)
          : prev.height;

      // profileData is patched before sync, so this should be the most reliable source.
      const weightValue = isSet(profileData?.current_weight_kg)
        ? String(profileData.current_weight_kg)
        : isSet(userData.stats?.currentWeight)
          ? String(userData.stats.currentWeight)
          : prev.weight;

      const goalWeightValue = isSet(profileData?.goal_weight_kg)
        ? String(profileData.goal_weight_kg)
        : isSet(userData.stats?.goalWeight)
          ? String(userData.stats.goalWeight)
          : prev.goalWeight;

      return {
        firstName:        userData.firstName || userData.name?.split(' ')[0] || prev.firstName || '',
        lastName:         userData.lastName  || userData.name?.split(' ').slice(1).join(' ') || prev.lastName || '',
        email:            userData.email     || prev.email || '',
        phoneNumber:      userData.phoneNumber ?? prev.phoneNumber ?? '',
        location:         userData.location  || prev.location || '',
        dob:              userData.dob       || prev.dob || '',
        gender:           userData.gender    || prev.gender || 'Female',
        height:           heightValue,
        weight:           weightValue,
        goalWeight:       goalWeightValue,
        bodyFat:          isSet(userData.stats?.bodyFat) ? String(userData.stats.bodyFat) : prev.bodyFat,
        goalDesc:         userData.goalDesc         || prev.goalDesc || '',
        goalType:         userData.goalType         || prev.goalType || 'Lose Weight',
        dietStyle:        userData.dietStyle        || prev.dietStyle || 'Mediterranean',
        activityLevel:    userData.activityLevel    || prev.activityLevel || 'Moderately Active',
        sleepTargetHours: userData.sleepTargetHours != null ? Number(userData.sleepTargetHours) : (prev.sleepTargetHours ?? 7.5),
      };
    });

    if (Array.isArray(userData.medicalConditions) && userData.medicalConditions.length > 0) {
      setConditions(userData.medicalConditions.map(c =>
        typeof c === 'string'
          ? { name: c, detail: '', status: 'Active' }
          : { name: c.name || '', detail: c.detail || '', status: c.status || 'Active' }
      ));
    } else {
      setConditions([]);
    }

    if (Array.isArray(userData.medications) && userData.medications.length > 0) {
      setMeds(userData.medications.map(m =>
        typeof m === 'string'
          ? { name: m, detail: '' }
          : { name: m.name || '', detail: m.detail || '' }
      ));
    } else {
      setMeds([]);
    }

    if (Array.isArray(userData.allergies) && userData.allergies.length > 0) {
      setAllergies(userData.allergies.map(a =>
        typeof a === 'string' ? a : (a.label || a.name || '')
      ));
    } else {
      setAllergies([]);
    }
  };

  // ── Re-sync form whenever user or profile changes (blocked during save) ───
  useEffect(() => {
    if (isSyncBlocked) return;
    syncFormFromUser(user, profile);
  }, [user, profile, isSyncBlocked]);

  const initials = useMemo(() => {
    const n = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || 'U';
    return n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2);
  }, [user]);

  const profilePictureUrl = useMemo(() => {
    const raw = user?.profilePicture || '';
    if (!raw) return '';
    if (raw.startsWith('http') || raw.startsWith('data:')) return raw;
    return `${window.location.protocol}//${window.location.hostname}:8000${raw}`;
  }, [user?.profilePicture]);

  const onPickProfilePhoto = async (file) => {
    if (!file) return;
    setPhotoSaving(true);
    try {
      const res = await updateProfile({ profile_picture: file });
      updateUserState(res);
      toast({ message: 'Profile photo updated!', type: 'success' });
    } catch (err) {
      toast({ message: err?.message || 'Could not upload profile photo', type: 'error' });
    } finally {
      setPhotoSaving(false);
    }
  };

  const { bmi, bmiLbl, bmiColor } = useMemo(() => {
    const h   = parseFloat(form.height) / 100;
    const raw = h > 0 ? parseFloat(form.weight) / (h * h) : 0;
    let label = 'Normal', color = '#10b981';
    if (raw < 18.5)     { label = 'Underweight'; color = '#3b82f6'; }
    else if (raw >= 30) { label = 'Obese';       color = '#ef4444'; }
    else if (raw >= 25) { label = 'Overweight';  color = '#f59e0b'; }
    return { bmi: raw > 0 ? raw.toFixed(1) : '—', bmiLbl: label, bmiColor: color };
  }, [form.height, form.weight]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const extractError = async (err, label) => {
    let detail = '';
    if (err?.response) {
      detail = err.response.data?.detail || err.response.data?.message
             || JSON.stringify(err.response.data);
    } else if (err instanceof Response || err?.json) {
      try { const j = await err.json(); detail = j.detail || j.message || JSON.stringify(j); }
      catch { detail = err.statusText || ''; }
    }
    const msg = detail || err?.message || 'Unknown error';
    console.error(`[Profile] ❌ ${label} failed →`, msg, err);
    return `${label}: ${msg}`;
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e?.preventDefault();

    if (!form.firstName.trim()) { toast({ message: 'First name is required',         type: 'warning' }); return; }
    if (!form.lastName.trim())  { toast({ message: 'Last name is required',          type: 'warning' }); return; }
    if (!validateEmail(form.email)) { toast({ message: 'Please enter a valid email', type: 'warning' }); return; }
    if (form.height     && validateHeight(form.height))     { toast({ message: validateHeight(form.height),     type: 'warning' }); return; }
    if (form.weight     && validateWeight(form.weight))     { toast({ message: validateWeight(form.weight),     type: 'warning' }); return; }
    if (form.goalWeight && validateWeight(form.goalWeight)) { toast({ message: validateWeight(form.goalWeight), type: 'warning' }); return; }
    if (form.bodyFat    && validateBodyFat(form.bodyFat))   { toast({ message: validateBodyFat(form.bodyFat),   type: 'warning' }); return; }

    // Capture typed values BEFORE any async work — these are ground truth
    const savedWeight     = form.weight;
    const savedHeight     = form.height;
    const savedGoalWeight = form.goalWeight;
    const pendingCondition = newCondition.trim();
    const pendingAllergy = newAllergy.trim();
    const conditionsToSave = pendingCondition
      ? [...conditions, { name: pendingCondition, detail: 'Added recently', status: 'Active' }]
      : conditions;
    const allergiesToSave = pendingAllergy ? [...allergies, pendingAllergy] : allergies;

    setIsSaving(true);
    setIsSyncBlocked(true);

    try {
      // ── STEP 1 — Update main user record ────────────────────────────────
      const userPayload = {
        first_name:   form.firstName.trim(),
        last_name:    form.lastName.trim(),
        email:        form.email.trim(),
        phone_number: form.phoneNumber?.trim() ?? '',
      };
      if (form.location?.trim())  userPayload.location           = form.location.trim();
      if (form.dob)               userPayload.date_of_birth      = form.dob;
      if (form.gender)            userPayload.gender             = form.gender;
      if (form.goalDesc?.trim())  userPayload.goal_desc          = form.goalDesc.trim();
      if (form.goalType)          userPayload.goal_type          = form.goalType;
      if (form.dietStyle)         userPayload.diet_style         = form.dietStyle;
      if (form.activityLevel)     userPayload.activity_level     = form.activityLevel;
      if (savedHeight)            userPayload.height             = parseFloat(savedHeight);
      if (savedWeight)            userPayload.weight             = parseFloat(savedWeight);
      if (savedGoalWeight)        userPayload.goal_weight        = parseFloat(savedGoalWeight);
      if (form.bodyFat)           userPayload.body_fat           = parseFloat(form.bodyFat);
      if (form.sleepTargetHours)  userPayload.sleep_target_hours = parseFloat(form.sleepTargetHours);

      userPayload.medical_conditions = conditionsToSave.map(({ name, detail, status }) =>
        ({ name: name || '', detail: detail || '', status: status || 'Active' })
      );
      userPayload.medications = meds.map(({ name, detail }) =>
        ({ name: name || '', detail: detail || '' })
      );
      userPayload.allergies = allergiesToSave.filter(Boolean);

      console.log('[Profile] STEP 1 — updateProfile payload:', userPayload);
      await updateProfile(userPayload);
      console.log('[Profile] STEP 1 — OK');

      // ── STEP 2 — Update profiles app record ─────────────────────────────
      try {
        const profilePayload = {};
        if (savedHeight)     profilePayload.height_cm      = parseFloat(savedHeight);
        if (savedGoalWeight) profilePayload.goal_weight_kg = parseFloat(savedGoalWeight);

        if (Object.keys(profilePayload).length > 0) {
          console.log('[Profile] STEP 2 — profileApi.updateProfile payload:', profilePayload);
          await profileApi.updateProfile(profilePayload);
          console.log('[Profile] STEP 2 — OK');
        } else {
          console.log('[Profile] STEP 2 — skipped');
        }
      } catch (err) {
        const msg = await extractError(err, 'Update profile record');
        console.warn('[Profile] STEP 2 non-fatal:', msg);
        toast({ message: `Note: ${msg}`, type: 'warning' });
      }

      // ── STEP 3 — Log weight entry (triggers Django signal) ───────────────
      if (savedWeight) {
        try {
          const today    = new Date().toISOString().split('T')[0];
          const history  = await profileApi.getWeightHistory();
          const list     = Array.isArray(history) ? history : [];
          const existing = list.find(entry => entry.date === today);
          console.log('[Profile] STEP 3 — today:', today, 'existing:', existing);
          if (existing) {
            await profileApi.updateWeight(existing.id, { weight_kg: parseFloat(savedWeight) });
          } else {
            await profileApi.logWeight({ date: today, weight_kg: parseFloat(savedWeight) });
          }
          console.log('[Profile] STEP 3 — OK');
        } catch (err) {
          const msg = await extractError(err, 'Log weight');
          console.warn('[Profile] STEP 3 non-fatal:', msg);
        }
      }

      // ── STEP 4 — Persist to context/localStorage + refresh form ──────────
      // We do NOT trust freshProfile.current_weight_kg — the Django signal
      // that updates that field may not have run yet. We patch it with the
      // value the user typed so both the form and localStorage stay correct
      // across refreshes and page navigations.
      try {
        const [freshUser, freshProfile] = await Promise.all([
          getMyProfile(),
          profileApi.getProfile(),
        ]);
        console.log('[Profile] STEP 4 — freshUser:', freshUser);
        console.log('[Profile] STEP 4 — freshProfile:', freshProfile);

        const patchedProfile = {
          ...freshProfile,
          current_weight_kg: savedWeight     ? parseFloat(savedWeight)     : freshProfile?.current_weight_kg,
          height_cm:         savedHeight     ? parseFloat(savedHeight)     : freshProfile?.height_cm,
          goal_weight_kg:    savedGoalWeight ? parseFloat(savedGoalWeight) : freshProfile?.goal_weight_kg,
        };

        // updateWeight writes to both in-memory context AND localStorage (fixed in AuthContext)
        updateUserState(freshUser);
        if (savedWeight) updateWeight(parseFloat(savedWeight));

        setProfile(patchedProfile);
        syncFormFromUser(freshUser, patchedProfile);

      } catch (err) {
        const msg = await extractError(err, 'Re-fetch profile');
        console.warn('[Profile] STEP 4 non-fatal:', msg);
        // Fallback: at minimum keep the typed values visible
        setForm(p => ({
          ...p,
          weight:     savedWeight     || p.weight,
          height:     savedHeight     || p.height,
          goalWeight: savedGoalWeight || p.goalWeight,
        }));
      }

      if (pendingCondition) setNewCondition('');
      if (pendingAllergy) setNewAllergy('');
      if (pendingCondition || pendingAllergy) {
        setConditions(conditionsToSave);
        setAllergies(allergiesToSave);
      }

      toast({ message: 'Profile updated successfully!', type: 'success' });
      setIsEditing(false);
    } catch (err) {
      const msg = await extractError(err, 'Update user');
      toast({ message: msg, type: 'error' });
    } finally {
      setIsSaving(false);
      setIsSyncBlocked(false);
    }
  };

  const tabs = [
    { id: 'personal', label: 'Personal', Icon: User     },
    { id: 'physical', label: 'Physical', Icon: Activity },
    { id: 'medical',  label: 'Medical',  Icon: Heart    },
    { id: 'security', label: 'Security', Icon: Lock     },
  ];

  if (!user || isLoadingProfile)
    return <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>Synchronizing…</div>;

  const statVal = (v, unit = '') => {
    const n = parseFloat(v);
    if (!v || isNaN(n) || n === 0) return '—';
    return `${n}${unit}`;
  };

  return (
    <div className="pf">
      <style>{CSS}</style>

      {/* Hero */}
      <div className="pf-hero">
        <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
          {profilePictureUrl ? (
            <img
              src={profilePictureUrl}
              alt={user?.name || 'User'}
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1px solid rgba(0,0,0,.08)',
                background: '#fff',
              }}
            />
          ) : (
            <div className="pf-avatar">{initials}</div>
          )}

          <input
            id="user-photo-input"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => onPickProfilePhoto(e.target.files?.[0] || null)}
          />
          <button
            type="button"
            disabled={photoSaving}
            onClick={() => document.getElementById('user-photo-input')?.click()}
            aria-label="Change profile photo"
            style={{
              position: 'absolute',
              right: -4,
              bottom: -4,
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: '1px solid rgba(0,0,0,.10)',
              background: 'white',
              boxShadow: '0 6px 16px rgba(0,0,0,.10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: photoSaving ? 'not-allowed' : 'pointer',
              opacity: photoSaving ? 0.65 : 1,
            }}
          >
            <Camera size={14} color="#64748b" />
          </button>
        </div>
        <div className="pf-hero-info">
          <div className="pf-hero-name">{form.firstName} {form.lastName}</div>
          <div className="pf-hero-sub">{form.gender}{form.location ? ` · ${form.location}` : ''}</div>
        </div>
        <div className="pf-hero-stats">
          {[
            { val: bmi !== '—' ? bmi : '—',       lbl: 'BMI',         color: bmiColor },
            { val: statVal(form.weight,    ' kg'),  lbl: 'Weight'                       },
            { val: statVal(form.goalWeight,' kg'),  lbl: 'Goal Weight'                  },
            { val: statVal(form.bodyFat,   '%'),    lbl: 'Body Fat'                     },
          ].map((s, i) => (
            <div key={i} className="pf-hero-stat">
              <div className="pf-hero-stat-val" style={s.color ? { color: s.color } : {}}>{s.val}</div>
              <div className="pf-hero-stat-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>
        <button className={`pf-edit-btn ${isEditing ? 'editing' : 'viewing'}`} onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? 'Cancel' : 'Edit profile'}
        </button>
        <button className="pf-edit-btn viewing" onClick={handleLogout}
          style={{ display:'flex', alignItems:'center', gap:'6px', color:'#dc2626', borderColor:'#fecaca' }}>
          <LogOut size={15} /> Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="pf-tabs">
        {tabs.map(t => {
          const TabIcon = t.Icon;
          return (
            <button key={t.id} className={`pf-tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>
              <TabIcon size={15} />{t.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSave}>

        {/* PERSONAL */}
        {tab === 'personal' && (
          <div className="pf-card">
            <div className="pf-card-title">Personal Information</div>
            <div className="pf-grid-2">
              <Field name="firstName"   label="First Name"    isEditing={isEditing} form={form} set={set} />
              <Field name="lastName"    label="Last Name"     isEditing={isEditing} form={form} set={set} />
              <Field name="email"       label="Email Address" type="email" isEditing={isEditing} form={form} set={set} />
              <Field name="phoneNumber" label="Phone Number"  type="tel"   isEditing={isEditing} form={form} set={set} />
              <Field name="location"    label="Location"      isEditing={isEditing} form={form} set={set} />
              <Field name="dob"       label="Date of Birth" type="date" isEditing={isEditing} form={form} set={set} />
              <Field name="gender"    label="Gender" type="select"
                opts={['Female','Male','Non-binary','Prefer not to say']}
                isEditing={isEditing} form={form} set={set} />
            </div>
          </div>
        )}

        {/* PHYSICAL */}
        {tab === 'physical' && (
          <>
            <div className="pf-card">
              <div className="pf-card-title">Body Measurements</div>
              <div className="pf-grid-2">
                <Field name="height"     label="Height (cm)"         type="number" isEditing={isEditing} form={form} set={set} />
                <Field name="weight"     label="Current Weight (kg)" type="number" isEditing={isEditing} form={form} set={set} />
                <Field name="goalWeight" label="Goal Weight (kg)"    type="number" isEditing={isEditing} form={form} set={set} />
                <Field name="bodyFat"    label="Body Fat (%)"        type="number" isEditing={isEditing} form={form} set={set} />
              </div>
              <div className="pf-bmi-row">
                <div className="pf-bmi-val" style={{ color: bmiColor }}>{bmi}</div>
                <div className="pf-bmi-info">
                  <div className="pf-bmi-label">Body Mass Index</div>
                  <div className="pf-bmi-status" style={{ color: bmiColor }}>{bmiLbl}</div>
                </div>
              </div>
            </div>

            <div className="pf-card" style={{ marginTop: 14 }}>
              <div className="pf-card-title">Goals & Lifestyle</div>
              <div className="pf-goal-grid">
                <div className="pf-goal-item">
                  <div className="pf-goal-item-label">Goal Type</div>
                  {isEditing
                    ? <select className="pf-select" value={form.goalType} onChange={e => set('goalType', e.target.value)}>
                        {GOAL_TYPES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    : <div className="pf-goal-item-val">{form.goalType || '—'}</div>
                  }
                </div>
                <div className="pf-goal-item">
                  <div className="pf-goal-item-label">Diet Style</div>
                  {isEditing
                    ? <select className="pf-select" value={form.dietStyle} onChange={e => set('dietStyle', e.target.value)}>
                        {DIET_STYLES.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    : <div className="pf-goal-item-val">{form.dietStyle || '—'}</div>
                  }
                </div>
                <div className="pf-goal-item">
                  <div className="pf-goal-item-label">Activity Level</div>
                  {isEditing
                    ? <select className="pf-select" value={form.activityLevel} onChange={e => set('activityLevel', e.target.value)}>
                        {ACTIVITY_LVLS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    : <span className="pf-activity-badge"><Activity size={13} />{form.activityLevel || '—'}</span>
                  }
                </div>
                <div className="pf-goal-item">
                  <div className="pf-goal-item-label">Sleep target (hours)</div>
                  {isEditing
                    ? <input className="pf-input" type="number" min={4} max={12} step={0.5}
                        value={form.sleepTargetHours}
                        onChange={e => set('sleepTargetHours', parseFloat(e.target.value) || 0)} />
                    : <div className="pf-goal-item-val">
                        {form.sleepTargetHours != null ? `${form.sleepTargetHours} h` : '—'}
                      </div>
                  }
                </div>
              </div>
              <div className="pf-section-divider" />
              <div className="pf-field-label" style={{ marginBottom: 8 }}>Goal Description</div>
              {isEditing
                ? <input className="pf-input" value={form.goalDesc}
                    onChange={e => set('goalDesc', e.target.value)}
                    placeholder="e.g. Lose 8 kg in 4 months" />
                : <div className="pf-field-val"
                    style={{ fontStyle: form.goalDesc ? 'normal' : 'italic', color: form.goalDesc ? '#0f172a' : '#94a3b8' }}>
                    {form.goalDesc || 'No goal set'}
                  </div>
              }
            </div>
          </>
        )}

        {/* MEDICAL */}
        {tab === 'medical' && (
          <>
            <div className="pf-grid-med">
              <div className="pf-card">
                <div className="pf-card-title">Medical Conditions</div>
                {isEditing && (
                  <div className="pf-add-row">
                    <input className="pf-add-input" value={newCondition}
                      onChange={e => setNewCondition(e.target.value)}
                      placeholder="Add condition…"
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); }
                      }} />
                    <button type="button" className="pf-add-btn-sm" onClick={() => {
                      if (!newCondition.trim()) return;
                      setConditions(c => [...c, { name: newCondition.trim(), detail: 'Added recently', status: 'Active' }]);
                      setNewCondition('');
                      toast({ message: 'Condition added', type: 'success' });
                    }}>+ Add</button>
                  </div>
                )}
                {conditions.length === 0
                  ? <div style={{ color: '#94a3b8', fontSize: 13 }}>None listed.</div>
                  : conditions.map((c, idx) => (
                      <div key={idx} className="pf-med-item">
                        <div>
                          <div className="pf-med-item-nm">{c.name}</div>
                          {c.detail && <div className="pf-med-item-dt">{c.detail}</div>}
                        </div>
                        {isEditing && (
                          <button type="button" className="pf-med-remove"
                            onClick={() => setConditions(prev => prev.filter((_, i) => i !== idx))}>×</button>
                        )}
                      </div>
                    ))
                }
              </div>

              <div className="pf-card">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
                  <div className="pf-card-title" style={{ marginBottom: 0 }}>Current Medications</div>
                  {isEditing && (
                    <button type="button" className="pf-add-btn-sm"
                      style={{ padding:'0 14px', height:34, fontSize:12 }}
                      onClick={() => {
                        const name = prompt('Medication name');
                        if (!name?.trim()) return;
                        const detail = prompt('Dosage & schedule') || 'As prescribed';
                        setMeds(m => [...m, { name: name.trim(), detail }]);
                        toast({ message: 'Medication added', type: 'success' });
                      }}>+ Add</button>
                  )}
                </div>
                {meds.length === 0
                  ? <div style={{ color: '#94a3b8', fontSize: 13 }}>None listed.</div>
                  : meds.map((m, idx) => (
                      <div key={idx} className="pf-med-item">
                        <div>
                          <div className="pf-med-item-nm">{m.name}</div>
                          {m.detail && <div className="pf-med-item-dt">{m.detail}</div>}
                        </div>
                        {isEditing && (
                          <button type="button" className="pf-med-remove"
                            onClick={() => setMeds(prev => prev.filter((_, i) => i !== idx))}>×</button>
                        )}
                      </div>
                    ))
                }
              </div>
            </div>

            <div className="pf-card" style={{ marginTop: 14 }}>
              <div className="pf-card-title">Allergies & Intolerances</div>
              {isEditing && (
                <div className="pf-add-row">
                  <input className="pf-add-input" value={newAllergy}
                    onChange={e => setNewAllergy(e.target.value)}
                    placeholder="Add allergy or intolerance…"
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); }
                    }} />
                  <button type="button" className="pf-add-btn-sm" onClick={() => {
                    if (!newAllergy.trim()) return;
                    setAllergies(a => [...a, newAllergy.trim()]);
                    setNewAllergy('');
                    toast({ message: 'Allergy added', type: 'success' });
                  }}>+ Add</button>
                </div>
              )}
              {allergies.length === 0
                ? <div style={{ color: '#94a3b8', fontSize: 13 }}>None listed.</div>
                : <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {allergies.map((a, idx) => (
                      <span key={idx} className="pf-tag pf-tag-amber">
                        {a}
                        {isEditing && (
                          <button type="button" className="pf-tag-remove"
                            onClick={() => setAllergies(prev => prev.filter((_, i) => i !== idx))}>×</button>
                        )}
                      </span>
                    ))}
                  </div>
              }
            </div>
          </>
        )}

        {/* SECURITY */}
        {tab === 'security' && (
          <div className="pf-security-wrap">
            <div className="pf-card">
              <div className="pf-card-title">Change Password</div>
              {['current','next','confirm'].map(key => (
                <div key={key} className="pf-pw-field">
                  <div className="pf-pw-label">
                    {key === 'current' ? 'Current Password' : key === 'next' ? 'New Password' : 'Confirm New Password'}
                  </div>
                  <input type="password" className="pf-input" value={passwordForm[key]}
                    onChange={e => setPasswordForm(p => ({ ...p, [key]: e.target.value }))} />
                </div>
              ))}
              <button type="button" className="pf-pw-submit" onClick={() => {
                if (passwordForm.next !== passwordForm.confirm)
                  return toast({ message: 'Passwords do not match', type: 'warning' });
                toast({ message: 'Password updated', type: 'success' });
                setPasswordForm({ current:'', next:'', confirm:'' });
              }}>Update Password</button>
            </div>
          </div>
        )}

        {isEditing && (
          <div className="pf-save-row">
            <button type="submit" className="pf-save-btn" disabled={isSaving}>
              <Save size={15} />{isSaving ? 'Saving…' : 'Save Changes'}
            </button>
            <button type="button" className="pf-cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        )}
      </form>
    </div>
  );
}