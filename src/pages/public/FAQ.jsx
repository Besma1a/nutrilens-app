import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { C, FAQS } from "./constants/tokens";
import FadeUp from "./FadeUp";

function AccordionItem({ faq, index, isOpen, onToggle }) {
  return (
    <FadeUp delay={index * 0.05}>
      <div
        style={{
          background: C.bg,
          borderRadius: 20,
          border: isOpen ? `2px solid ${C.lime}` : `2px solid rgba(43,87,38,0.08)`,
          overflow: "hidden",
          transition: "border 0.2s ease",
        }}
      >
        <button
          onClick={onToggle}
          style={{
            width: "100%", background: "none", border: "none",
            padding: "20px 24px", display: "flex",
            justifyContent: "space-between", alignItems: "center",
            gap: 16, cursor: "pointer",
          }}
        >
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 17, color: C.forest, textAlign: "left", lineHeight: 1.35 }}>
            {faq.q}
          </span>
          <span style={{ flexShrink: 0, color: isOpen ? C.tomato : C.forest, transition: "color 0.2s" }}>
            {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </span>
        </button>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            style={{ padding: "0 24px 22px" }}
          >
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: "rgba(43,87,38,0.65)", lineHeight: 1.7, margin: 0 }}>
              {faq.a}
            </p>
          </motion.div>
        )}
      </div>
    </FadeUp>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);
  const handleToggle = (i) => setOpenIndex(openIndex === i ? null : i);

  return (
    /* Clean near-white gradient — no yellow/beige */
    <section style={{ background: "linear-gradient(to bottom, #f8fafc, #ffffff)", padding: "80px 24px 100px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 13, color: C.tomato, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>
              Got Questions?
            </div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "clamp(28px, 4vw, 44px)", color: C.forest, margin: 0 }}>
              Frequently Asked Questions
            </h2>
          </div>
        </FadeUp>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {FAQS.map((faq, i) => (
            <AccordionItem key={i} faq={faq} index={i} isOpen={openIndex === i} onToggle={() => handleToggle(i)} />
          ))}
        </div>
      </div>
    </section>
  );
}
