import { useCallback, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/layout/Toast";
import { useModalA11y } from "../../hooks/useModalA11y";
import Header from "./Header";
import Footer from "./Footer";

const TESTIMONIALS = [
  { id: 1, name: "Rania M.", role: "Software Engineer", text: "I built healthy habits that finally stick.", result: "12kg lost", rating: 5 },
  { id: 2, name: "Marcus R.", role: "Healthcare Manager", text: "My nutrition routine is now clear and manageable.", result: "Better blood sugar", rating: 4 },
  { id: 3, name: "Jessica L.", role: "Fitness Coach", text: "Meal structure improved my energy and training quality.", result: "Energy +40%", rating: 5 },
  { id: 4, name: "David K.", role: "Executive", text: "Simple planning helped me stay consistent on busy days.", result: "6kg lost", rating: 4 },
  { id: 5, name: "Sarah P.", role: "Student", text: "Healthy eating became affordable and easy to follow.", result: "Budget friendly", rating: 5 },
  { id: 6, name: "Michael T.", role: "Entrepreneur", text: "Tracking progress kept me accountable each week.", result: "91% adherence", rating: 5 },
];

export default function TestimonialsPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: user?.name || "", story: "", rating: 5 });

  const closeFormModal = useCallback(() => setFormOpen(false), []);
  const formModalRef = useModalA11y(formOpen, closeFormModal);

  const filtered = TESTIMONIALS.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.role.toLowerCase().includes(search.toLowerCase()) ||
      t.text.toLowerCase().includes(search.toLowerCase())
  );

  function openShare() {
    setFormOpen(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.story.trim()) {
      toast({ message: "Please fill all required fields", type: "warning" });
      return;
    }
    if (form.story.trim().length < 30) {
      toast({ message: "Story must be at least 30 characters", type: "warning" });
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setFormOpen(false);
      toast({ message: "Story submitted for review. Thank you!", type: "success" });
      setForm({ name: user?.name || "", story: "", rating: 5 });
    }, 800);
  }

  return (
    <div style={{ display: "block", width: "100%", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');

        .tp-page { background:#fff; font-family:'DM Sans', sans-serif; width:100%; display:block; }
        .tp-hero { background:linear-gradient(to bottom,#f9f6f1,#fff); border-bottom:1px solid #f0ece4; padding:90px 24px 56px; margin-top:48px; text-align:center; }
        .tp-hero-inner { max-width:620px; margin:0 auto; }
        .tp-title { font-family:'Playfair Display', serif; font-size:48px; font-weight:800; color:#A50C05; margin:0 0 16px; line-height:1.2; }
        .tp-sub { font-size:16px; color:#777; line-height:1.7; margin:0 0 28px; }
        .tp-hero-actions { display:flex; justify-content:center; gap:10px; flex-wrap:wrap; }
        .tp-search { width:100%; max-width:420px; border:1.5px solid #e8e8e8; border-radius:999px; padding:12px 16px; font-size:14px; }
        .tp-search:focus { outline:none; border-color:#F19335; box-shadow:0 0 0 3px rgba(241,147,53,0.15); }
        .tp-share-btn { border:none; border-radius:999px; background:#2B5726; color:#fff; font-size:14px; font-weight:700; padding:12px 18px; cursor:pointer; }
        .tp-share-btn:hover { background:#234920; }
        .tp-wrap { max-width:1140px; margin:0 auto; padding:56px 24px 80px; }
        .tp-grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:24px; }
        .tp-card { background:#fff; border:1px solid #f0ece4; border-radius:16px; padding:22px; display:flex; flex-direction:column; gap:10px; }
        .tp-chip { display:inline-block; padding:5px 10px; border-radius:999px; border:1px solid #efe8dc; background:#f9f6f1; color:#2B5726; font-size:11px; font-weight:700; }
        .tp-stars { display:flex; gap:2px; }
        .tp-star-display { font-size:15px; line-height:1; }
        .tp-text { color:#666; line-height:1.7; font-size:14px; margin:0; flex:1; }
        .tp-name { color:#2B5726; font-weight:700; font-size:14px; }
        .tp-role { color:#8a8a8a; font-size:12px; }
        .tp-empty { text-align:center; color:#999; padding:48px 0; }
        .tp-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:1000; display:flex; align-items:center; justify-content:center; padding:16px; }
        .tp-modal { width:min(520px,100%); background:#fff; border-radius:16px; border:1px solid #f0ece4; box-shadow:0 20px 50px rgba(0,0,0,0.15); }
        .tp-modal-head { padding:18px 20px; border-bottom:1px solid #f3efe8; display:flex; align-items:center; justify-content:space-between; }
        .tp-modal-title { margin:0; font-family:'Playfair Display', serif; font-size:28px; color:#1a1a1a; }
        .tp-close { border:1px solid #e5e5e5; background:#fff; border-radius:8px; width:32px; height:32px; cursor:pointer; }
        .tp-modal-body { padding:20px; }
        .tp-label { display:block; margin-bottom:6px; font-size:12px; font-weight:700; color:#333; text-transform:uppercase; letter-spacing:0.4px; }
        .tp-field { margin-bottom:14px; }
        .tp-input, .tp-textarea { width:100%; border:1.5px solid #e8e8e8; border-radius:10px; padding:10px 12px; font-size:14px; font-family:'DM Sans', sans-serif; box-sizing:border-box; }
        .tp-input:focus, .tp-textarea:focus { outline:none; border-color:#F19335; box-shadow:0 0 0 3px rgba(241,147,53,0.15); }
        .tp-textarea { min-height:110px; resize:vertical; }
        .tp-rating { display:flex; gap:6px; }
        .tp-star { border:none; background:none; cursor:pointer; font-size:22px; line-height:1; padding:0; }
        .tp-actions { display:flex; gap:8px; margin-top:18px; }
        .tp-btn { flex:1; border-radius:10px; padding:11px 12px; font-size:14px; font-weight:700; cursor:pointer; }
        .tp-btn-cancel { border:1px solid #e8e8e8; background:#fff; color:#555; }
        .tp-btn-submit { border:none; background:#2B5726; color:#fff; }
        .tp-btn-submit:disabled { background:#d6d6d6; cursor:not-allowed; }
        @media (max-width:1024px) { .tp-grid { grid-template-columns:repeat(2, 1fr); } }
        @media (max-width:640px) { .tp-grid { grid-template-columns:1fr; } .tp-title { font-size:36px; } }
      `}</style>

      <Header />

      <div className="tp-page">
        <section className="tp-hero">
          <div className="tp-hero-inner">
            <h1 className="tp-title">Testimonials</h1>
            <p className="tp-sub">Simple success stories from NutriLens members.</p>
            <div className="tp-hero-actions">
              <input
                className="tp-search"
                placeholder="Search testimonials..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="tp-share-btn" onClick={openShare}>Share Your Story</button>
            </div>
          </div>
        </section>

        <section className="tp-wrap">
          {filtered.length ? (
            <div className="tp-grid">
              {filtered.map((t) => (
                <article key={t.id} className="tp-card">
                  <span className="tp-chip">{t.result}</span>
                  <div className="tp-stars">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span key={i} className="tp-star-display" style={{ color: i <= t.rating ? "#F19335" : "#e0e0e0" }}>★</span>
                    ))}
                  </div>
                  <p className="tp-text">"{t.text}"</p>
                  <div>
                    <div className="tp-name">{t.name}</div>
                    <div className="tp-role">{t.role}</div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="tp-empty">No testimonials found.</div>
          )}
        </section>
      </div>
      <Footer />

      {formOpen && (
        <div ref={formModalRef} className="tp-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeFormModal(); }}>
          <div className="tp-modal" role="dialog" aria-modal="true" aria-labelledby="share-story-title" onClick={(e) => e.stopPropagation()}>
            <div className="tp-modal-head">
              <h2 className="tp-modal-title" id="share-story-title">Share Your Story</h2>
              <button className="tp-close" onClick={closeFormModal} aria-label="Close">✕</button>
            </div>
            <div className="tp-modal-body">
              <form onSubmit={handleSubmit}>
                <div className="tp-field">
                  <label className="tp-label">Your Name *</label>
                  <input className="tp-input" type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="tp-field">
                  <label className="tp-label">Your Story *</label>
                  <textarea className="tp-textarea" value={form.story} onChange={(e) => setForm((f) => ({ ...f, story: e.target.value }))} required />
                </div>
                <div className="tp-field">
                  <label className="tp-label">Rating</label>
                  <div className="tp-rating">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button key={i} type="button" className="tp-star" onClick={() => setForm((f) => ({ ...f, rating: i }))} style={{ color: i <= form.rating ? "#F19335" : "#d1d5db" }}>
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <div className="tp-actions">
                  <button type="button" className="tp-btn tp-btn-cancel" onClick={closeFormModal}>Cancel</button>
                  <button type="submit" className="tp-btn tp-btn-submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit Story"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}