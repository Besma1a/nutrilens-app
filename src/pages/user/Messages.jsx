import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/layout/Toast';

/* ─────────────────────────────────────────────────────
   TODO (backend): replace with API data
   ───────────────────────────────────────────────────── */
const CONTACTS = [
  { id: 1, name: 'Dr. Lisa Chen',     role: 'Clinical Nutritionist', initials: 'LC', online: true,  unread: 2, color: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  { id: 2, name: 'Nutrition Support', role: 'Support Team',         initials: 'NS', online: false, unread: 0, color: 'linear-gradient(135deg,#10b981,#059669)' },
  { id: 3, name: 'Coach Marcus',      role: 'Fitness Coach',         initials: 'CM', online: true,  unread: 1, color: 'linear-gradient(135deg,#f59e0b,#d97706)' },
];

const INIT_CHATS = {
  1: [
    { from: 'them', text: 'Good morning Sarah! How are you feeling this week?',                       time: '9:00 AM' },
    { from: 'me',   text: "Really good! I've been hitting my protein goals consistently.",                   time: '9:10 AM' },
    { from: 'them', text: 'Wonderful! Your weight trend is looking great — down 3.7 kg. Excellent work! 🎉',time: '9:12 AM' },
    { from: 'me',   text: 'Should I adjust my calorie goal?',                                                 time: '9:25 AM' },
    { from: 'them', text: "Let's keep at 1,800 kcal for now. We'll reassess at your check-in Wednesday.",   time: '9:27 AM' },
    { from: 'them', text: 'Great progress this week! How are you feeling today? 🌟',                        time: '2h ago' },
  ],
  2: [{ from: 'them', text: 'Your meal plan has been updated for next week. Check the Meal Plan section!', time: 'Yesterday' }],
  3: [
    { from: 'them', text: 'Remember to drink enough water today! Hydration was low yesterday 💧', time: 'Yesterday' },
    { from: 'me',   text: "Thanks for the reminder! I'll hit 2.5L today.",                       time: 'Yesterday' },
  ],
};

export default function MessagesContent() {
  const navigate = useNavigate();
  const toast = useToast();
  
  const [activeId, setActiveId] = useState(1);
  const [chats, setChats] = useState(INIT_CHATS);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);

  const inputRef = useRef(null);
  const messageBottomRef = useRef(null);

  const active = CONTACTS.find(c => c.id === activeId);
  const messageList = chats[activeId] || [];
  const displayMessages = messageList.length > 100 ? messageList.slice(-100) : messageList;

  // Auto focus input
  useEffect(() => {
    if (inputRef.current && (window.innerWidth > 768 || showMobileChat)) {
      inputRef.current.focus();
    }
  }, [activeId, showMobileChat]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messageBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages.length, activeId, showMobileChat]);

  const handleSelectContact = (id) => {
    setActiveId(id);
    setShowMobileChat(true);
  };

  const handleBackToList = () => {
    setShowMobileChat(false);
  };

  const send = () => {
    const txt = input.trim();
    if (!txt) return;
    if (txt.length > 4000) {
      toast({ message: 'Message is too long (max 4,000 characters).', type: 'warning' });
      return;
    }

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setChats(prev => ({
      ...prev,
      [activeId]: [...(prev[activeId] || []), { from: 'me', text: txt, time }]
    }));

    setInput('');

    // Simulate reply typing
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 1200);
  };

  const bookSession = () => {
    navigate('/user/consultation');
    toast({ message: `Booking with ${active.name}. Go to Consultations to confirm timing.`, type: 'info' });
  };

  return (
    <div className={`msg-layout ${showMobileChat ? 'mobile-chat-active' : ''}`}>

      {/* ==================== CONTACT LIST ==================== */}
      <div className="msg-list">
        <div className="msg-list-header">Messages</div>
        <div className="msg-list-scroll">
          {CONTACTS.map(c => (
            <div
              key={c.id}
              className={`msg-item ${activeId === c.id ? 'active' : ''}`}
              onClick={() => handleSelectContact(c.id)}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div className="msg-av" style={{ background: c.color }}>{c.initials}</div>
                {c.online && <div className="online-dot" />}
              </div>
              <div className="msg-meta">
                <div className="msg-name">{c.name}</div>
                <div className="msg-preview">{c.role}</div>
              </div>
              {c.unread > 0 && <span className="sb-badge">{c.unread}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* ==================== CHAT AREA ==================== */}
      <div className="msg-chat">
        {/* Chat Header */}
        <div className="msg-chat-header">
          <button className="msg-back-btn" onClick={handleBackToList}>
            ←
          </button>

          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div className="msg-av" style={{ background: active.color }}>{active.initials}</div>
            {active.online && <div className="online-dot" />}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="msg-header-name">{active.name}</div>
            <div className="msg-header-status" style={{ color: active.online ? '#10b981' : '#94a3b8' }}>
              {active.online ? '● Online' : '○ Offline'}
            </div>
          </div>

          <button type="button" className="btn btn-sec btn-sm hide-mobile" onClick={bookSession}>
            Book Session
          </button>
        </div>

        {/* Messages Area */}
        <div className="msg-messages">
          {displayMessages.map((m, i) => (
            <div key={i} className={`msg-row ${m.from === 'me' ? 'me' : 'them'}`}>
              <div className="msg-bubble">{m.text}</div>
              <div className="msg-time">{m.time}</div>
            </div>
          ))}

          {isTyping && <div className="msg-typing">Typing...</div>}
          <div ref={messageBottomRef} />
        </div>

        {/* Input Area */}
        <div className="msg-input-area">
          <input
            ref={inputRef}
            className="msg-input"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <button className="btn-send" onClick={send} disabled={!input.trim()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </div>
      </div>

      {/* ==================== STYLES ==================== */}
      <style jsx>{`
        .msg-layout {
          display: flex;
          height: 100%;
          background: #fff;
          overflow: hidden;
          border-radius: var(--r-lg);
        }

        /* Sidebar */
        .msg-list {
          width: 320px;
          border-right: 1px solid #f1f5f9;
          display: flex;
          flex-direction: column;
          background: #f8fafc;
          flex-shrink: 0;
        }
        .msg-list-header {
          padding: 20px 20px 16px;
          font-weight: 700;
          font-size: 1.25rem;
          color: #1e293b;
          border-bottom: 1px solid #f1f5f9;
        }
        .msg-list-scroll {
          flex: 1;
          overflow-y: auto;
        }
        .msg-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .msg-item:hover { background: #f1f5f9; }
        .msg-item.active { background: #fff; border-left: 4px solid #6366f1; }

        .msg-av {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 14px;
        }
        .online-dot {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 12px;
          height: 12px;
          background: #10b981;
          border: 2px solid white;
          border-radius: 50%;
        }

        .msg-meta { flex: 1; min-width: 0; }
        .msg-name { font-weight: 600; font-size: 15px; color: #1e293b; }
        .msg-preview { font-size: 13px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* Chat Area */
        .msg-chat {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .msg-chat-header {
          padding: 12px 20px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          gap: 12px;
          background: #fff;
        }
        .msg-header-name { font-weight: 700; font-size: 16px; }
        .msg-header-status { font-size: 12px; font-weight: 600; margin-top: 2px; }

        .msg-back-btn {
          display: none;
          background: none;
          border: none;
          font-size: 24px;
          color: #64748b;
          padding: 8px 12px;
          margin-left: -8px;
          cursor: pointer;
        }

        .msg-messages {
          flex: 1;
          overflow-y: auto;
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          background: #fafafa;
        }
        .msg-row {
          display: flex;
          flex-direction: column;
          max-width: 75%;
        }
        .msg-row.me { align-self: flex-end; align-items: flex-end; }
        .msg-row.them { align-self: flex-start; align-items: flex-start; }

        .msg-bubble {
          padding: 11px 15px;
          border-radius: 18px;
          font-size: 14.5px;
          line-height: 1.45;
        }
        .me .msg-bubble {
          background: #6366f1;
          color: #fff;
          border-bottom-right-radius: 4px;
        }
        .them .msg-bubble {
          background: #f1f5f9;
          color: #1e293b;
          border-bottom-left-radius: 4px;
        }
        .msg-time {
          font-size: 10px;
          color: #94a3b8;
          margin-top: 5px;
          padding: 0 4px;
        }

        .msg-input-area {
          padding: 16px 20px;
          border-top: 1px solid #f1f5f9;
          background: #fff;
          display: flex;
          gap: 10px;
        }
        .msg-input {
          flex: 1;
          border: 1px solid #e2e8f0;
          border-radius: 9999px;
          padding: 12px 18px;
          outline: none;
          font-size: 15px;
        }
        .msg-input:focus {
          border-color: #6366f1;
        }
        .btn-send {
          background: #6366f1;
          color: white;
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
        }
        .btn-send:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .msg-layout {
            position: relative;
          }
          .msg-list {
            width: 100%;
            position: absolute;
            inset: 0;
            z-index: 10;
            border-right: none;
          }
          .msg-chat {
            position: absolute;
            inset: 0;
            z-index: 20;
            display: none;
            background: white;
          }
          .mobile-chat-active .msg-chat {
            display: flex;
          }
          .msg-back-btn {
            display: block;
          }
          .hide-mobile {
            display: none;
          }
          .msg-messages {
            padding: 20px 16px;
          }
        }
      `}</style>
    </div>
  );
}