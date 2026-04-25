import { useEffect, useRef, useState, useCallback } from 'react';
import { Search } from 'lucide-react';

// ── MOCK DATA ──────────────────────────────────────────────────────────────

const MOCK_CONVERSATIONS = [
  {
    id: 'c1', patientName: 'Sarah Mitchell', initials: 'SM', bg: '#7C3AED',
    preview: 'Thanks for the updated plan!', time: new Date(Date.now() - 5 * 60000).toISOString(), unread: true,
    chat: [
      { id: 'm1', from: 'patient', text: 'Hi! I had a question about my meal plan.', time: new Date(Date.now() - 30 * 60000).toISOString() },
      { id: 'm2', from: 'doctor',  text: 'Of course! What would you like to know?', time: new Date(Date.now() - 28 * 60000).toISOString() },
      { id: 'm3', from: 'patient', text: 'Can I substitute quinoa with brown rice?', time: new Date(Date.now() - 25 * 60000).toISOString() },
      { id: 'm4', from: 'doctor',  text: 'Yes, brown rice is a great substitute. Same portion size applies.', time: new Date(Date.now() - 20 * 60000).toISOString() },
      { id: 'm5', from: 'patient', text: 'Thanks for the updated plan!', time: new Date(Date.now() - 5 * 60000).toISOString() },
    ],
  },
  {
    id: 'c2', patientName: 'James Okafor', initials: 'JO', bg: '#059669',
    preview: 'Logged my meals for today ✅', time: new Date(Date.now() - 40 * 60000).toISOString(), unread: true,
    chat: [
      { id: 'm1', from: 'doctor',  text: 'Hey James! How are you feeling this week?', time: new Date(Date.now() - 2 * 3600000).toISOString() },
      { id: 'm2', from: 'patient', text: 'Much better! The new protein targets are working.', time: new Date(Date.now() - 90 * 60000).toISOString() },
      { id: 'm3', from: 'patient', text: 'Logged my meals for today ✅', time: new Date(Date.now() - 40 * 60000).toISOString() },
    ],
  },
  {
    id: 'c3', patientName: 'Leila Ahmadi', initials: 'LA', bg: '#DC2626',
    preview: 'Is it okay to skip breakfast?', time: new Date(Date.now() - 3 * 3600000).toISOString(), unread: false,
    chat: [
      { id: 'm1', from: 'patient', text: 'Good morning! Quick question.', time: new Date(Date.now() - 4 * 3600000).toISOString() },
      { id: 'm2', from: 'doctor',  text: 'Good morning Leila! Go ahead 😊', time: new Date(Date.now() - 3.5 * 3600000).toISOString() },
      { id: 'm3', from: 'patient', text: 'Is it okay to skip breakfast?', time: new Date(Date.now() - 3 * 3600000).toISOString() },
    ],
  },
  {
    id: 'c4', patientName: 'Tom Bergmann', initials: 'TB', bg: '#D97706',
    preview: 'Weigh-in done: 84.2 kg ⚖️', time: new Date(Date.now() - 86400000).toISOString(), unread: false,
    chat: [
      { id: 'm1', from: 'patient', text: 'Weigh-in done: 84.2 kg ⚖️', time: new Date(Date.now() - 86400000).toISOString() },
      { id: 'm2', from: 'doctor',  text: 'Great progress Tom! Down 1.3 kg from last week 🎉', time: new Date(Date.now() - 82000000).toISOString() },
    ],
  },
  {
    id: 'c5', patientName: 'Priya Nair', initials: 'PN', bg: '#0891B2',
    preview: 'Can we reschedule Friday?', time: new Date(Date.now() - 2 * 86400000).toISOString(), unread: false,
    chat: [
      { id: 'm1', from: 'patient', text: 'Can we reschedule Friday?', time: new Date(Date.now() - 2 * 86400000).toISOString() },
      { id: 'm2', from: 'doctor',  text: 'Sure! How does Monday at 10am work?', time: new Date(Date.now() - 2 * 86400000 + 600000).toISOString() },
      { id: 'm3', from: 'patient', text: 'Perfect, thank you!', time: new Date(Date.now() - 2 * 86400000 + 900000).toISOString() },
    ],
  },
];

// ── UTILITY ────────────────────────────────────────────────────────────────

