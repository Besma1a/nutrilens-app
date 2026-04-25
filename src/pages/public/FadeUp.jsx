import { useRef } from "react";
import { motion, useInView } from "framer-motion";

/**
 * Wraps children in a fade-in-up animation that triggers when scrolled into view.
 * @param {number}  delay     - stagger delay in seconds
 * @param {string}  className - extra CSS class for the wrapper div
 */
export default function FadeUp({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
