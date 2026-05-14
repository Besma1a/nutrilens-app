import { C } from "./constants/tokens";

/**
 * WaveToFooter — SVG wave transition from any section colour into the footer red.
 *
 * Usage: place immediately before <Footer /> on pages that have no Newsletter section.
 * Pass the background colour of the section directly above as `fromColor`.
 *
 * Does NOT modify Footer, Newsletter, or any other page.
 */
export default function WaveToFooter({ fromColor = "#ffffff" }) {
  return (
    <div style={{ background: C.tomato, lineHeight: 0, display: "block" }}>
      <svg
        viewBox="0 0 1440 100"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        style={{ width: "100%", height: "clamp(60px, 8vw, 100px)", display: "block" }}
      >
        <path
          d="M0,0 L0,60 Q180,100 360,60 Q540,20 720,60 Q900,100 1080,60 Q1260,20 1440,60 L1440,0 Z"
          fill={fromColor}
        />
      </svg>
    </div>
  );
}
