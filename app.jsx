import "./main.css";
import { useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { Instagram, Youtube, Linkedin, Github } from "lucide-react";
import Calendar2026 from "./calendar-2026.jsx";
import Calendar2082 from "./calendar-2082.jsx";
import Help from "./components/Help.jsx";

const SOCIAL_LINKS = [
  { Icon: Instagram, href: "https://instagram.com/sandesb_" },
  { Icon: Youtube, href: "https://www.youtube.com/@SandeshBajracharya" },
  { Icon: Linkedin, href: "https://www.linkedin.com/in/sandesh-bajracharya-238104250/" },
  { Icon: Github, href: "https://github.com/sandesb" },
];

function CalendarToggle({ isBS, onSwitch, noPad }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: "0",
      }}
    >
      <button
        type="button"
        onClick={() => onSwitch(false)}
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "11px",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: !isBS ? "#e8d5b7" : "rgba(245,166,35,0.7)",
          background: !isBS ? "rgba(245,166,35,0.15)" : "transparent",
          border: !isBS ? "1px solid rgba(245,166,35,0.55)" : "1px solid rgba(245,166,35,0.45)",
          borderRight: "none",
          padding: "8px 16px",
          borderRadius: "8px 0 0 8px",
          cursor: "pointer",
          outline: "none",
        }}
      >
        A.D
      </button>
      <button
        type="button"
        onClick={() => onSwitch(true)}
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "11px",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: isBS ? "#e8d5b7" : "rgba(245,166,35,0.7)",
          background: isBS ? "rgba(245,166,35,0.15)" : "transparent",
          border: isBS ? "1px solid rgba(245,166,35,0.55)" : "1px solid rgba(245,166,35,0.45)",
          padding: "8px 16px",
          borderRadius: "0 8px 8px 0",
          cursor: "pointer",
          outline: "none",
        }}
      >
        B.S
      </button>
    </div>
  );
}

function App() {
  const [isBS, setIsBS] = useState(false);
  const [lockedRange, setLockedRange] = useState(null); // { start: Date, end: Date } when locked
  const [helpOpen, setHelpOpen] = useState(false);
  const [glowStopped, setGlowStopped] = useState(false);
  const glowLongPressTimer = useRef(null);

  function startGlowLongPress() {
    glowLongPressTimer.current = setTimeout(() => {
      setGlowStopped(v => !v);
    }, 600);
  }
  function clearGlowLongPress() {
    if (glowLongPressTimer.current) {
      clearTimeout(glowLongPressTimer.current);
      glowLongPressTimer.current = null;
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(0deg, #0d0805 0%, #1a0e00 40%, #0a0d1a 100%)" }}>
      <Toaster position="bottom-center" toastOptions={{ style: { background: "#1a0e00", color: "#e8d5b7", border: "1px solid rgba(245,166,35,0.25)" } }} />
      <Help open={helpOpen} onClose={() => setHelpOpen(false)} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", paddingTop: "16px", paddingBottom: "8px" }}>
        <CalendarToggle isBS={isBS} onSwitch={setIsBS} noPad />
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          onMouseDown={startGlowLongPress}
          onMouseUp={clearGlowLongPress}
          onMouseLeave={clearGlowLongPress}
          onTouchStart={startGlowLongPress}
          onTouchEnd={clearGlowLongPress}
          onTouchCancel={clearGlowLongPress}
          title={glowStopped ? "Using Klar'y (Demo/Tutorials) · long-press to re-enable glow" : "Using Klar'y (Demo/Tutorials) · long-press to stop glow"}
          className={glowStopped ? "help-btn-pulse-stopped" : "help-btn-pulse"}
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "11px",
            letterSpacing: "0.15em",
            color: "rgba(70,200,110,0.9)",
            background: "transparent",
            border: "1px solid rgba(70,200,110,0.55)",
            borderRadius: "8px",
            padding: "8px 12px",
            cursor: "pointer",
            outline: "none",
            lineHeight: 1,
          }}
        >
          ?
        </button>
      </div>
      {isBS ? (
        <Calendar2082 lockedRange={lockedRange} onLockRange={setLockedRange} />
      ) : (
        <Calendar2026 lockedRange={lockedRange} onLockRange={setLockedRange} />
      )}
<hr style={{ border: "none", borderTop: "1px solid rgba(232,213,183,0.1)", width: "80%", margin: "0 auto" }} />
      <footer style={{
        fontFamily: "'DM Mono', monospace",
        padding: "5px 0",
        color: "rgba(232,213,183,0.4)",
        textAlign: "center",
      }}>
        <div className="footer-backstory" style={{
          fontSize: "12px",
          color: "rgba(245,166,35,0.5)",
          marginTop: "20px",
          maxWidth: "42em",
          marginLeft: "auto",
          marginRight: "auto",
          textAlign: "justify",
          lineHeight: 1.6,
        }}>
          <p style={{ margin: "0 2em 0.5em 2em" }}>· Little backstory as of Klar'y,</p>
          <p style={{ margin: "0 0 0.5em 0" }}>
            · I love to visualize stuff. Numbers of days, weeks, months just pass by, and we call it a year. To track real progress, you have to be able to see how little time we have left here. Yet counting days feel like eternity. I felt this deep beneath my body whilst my time in Vipassana meditation, where each day felt like a year. 10 days = 10 years. But the hours I spent there, were very productive. So simple yet so difficult to just sit and let time pass on. What if we could make these days count and visually represent them? So here we are.
          </p>
          <p style={{ margin: 0 }}>
          · 'KLAR' means 'Clear' in German. I found clarity in my Vipassana experience. Hope Klary will help you in your journey too. Peace.
          </p>
        </div>
        <p style={{ margin: "1em 0 0.5em 0" }}>Follow Me: @sandesb_</p>
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "16px",
          marginBottom: "0.5em",
        }}>
          {SOCIAL_LINKS.map(({ Icon, href, label }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "rgba(232,213,183,0.5)",
                textDecoration: "none",
                fontSize: "12px",
                fontFamily: "'DM Mono', monospace",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "rgba(245,166,35,0.8)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(232,213,183,0.5)";
              }}
            >
              <Icon size={22} />
              <span>{label}</span>
            </a>
          ))}
        </div>

        <p>© {new Date().getFullYear()} Klary. All rights reserved.</p>
      </footer>
      <style>{`
        @media (max-width: 768px) {
          .footer-backstory { padding-left: 24px; padding-right: 24px; }
        }
      `}</style>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
