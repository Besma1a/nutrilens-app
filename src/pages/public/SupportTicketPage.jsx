import { useState } from "react";
import Header from "./Header";
import Footer from "./Footer";
import { supportApi } from "../../services/api";

export default function SupportTicketPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const onChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await supportApi.createTicket({
        name: form.name.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
      });
      setSuccess(`Ticket submitted successfully. Your ticket ID is #${res.ticketId}.`);
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      setError(err?.message || "Could not submit ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="public-page" style={{ background: "#fff" }}>
      <Header />
      <main style={{ paddingTop: 72 }}>
        <section
          style={{
            maxWidth: 820,
            margin: "0 auto",
            padding: "48px 20px 72px",
          }}
        >
          <h1 style={{ margin: "0 0 8px", fontSize: 42, color: "#A50C05", fontFamily: "'Playfair Display', serif", lineHeight: 1.15 }}>
            Contact Support
          </h1>
          <p style={{ margin: "0 0 24px", color: "#666", fontSize: 15 }}>
            Need help? Submit a ticket and our team will get back to you.
          </p>

          <form
            onSubmit={onSubmit}
            style={{
              border: "1px solid #f0ece4",
              borderRadius: 16,
              padding: 24,
              background: "#fff",
              boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => onChange("name", e.target.value)}
                  style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => onChange("email", e.target.value)}
                  style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Message</label>
                <textarea
                  rows={6}
                  value={form.message}
                  onChange={(e) => onChange("message", e.target.value)}
                  style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", fontSize: 14, boxSizing: "border-box", resize: "vertical" }}
                />
              </div>
            </div>

            {error ? <div style={{ marginTop: 14, color: "#b91c1c", fontSize: 13 }}>{error}</div> : null}
            {success ? <div style={{ marginTop: 14, color: "#166534", fontSize: 13, fontWeight: 600 }}>{success}</div> : null}

            <button
              type="submit"
              disabled={submitting}
              style={{
                marginTop: 18,
                border: "none",
                borderRadius: 10,
                padding: "11px 16px",
                fontSize: 14,
                fontWeight: 700,
                background: submitting ? "#9ca3af" : "#2B5726",
                color: "#fff",
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Submitting..." : "Submit Ticket"}
            </button>
          </form>
        </section>
      </main>
      <Footer />
    </div>
  );
}
