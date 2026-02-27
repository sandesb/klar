import "./main.css";
import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Instagram, Youtube, Linkedin, Github, Droplets, Loader2 } from "lucide-react";
import Calendar2026 from "./calendar-2026.jsx";
import Calendar2082 from "./calendar-2082.jsx";
import Help from "./components/Help.jsx";
import Dialog from "./components/Dialog.jsx";

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
  const [fludOpen, setFludOpen] = useState(false);
  const [fludIframeLoaded, setFludIframeLoaded] = useState(false);

  useEffect(() => {
    if (fludOpen) setFludIframeLoaded(false);
  }, [fludOpen]);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(0deg, #0d0805 0%, #1a0e00 40%, #0a0d1a 100%)" }}>
      <Toaster position="bottom-center" toastOptions={{ style: { background: "#1a0e00", color: "#e8d5b7", border: "1px solid rgba(245,166,35,0.25)" } }} />
      <Help open={helpOpen} onClose={() => setHelpOpen(false)} />
      <Dialog
        open={fludOpen}
        onClose={() => setFludOpen(false)}
        title="FLÜD – Body Hydration"
        footer={null}
      >
        <div style={{ position: "relative", width: "90vw", maxWidth: "900px", height: "80vh", maxHeight: "700px" }}>
          {!fludIframeLoaded && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                background: "rgba(13,8,5,0.95)",
                borderRadius: "8px",
                color: "rgba(245,166,35,0.8)",
                fontFamily: "'DM Mono', monospace",
                fontSize: "12px",
                letterSpacing: "0.1em",
              }}
            >
              <Loader2 size={32} style={{ animation: "spin 0.8s linear infinite" }} />
              <span>Loading FLÜD…</span>
            </div>
          )}
          <iframe
            src="https://flud.netlify.app"
            title="FLÜD Body Hydration"
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              borderRadius: "8px",
              opacity: fludIframeLoaded ? 1 : 0,
              transition: "opacity 0.2s ease",
            }}
            onLoad={() => setFludIframeLoaded(true)}
          />
        </div>
      </Dialog>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", paddingTop: "16px", paddingBottom: "8px" }}>
      
   
        <CalendarToggle isBS={isBS} onSwitch={setIsBS} noPad />
        <button
          type="button"
          onClick={() => { setHelpOpen(true); setGlowStopped(true); }}
          title="Using Klar'y (Demo/Tutorials)"
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
        <button
          type="button"
          onClick={() => setFludOpen(true)}
          title="FLÜD – Body Hydration"
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "11px",
            letterSpacing: "0.15em",
            color: "rgb(88, 159, 252)",
            background: "transparent",
            border: "1px solid rgb(88, 159, 252)",
            borderRadius: "8px",
            padding: "8px 12px",
            cursor: "pointer",
            outline: "none",
            lineHeight: 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Try flüd
          <Droplets size={16} />
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
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .footer-backstory { padding-left: 24px; padding-right: 24px; }
        }
      `}</style>
    </div>
  );
}

function RootApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/help" element={<Help open={true} onClose={() => {}} />} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")).render(<RootApp />);
