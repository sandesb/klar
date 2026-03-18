import { useState, useEffect, useRef } from "react";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const STORAGE_KEY = "klary_note_access";
const ACCESS_KEY  = import.meta.env.VITE_NOTE_ACCESS_KEY ?? "";
const FONT_MONO   = "'DM Mono', monospace";
const FONT_SERIF  = "'Playfair Display', serif";

function isUnlocked() {
  try { return localStorage.getItem(STORAGE_KEY) === ACCESS_KEY; } catch { return false; }
}

function unlock() {
  try { localStorage.setItem(STORAGE_KEY, ACCESS_KEY); } catch {}
}

export default function NoteGate({ children }) {
  const [granted, setGranted]     = useState(isUnlocked);
  const [value,   setValue]       = useState("");
  const [error,   setError]       = useState("");
  const [visible, setVisible]     = useState(false);
  const [shaking, setShaking]     = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!granted) setTimeout(() => inputRef.current?.focus(), 80);
  }, [granted]);

  function attempt(key = value) {
    if (key === ACCESS_KEY) {
      unlock();
      setGranted(true);
      toast("Welcome back ✦", {
        style: {
          background: "#1a0e00",
          color: "#e8d5b7",
          border: "1px solid rgba(245,166,35,0.35)",
          fontFamily: "'DM Mono', monospace",
          fontSize: "13px",
          letterSpacing: "0.05em",
        },
        icon: "🔓",
        duration: 2600,
      });
    } else {
      setError("Wrong key. Try again.");
      setValue("");
      setShaking(true);
      setTimeout(() => setShaking(false), 520);
    }
  }

  function handleChange(e) {
    const val = e.target.value;
    setValue(val);
    setError("");
    if (val === ACCESS_KEY) attempt(val);
  }

  if (granted) return (
    <>
      <Toaster position="bottom-center" />
      {children}
    </>
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(0deg, #0d0805 0%, #1a0e00 40%, #0a0d1a 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: FONT_MONO,
    }}>
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          18%     { transform: translateX(-8px); }
          36%     { transform: translateX(8px); }
          54%     { transform: translateX(-6px); }
          72%     { transform: translateX(6px); }
          90%     { transform: translateX(-3px); }
        }
        .shake { animation: shake 0.52s cubic-bezier(.36,.07,.19,.97) both; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .note-gate-card { animation: fadeUp 0.38s cubic-bezier(0.34,1.04,0.64,1) both; }

        .note-key-input:focus { border-color: rgba(245,166,35,0.6) !important; }
        .note-enter-btn:hover { opacity: 0.88; transform: scale(0.98); }
      `}</style>

      <div
        className={`note-gate-card${shaking ? " shake" : ""}`}
        style={{
          width: "100%",
          maxWidth: 380,
          background: "rgba(26,14,0,0.85)",
          border: "1px solid rgba(245,166,35,0.22)",
          borderRadius: 24,
          padding: "48px 40px 40px",
          boxShadow: "0 24px 56px rgba(0,0,0,0.55), 0 0 28px rgba(245,166,35,0.06)",
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        {/* Icon + brand */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 60, height: 60, borderRadius: "50%",
            border: "1.5px solid rgba(245,166,35,0.45)",
            background: "rgba(245,166,35,0.06)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 20px rgba(245,166,35,0.1)",
          }}>
            <KeyRound size={24} color="rgba(245,166,35,0.85)" />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: FONT_SERIF,
              fontSize: 30,
              color: "#e8d5b7",
              letterSpacing: "-0.3px",
              lineHeight: 1.1,
              marginBottom: 6,
            }}>
              Klar<span style={{ color: "rgba(237,135,19,0.9)", fontStyle: "italic" }}>'</span>y Notes
            </div>
            <div style={{
              fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase",
              color: "rgba(245,166,35,0.4)",
            }}>
              Private · Enter your key
            </div>
          </div>
        </div>

        {/* Input */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{
            fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase",
            color: "rgba(232,213,183,0.45)",
          }}>
            Access Key
          </label>
          <div style={{ position: "relative" }}>
            <input
              ref={inputRef}
              className="note-key-input"
              type={visible ? "text" : "password"}
              value={value}
              onChange={handleChange}
              onKeyDown={e => e.key === "Enter" && attempt()}
              placeholder="Enter key…"
              autoComplete="off"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                padding: "13px 44px 13px 16px",
                color: "#e8d5b7",
                fontFamily: FONT_MONO,
                fontSize: 15,
                outline: "none",
                letterSpacing: visible ? "0.05em" : "0.3em",
                transition: "border-color 0.2s",
                boxSizing: "border-box",
              }}
            />
            <button
              type="button"
              onClick={() => setVisible(v => !v)}
              style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", padding: 4,
                color: "rgba(232,213,183,0.35)",
                display: "flex", alignItems: "center",
              }}
            >
              {visible
                ? <EyeOff size={15} color="rgba(232,213,183,0.35)" />
                : <Eye    size={15} color="rgba(232,213,183,0.35)" />}
            </button>
          </div>
          {error && (
            <div style={{
              fontSize: 11.5, color: "rgba(220,80,80,0.85)",
              letterSpacing: "0.05em",
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="button"
          className="note-enter-btn"
          onClick={attempt}
          style={{
            background: "rgba(245,166,35,0.18)",
            border: "1px solid rgba(245,166,35,0.55)",
            borderRadius: 12,
            padding: "14px",
            color: "#e8d5b7",
            fontFamily: FONT_MONO,
            fontSize: 13,
            letterSpacing: "0.12em",
            cursor: "pointer",
            fontWeight: 700,
            transition: "opacity 0.15s, transform 0.1s",
          }}
        >
          Unlock Notes
        </button>

        {/* Footer hint */}
        <div style={{
          textAlign: "center",
          fontSize: 10, letterSpacing: "0.12em",
          color: "rgba(232,213,183,0.18)",
        }}>
          · your notes stay private on this device ·
        </div>
      </div>
    </div>
  );
}