const formatTimestamp = (timestamp) => {
  if (!timestamp || timestamp === 'Just now') return timestamp;
  try {
    const now = new Date();
    const t   = new Date(timestamp);
    if (t.toDateString() === now.toDateString())
      return t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const diffDays = Math.ceil(Math.abs(now - t) / 86400000);
    if (diffDays <= 7) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return days[t.getDay()];
    }
    return t.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch { return timestamp; }
};

// ── HOOKS ──────────────────────────────────────────────────────────────────

// TODO: BACKEND — replace with GET /api/conversations
const useConversations = () => {
  const [conversations, setConversations] = useState(MOCK_CONVERSATIONS);
  const [loading] = useState(false);
  return { conversations, setConversations, loading };
};

// TODO: BACKEND — replace with GET/POST /api/conversations/:id/messages
const useMessages = (conversationId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 200));
      const conv = MOCK_CONVERSATIONS.find(c => c.id === conversationId);
      if (conv) setMessages(conv.chat);
    } finally { setLoading(false); }
  }, [conversationId]);

  const sendMessage = useCallback(async (text) => {
    if (!conversationId || !text.trim()) return;
    await new Promise(r => setTimeout(r, 600));
    const msg = { id: `msg_${Date.now()}`, from: 'doctor', text: text.trim(), time: new Date().toISOString() };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, [conversationId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);
  return { messages, loading, sendMessage };
};

// ── COMPONENT ──────────────────────────────────────────────────────────────

export default function Messaging() {
  const [activeId, setActiveId] = useState(null);
  const [input, setInput]       = useState('');
  const [showChat, setShowChat] = useState(false);
  const [search, setSearch]     = useState('');
  const [sending, setSending]   = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const { conversations, setConversations, loading: convsLoading } = useConversations();
  const { messages, loading: msgsLoading, sendMessage }            = useMessages(activeId);

  const inputRef         = useRef(null);
  const messageBottomRef = useRef(null);

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  const active   = conversations.find(c => c.id === activeId);
  const filtered = conversations.filter(c =>
    c.patientName.toLowerCase().includes(search.toLowerCase())
  );
  const displayMessages = messages.length > 100 ? messages.slice(-100) : messages;

  useEffect(() => {
    messageBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages.length, activeId]);

  useEffect(() => {
    if (activeId && inputRef.current) inputRef.current.focus();
  }, [activeId]);

  const handleOpenChat = (id) => { setActiveId(id); setShowChat(true); };

  const send = async () => {
    const text = input.trim();
    if (!text || !activeId || sending) return;
    setSending(true);
    try {
      await sendMessage(text);
      setInput('');
      setConversations(prev => prev.map(c =>
        c.id === activeId ? { ...c, preview: text, time: new Date().toISOString(), unread: false } : c
      ));
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 1500);
    } finally { setSending(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const templates = ['Great progress! 🎉', 'Please log your meals 📋', 'Plan updated ✅', 'Weigh-in tomorrow ⚖️'];

  const showList = !isMobile || !showChat;
  const showChatPanel = !isMobile || showChat;

  return (
    <div style={{
      display: 'flex', height: '100%', minHeight: 0, overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      background: '#fff',
    }}>

      {/* ── Contact List ─────────────────────────────────────────── */}
      {showList && (
        <div style={{
          width: isMobile ? '100%' : 280,
          minWidth: isMobile ? '100%' : 280,
          flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          background: '#fff', borderRight: '1px solid #ececec',
          height: '100%', overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 14px 10px', fontSize: 15, fontWeight: 700, color: '#111', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
            Messages
          </div>

          <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search patients…"
                style={{
                  width: '100%', height: 32, border: '1px solid #e8e8e8', borderRadius: 8,
                  padding: '0 8px 0 28px', fontSize: 12, fontFamily: 'inherit',
                  outline: 'none', background: '#f9f9f9', color: '#222', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {convsLoading ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#aaa', fontSize: 12 }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#aaa', fontSize: 12 }}>No patients found</div>
            ) : (
              filtered.map(c => (
                <div
                  key={c.id}
                  onClick={() => handleOpenChat(c.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', cursor: 'pointer',
                    background: activeId === c.id ? '#f3f0ff' : 'transparent',
                    borderLeft: activeId === c.id ? '3px solid #7C3AED' : '3px solid transparent',
                  }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: c.bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0, position: 'relative' }}>
                    {c.initials}
                    <div style={{ width: 9, height: 9, background: '#22c55e', border: '2px solid #fff', borderRadius: '50%', position: 'absolute', bottom: 0, right: 0 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.patientName}</div>
                    <div style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{c.preview}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 10, color: '#aaa' }}>{formatTimestamp(c.time)}</span>
                    {c.unread && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7C3AED' }} />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Chat Panel ───────────────────────────────────────────── */}
      {showChatPanel && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, overflow: 'hidden', background: '#fff' }}>
          {active ? (
            <>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
                {isMobile && (
                  <button onClick={() => setShowChat(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 6, border: '1px solid #e0e0e0', background: '#fff', cursor: 'pointer', color: '#555', fontSize: 16, flexShrink: 0 }}>←</button>
                )}
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: active.bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0, position: 'relative' }}>
                  {active.initials}
                  <div style={{ width: 9, height: 9, background: '#22c55e', border: '2px solid #fff', borderRadius: '50%', position: 'absolute', bottom: 0, right: 0 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{active.patientName}</div>
                  <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 500, marginTop: 1 }}>● Active now</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e0e0e0', background: '#fff', fontSize: 11, fontWeight: 600, color: '#555', cursor: 'pointer' }}>Progress</button>
                  <button style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e0e0e0', background: '#fff', fontSize: 11, fontWeight: 600, color: '#555', cursor: 'pointer' }}>Plan</button>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {msgsLoading ? (
                  <div style={{ textAlign: 'center', color: '#aaa', fontSize: 12, marginTop: 20 }}>Loading…</div>
                ) : (
                  displayMessages.map((m, i) => (
                    <div key={m.id || i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.from === 'doctor' ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '70%', padding: '8px 12px',
                        borderRadius: m.from === 'doctor' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        background: m.from === 'doctor' ? '#7C3AED' : '#f3f4f6',
                        color: m.from === 'doctor' ? '#fff' : '#111',
                        fontSize: 13, lineHeight: 1.45,
                      }}>{m.text}</div>
                      <div style={{ fontSize: 10, color: '#bbb', marginTop: 3 }}>{formatTimestamp(m.time)}</div>
                    </div>
                  ))
                )}
                {isTyping && (
                  <div style={{ fontSize: 11, color: '#aaa', padding: '0 2px' }}>
                    {active.patientName.split(' ')[0]} is typing…
                  </div>
                )}
                <div ref={messageBottomRef} />
              </div>

              {/* Templates */}
              <div style={{ padding: '6px 12px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 6, overflowX: 'auto', background: '#fafafa', flexShrink: 0 }}>
                {templates.map(t => (
                  <button key={t} onClick={() => setInput(t)} disabled={sending} style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid #e8e8e8', background: '#fff', fontSize: 11, fontWeight: 500, cursor: 'pointer', color: '#555', whiteSpace: 'nowrap', flexShrink: 0, opacity: sending ? 0.5 : 1 }}>
                    {t}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid #f0f0f0', flexShrink: 0 }}>
                <input
                  ref={inputRef}
                  style={{ flex: 1, height: 36, border: '1px solid #e0e0e0', borderRadius: 8, padding: '0 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fafafa', color: '#111' }}
                  placeholder={`Message ${active.patientName.split(' ')[0]}…`}
                  value={input}
                  disabled={sending}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || sending}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 14px', borderRadius: 8, border: 'none', background: '#7C3AED', color: '#fff', fontSize: 13, fontWeight: 600, cursor: (!input.trim() || sending) ? 'not-allowed' : 'pointer', opacity: (!input.trim() || sending) ? 0.5 : 1, flexShrink: 0 }}
                >
                  {sending ? (
                    <div style={{ width: 12, height: 12, border: '2px solid transparent', borderTop: '2px solid white', borderRadius: '50%', animation: 'msg-spin 1s linear infinite' }} />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  )}
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#fafafa' }}>
              <div style={{ fontSize: 36 }}>💬</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#888' }}>Select a conversation</div>
              <div style={{ fontSize: 12, color: '#bbb' }}>Choose a patient from the list</div>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes msg-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}