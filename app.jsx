import "./main.css";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { Instagram, Youtube, Linkedin, Github } from "lucide-react";
import Calendar2026 from "./calendar-2026.jsx";
import Calendar2082 from "./calendar-2082.jsx";

const SOCIAL_LINKS = [
  { Icon: Instagram, href: "https://instagram.com/sandesb_" },
  { Icon: Youtube, href: "https://www.youtube.com/@SandeshBajracharya" },
  { Icon: Linkedin, href: "https://www.linkedin.com/in/sandesh-bajracharya-238104250/" },
  { Icon: Github, href: "https://github.com/sandesb" },
];

function CalendarToggle({ isBS, onSwitch }) {
  return (
    <div
      style={{
        paddingTop: "16px",
        paddingBottom: "8px",
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
          color: !isBS ? "#e8d5b7" : "rgba(232,213,183,0.4)",
          background: !isBS ? "rgba(245,166,35,0.15)" : "transparent",
          border: "1px solid rgba(255,255,255,0.1)",
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
          color: isBS ? "#e8d5b7" : "rgba(232,213,183,0.4)",
          background: isBS ? "rgba(245,166,35,0.15)" : "transparent",
          border: "1px solid rgba(255,255,255,0.1)",
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
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(0deg, #0d0805 0%, #1a0e00 40%, #0a0d1a 100%)" }}>
      <Toaster position="top-center" toastOptions={{ style: { background: "#1a0e00", color: "#e8d5b7", border: "1px solid rgba(245,166,35,0.25)" } }} />
      <CalendarToggle isBS={isBS} onSwitch={setIsBS} />
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
          <p style={{ margin: "0 2em 0.5em 2em" }}>· Little backstory as to how Klar'y, came to be a calendar app.</p>
          <p style={{ margin: "0 0 0.5em 0" }}>
            · I always love to visualize stuff. Numbers of days, weeks, months just pass by, and we call it a year. To track real progress, you have to be able to see how little time we have left here. Yet counting days feel like eternity. I felt this deep beneath my body whilst my time in Vipassana meditation, where each day felt like a year. 10 days = 10 years. But the hours I spent there, were very productive. So simple yet so difficult to just sit and let time pass on. What if we could make these days count and visually represent them? So here we are.
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
