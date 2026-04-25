import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../../components/layout/Toast';
import { useModalA11y } from '../../hooks/useModalA11y';
import { consultationsApi } from '../../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIME_SLOTS = ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM'];

// Display label  →  backend slug
const SESSION_TYPE_MAP = {
  'Monthly Check-In':   'monthly_checkin',
  'Diet Plan Review':   'diet_plan_review',
  'Initial Assessment': 'initial_assessment',
  'Progress Review':    'progress_review',
  'Other':              'other',
};

// Time slot  →  24h string for ISO datetime
const TIME_TO_24H = {
  '9:00 AM':  '09:00',
  '10:00 AM': '10:00',
  '11:00 AM': '11:00',
  '2:00 PM':  '14:00',
  '3:00 PM':  '15:00',
  '4:00 PM':  '16:00',
};

const STORAGE_KEY = 'consultationBookingDraft';

// ─── Helper: safely unwrap paginated OR plain-list API responses ──────────────
// Django REST Framework with pagination returns { count, results: [...] }.
// Without pagination it returns [...] directly.
// Both shapes must work without crashing.
function unwrapList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

// ─── Draft helpers ────────────────────────────────────────────────────────────

function parseConsultationDraft(raw) {
  if (raw == null || raw === '') return null;
  let data;
  try { data = JSON.parse(raw); } catch { return null; }
  if (!data || typeof data !== 'object') return null;
  let step = Number(data.step);
  if (!Number.isFinite(step)) step = 1;
  step = Math.min(3, Math.max(1, Math.round(step)));
  const date = typeof data.date === 'string' ? data.date : '';
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const time = typeof data.time === 'string' ? data.time : '';
  if (time && !TIME_SLOTS.includes(time)) return null;
  const sessionType = typeof data.sessionType === 'string' ? data.sessionType : '';
  const notes = typeof data.notes === 'string' ? data.notes.slice(0, 500) : '';
  return { step, date, time, sessionType, notes };
}

