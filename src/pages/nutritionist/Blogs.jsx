import { useState } from "react";
import { blogsApi } from "../../services/api";

const card = {
  background: 'white',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-lg)',
  boxShadow: 'var(--shadow-sm)',
  padding: 22,
};

const label = {
  display: 'block',
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--gray-600)',
  textTransform: 'uppercase',
  letterSpacing: '.08em',
  marginBottom: 8,
};

const input = {
  width: '100%',
  minHeight: 44,
  padding: '11px 14px',
  borderRadius: 'var(--r-md)',
  border: '1px solid var(--border)',
  background: 'white',
  color: 'var(--ink-3)',
  fontFamily: 'inherit',
  fontSize: 14,
  boxSizing: 'border-box',
  marginBottom: 16,
};

const button = {
  background: 'linear-gradient(135deg, #065f46, #10b981)',
  color: 'white',
  border: 'none',
  borderRadius: '999px',
  padding: '12px 18px',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 14,
};

export default function Blogs() {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handlePublish = async () => {
    if (!title.trim() || !content.trim()) {
      setMessage("Please add a title and content before publishing.");
      return;
    }
    setSubmitting(true);
    try {
      await blogsApi.create({
        title: title.trim(),
        excerpt: summary.trim(),
        content: content.trim(),
        image,
      });
      setMessage("Post submitted for admin review. It will appear publicly after approval.");
      setTitle("");
      setSummary("");
      setContent("");
      setImage(null);
    } catch (error) {
      setMessage(error?.message || "Failed to submit blog post.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', width: '100%', padding: '0 16px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={card}>
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.1 }}>Blog Posts</h1>
            <p style={{ marginTop: 8, color: 'var(--gray-600)', fontSize: 15 }}>Write nutrition articles, share patient tips, and publish content for your audience.</p>
          </div>

          <div>
            <label style={label} htmlFor="blog-title">Post Title</label>
            <input
              id="blog-title"
              style={input}
              value={title}
              placeholder="Enter a strong blog title"
              onChange={(e) => setTitle(e.target.value)}
            />

            <label style={label} htmlFor="blog-summary">Summary</label>
            <textarea
              id="blog-summary"
              style={{ ...input, minHeight: 96, resize: 'vertical' }}
              value={summary}
              placeholder="Add a short summary or subtitle"
              onChange={(e) => setSummary(e.target.value)}
            />

            <label style={label} htmlFor="blog-content">Content</label>
            <textarea
              id="blog-content"
              style={{ ...input, minHeight: 240, resize: 'vertical' }}
              value={content}
              placeholder="Write the full blog content here..."
              onChange={(e) => setContent(e.target.value)}
            />

            <label style={label} htmlFor="blog-image">Featured Image</label>
            <input
              id="blog-image"
              type="file"
              accept="image/*"
              style={input}
              onChange={(e) => setImage(e.target.files?.[0] || null)}
            />

            {message && (
              <div style={{ marginBottom: 14, color: 'var(--green-700)', fontWeight: 600 }}>{message}</div>
            )}

            <button type="button" style={button} onClick={handlePublish} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit for Review"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