let _consultDraftOnce;
function readConsultDraftOnce() {
  if (_consultDraftOnce !== undefined) return _consultDraftOnce;
  if (typeof window === 'undefined') { _consultDraftOnce = null; return null; }
  const raw = localStorage.getItem(STORAGE_KEY);
  const parsed = parseConsultationDraft(raw);
  if (!parsed && raw) localStorage.removeItem(STORAGE_KEY);
  _consultDraftOnce = parsed;
  return parsed;
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function formatSessionForDisplay(consultation) {
  const dt = new Date(consultation.scheduled_at);
  return {
    id:       consultation.id,
    type:     consultation.session_type_display || consultation.session_type,
    day:      dt.getDate().toString(),
    mo:       dt.toLocaleDateString('en-US', { month: 'short' }),
    datetime: `${dt.toLocaleDateString('en-US', { weekday: 'short' })}, ${
      dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    } · ${consultation.duration_minutes} min`,
    status:       consultation.status_display || consultation.status,
    statusRaw:    consultation.status,
    zoom_link:    consultation.zoom_link || null,
    nutritionist: consultation.nutritionist_detail?.name || 'Dr. Lisa Chen',
  };
}

function formatPastForDisplay(consultation) {
  const dt = new Date(consultation.scheduled_at);
  return {
    id:     consultation.id,
    date:   dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    type:   consultation.session_type_display || consultation.session_type,
    status: consultation.status_display || consultation.status,
    statusRaw: consultation.status,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ConsultationContent() {
  const toast    = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [upcoming, setUpcoming]   = useState([]);
  const [past,     setPast]       = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Booking modal state ─────────────────────────────────────────────────────
  const [bookOpen,      setBookOpen]      = useState(false);
  const [step,          setStep]          = useState(() => readConsultDraftOnce()?.step ?? 1);
  const [selectedDate,  setSelectedDate]  = useState(() => readConsultDraftOnce()?.date ?? '');
  const [selectedTime,  setSelectedTime]  = useState(() => readConsultDraftOnce()?.time ?? '');
  const [sessionType,   setSessionType]   = useState(() => readConsultDraftOnce()?.sessionType ?? '');
  const [notes,         setNotes]         = useState(() => readConsultDraftOnce()?.notes ?? '');
  const [isConfirming,  setIsConfirming]  = useState(false);

  const closeBook = useCallback(() => { setBookOpen(false); setStep(1); }, []);
  const bookModalRef = useModalA11y(bookOpen, closeBook);

  // ── Load sessions from backend ──────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    try {
      const [upcomingData, pastData] = await Promise.all([
        consultationsApi.upcoming(),
        consultationsApi.past(),
      ]);

      // FIX: unwrap paginated responses { count, results: [...] } OR plain arrays.
      // Previously (upcomingData || []).map() would iterate over object keys when
      // pagination was enabled, producing objects with no .id → duplicate React keys.
      setUpcoming(unwrapList(upcomingData).map(formatSessionForDisplay));
      setPast(unwrapList(pastData).map(formatPastForDisplay));
    } catch (err) {
      toast({ message: 'Failed to load sessions', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  // ── Auto-save draft ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!bookOpen) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      step, date: selectedDate, time: selectedTime, sessionType, notes,
    }));
  }, [bookOpen, step, selectedDate, selectedTime, sessionType, notes]);

  // ── Open modal from URL param ?book=1 ───────────────────────────────────────
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    if (sp.get('book') === '1') {
      setBookOpen(true); setStep(1);
      setSelectedDate(''); setSelectedTime(''); setSessionType(''); setNotes('');
    }
  }, [location.search]);

  const openBook = () => {
    setBookOpen(true); setStep(1);
    setSelectedDate(''); setSelectedTime(''); setSessionType(''); setNotes('');
  };

  // ── Step validation ─────────────────────────────────────────────────────────
  const nextStep = () => {
    if (step === 1) {
      if (!selectedDate) { toast({ message: 'Please select a date.', type: 'warning' }); return; }
      if (selectedDate < new Date().toISOString().split('T')[0]) {
        toast({ message: 'Please choose today or a future date.', type: 'warning' }); return;
      }
      if (!selectedTime) { toast({ message: 'Please choose a time slot.', type: 'warning' }); return; }
      if (!sessionType)  { toast({ message: 'Please select a session type.', type: 'warning' }); return; }
    }
    setStep(s => s + 1);
  };

  // ── Book — calls real API ───────────────────────────────────────────────────
  const handleBook = async () => {
    if (!selectedDate || !selectedTime || !sessionType) {
      toast({ message: 'Booking data is incomplete.', type: 'warning' });
      return;
    }

    const time24 = TIME_TO_24H[selectedTime];

    // FIX: The root cause of the 400 errors.
    //
    // Before: `${selectedDate}T${time24}:00`
    //   → produces "2026-05-01T14:00:00" — a TIMEZONE-NAIVE string.
    //   Django's validate_scheduled_at calls timezone.now() which is timezone-AWARE.
    //   Comparing aware vs naive raises TypeError → DRF returns 400.
    //
    // Fix: append "Z" to make it an explicit UTC datetime string.
    //   "2026-05-01T14:00:00Z" is timezone-aware and Django accepts it cleanly.
    //   The serializer's make_aware() logic then becomes a no-op safety net.
    const scheduledAt = `${selectedDate}T${time24}:00Z`;

    setIsConfirming(true);
    try {
      await consultationsApi.book({
        scheduled_at:     scheduledAt,
        duration_minutes: 30,
        session_type:     SESSION_TYPE_MAP[sessionType] || 'other',
        topic:            sessionType,
        notes:            notes || '',
        is_premium:       false,
        // nutritionist omitted → backend auto-assigns
      });

      toast({ message: '✓ Booking confirmed! Zoom link sent to your email.', type: 'success', duration: 4500 });
      localStorage.removeItem(STORAGE_KEY);
      closeBook();
      await loadSessions();
    } catch (err) {
      // Show the actual backend error message (e.g. "Please choose a future date and time")
      toast({ message: err.message || 'Booking failed. Please try again.', type: 'error' });
    } finally {
      setIsConfirming(false);
    }
  };

  // ── Cancel session ──────────────────────────────────────────────────────────
  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this session?')) return;
    try {
      await consultationsApi.cancel(id);
      toast({ message: 'Session cancelled.', type: 'info' });
      await loadSessions();
    } catch (err) {
      toast({ message: err.message || 'Could not cancel session.', type: 'error' });
    }
  };

  const stepLabels = ['Date & Time', 'Notes', 'Confirm'];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="consultation-page">

      {/* ── Upcoming + Nutritionist card ── */}
      <div className="g21" style={{ marginBottom: 24 }}>

        {/* Upcoming sessions */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div className="card-title">Upcoming Sessions</div>
            <span className="badge badge-blue">{upcoming.length} scheduled</span>
          </div>

          {isLoading ? (
            <div style={{ color: 'var(--ink-5)', fontSize: 13, padding: '12px 0' }}>Loading…</div>
          ) : upcoming.length === 0 ? (
            <div style={{ color: 'var(--ink-5)', fontSize: 13, padding: '12px 0' }}>
              No upcoming sessions.{' '}
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--g2)', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
                onClick={openBook}
              >
                Book one now →
              </button>
            </div>
          ) : (
            upcoming.map(s => (
              <div
                key={s.id}
                className="session-card"
                style={s.statusRaw === 'confirmed' ? { borderLeft: '3px solid var(--g2)' } : {}}
              >
                <div className="session-date">
                  <div className="session-day">{s.day}</div>
                  <div className="session-mo">{s.mo}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{s.type}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-5)', marginTop: 2 }}>
                    {s.datetime} · {s.nutritionist}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <span className="badge badge-green">Zoom</span>
                    <span className={`badge badge-${s.statusRaw}`}>{s.status}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {s.statusRaw === 'confirmed' && (
                    <button
                      type="button"
                      className="btn btn-prim btn-sm"
                      onClick={() => {
                        if (s.zoom_link) window.open(s.zoom_link, '_blank');
                        else toast({ message: 'Zoom link not available yet.', type: 'info' });
                      }}
                    >
                      Join Zoom
                    </button>
                  )}
                  {s.statusRaw !== 'cancelled' && s.statusRaw !== 'completed' && (
                    <button
                      type="button"
                      className="btn btn-sec btn-sm"
                      onClick={() => handleCancel(s.id)}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Nutritionist card */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 14 }}>Your Nutritionist</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: 14, background: 'var(--g-light)',
            borderRadius: 'var(--r-lg)', marginBottom: 16,
            border: '1px solid var(--g-mid)',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'linear-gradient(135deg,var(--g1),var(--g2))',
              color: '#fff', fontWeight: 700, fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>LC</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Dr. Lisa Chen</div>
              <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>Clinical Nutritionist · 8 yrs exp</div>
              <div style={{ fontSize: 12, color: '#d97706', marginTop: 2 }}>⭐ 4.9 · 127 consultations</div>
            </div>
          </div>
          <button type="button" className="btn btn-prim" style={{ width: '100%', marginBottom: 8 }} onClick={openBook}>
            Book New Session
          </button>
          <button className="btn btn-sec btn-sm" style={{ width: '100%' }} onClick={() => navigate('/user/messages')}>
            Send Message
          </button>
        </div>
      </div>

      {/* ── Session history ── */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 16 }}>Session History</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Date</th>
                <th>Session Type</th>
                <th>Nutritionist</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} style={{ color: 'var(--ink-5)', fontSize: 13 }}>Loading…</td></tr>
              ) : past.length === 0 ? (
                <tr><td colSpan={4} style={{ color: 'var(--ink-5)', fontSize: 13 }}>No past sessions yet.</td></tr>
              ) : (
                past.map(row => (
                  <tr key={row.id}>
                    <td>{row.date}</td>
                    <td>{row.type}</td>
                    <td>Dr. Lisa Chen</td>
                    <td>
                      <span className={`badge badge-${row.statusRaw === 'completed' ? 'green' : row.statusRaw}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Booking Modal ── */}
      {bookOpen && (
        <div
          ref={bookModalRef}
          className="modal-bg open"
          onClick={e => e.target === e.currentTarget && closeBook()}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="consultation-modal-title"
            style={{ width: 620, maxWidth: 'calc(100vw - 32px)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-head">
              <div className="modal-title" id="consultation-modal-title">
                Book a Session with Dr. Lisa Chen
              </div>
              <button type="button" className="modal-close" onClick={closeBook} aria-label="Close">✕</button>
            </div>

            {/* Step progress bar */}
            <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', background: 'var(--ink-9)' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {stepLabels.map((label, i) => {
                  const num    = i + 1;
                  const done   = num < step;
                  const active = num === step;
                  return (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < stepLabels.length - 1 ? 1 : 'none' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: done ? 'var(--g2)' : active ? 'var(--g1)' : 'var(--ink-7)',
                          color: done || active ? '#fff' : 'var(--ink-5)',
                          fontSize: 12, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {done ? '✓' : num}
                        </div>
                        <div style={{ fontSize: 9, marginTop: 4, color: active ? 'var(--g-text)' : 'var(--ink-5)', fontWeight: active ? 700 : 500 }}>
                          {label}
                        </div>
                      </div>
                      {i < stepLabels.length - 1 && (
                        <div style={{ flex: 1, height: 2, background: done ? 'var(--g2)' : 'var(--ink-7)', margin: '0 8px', marginBottom: 18 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ padding: '24px' }}>

              {/* Step 1 — Date, Time & Session Type */}
              {step === 1 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Select date and time</div>
                  <div className="fg">
                    <label className="inp-label">Preferred Date</label>
                    <input
                      type="date" className="inp"
                      value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="fg">
                    <label className="inp-label">Available Time Slots</label>
                    <div className="time-grid">
                      {TIME_SLOTS.map(t => (
                        <button
                          key={t} type="button"
                          className={`time-slot${selectedTime === t ? ' selected' : ''}`}
                          onClick={() => setSelectedTime(t)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="fg">
                    <label className="inp-label">Session Type</label>
                    <select className="inp" value={sessionType} onChange={e => setSessionType(e.target.value)}>
                      <option value="">Select session type...</option>
                      {Object.keys(SESSION_TYPE_MAP).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Step 2 — Notes */}
              {step === 2 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Notes</div>
                  <textarea
                    className="inp" style={{ height: 140 }}
                    maxLength={500}
                    placeholder="Add any notes or topics you want to discuss..."
                    value={notes}
                    onChange={e => setNotes(e.target.value.slice(0, 500))}
                  />
                  <div style={{ textAlign: 'right', fontSize: 11, marginTop: 6, color: notes.length > 450 ? 'var(--red)' : 'var(--ink-5)' }}>
                    {notes.length}/500
                  </div>
                </div>
              )}

              {/* Step 3 — Confirm */}
              {step === 3 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Confirm your booking</div>
                  <div style={{ background: 'var(--g-light)', border: '1px solid var(--g-mid)', borderRadius: 'var(--r-lg)', padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,var(--g1),var(--g2))', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>LC</div>
                      <div>
                        <div style={{ fontWeight: 700 }}>Dr. Lisa Chen</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-5)' }}>Clinical Nutritionist</div>
                      </div>
                    </div>
                    {[
                      { label: 'Session Type', value: sessionType || 'Not selected' },
                      { label: 'Date',         value: selectedDate || 'Not selected' },
                      { label: 'Time',         value: selectedTime || 'Not selected' },
                      { label: 'Platform',     value: 'Zoom' },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,.05)' }}>
                        <span style={{ color: 'var(--ink-5)' }}>{item.label}</span>
                        <span style={{ fontWeight: 600 }}>{item.value}</span>
                      </div>
                    ))}
                    {notes && (
                      <div style={{ marginTop: 16, padding: 14, background: 'white', borderRadius: 8, border: '1px solid var(--g-mid)' }}>
                        <div style={{ fontSize: 12, color: 'var(--ink-5)', marginBottom: 6 }}>Notes</div>
                        <div style={{ fontSize: 14 }}>{notes}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
                {step > 1 && (
                  <button type="button" className="btn btn-sec" onClick={() => setStep(s => s - 1)}>
                    ← Back
                  </button>
                )}
                <div style={{ flex: 1 }} />
                {step < 3 ? (
                  <button type="button" className="btn btn-prim" onClick={nextStep}>
                    Continue →
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-prim"
                    style={{ minWidth: 180 }}
                    onClick={handleBook}
                    disabled={isConfirming}
                  >
                    {isConfirming ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                        Confirming…
                      </span>
                    ) : '✓ Confirm Booking'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}