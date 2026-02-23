import { useState, useEffect } from "react";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";

const MONO = "'DM Mono', monospace";
const SERIF = "'Playfair Display', serif";
const GOLD = "rgba(245,166,35,0.9)";

const AD_MONTHS = [
  "January", "February", "March",
  "April", "May", "June",
  "July", "August", "September",
  "October", "November", "December",
];

const BS_MONTHS = [
  "Baishakh / वैशाख", "Jestha / जेठ", "Ashadh / असार",
  "Shrawan / साउन", "Bhadra / भदौ", "Ashwin / असोज",
  "Kartik / कात्तिक", "Mangsir / मंसिर", "Poush / पुष",
  "Magh / माघ", "Falgun / फागुन", "Chaitra / चैत",
];

const CYCLE_MS = 2600;
const FADE_MS  = 380;

export default function ToggleYearDemo({ onBack }) {
  const [isBS, setIsBS]       = useState(false);
  const [phase, setPhase]     = useState("in");   // "in" | "out"
  const [pressing, setPressing] = useState(null); // "ad" | "bs" | null

  useEffect(() => {
    let fadeTimer, switchTimer;

    const run = () => {
      // 1. fade out + show press animation
      setPhase("out");
      setIsBS(prev => {
        setPressing(prev ? "ad" : "bs");
        return prev;
      });

      fadeTimer = setTimeout(() => {
        // 2. switch content and show new pressed state
        setIsBS(prev => !prev);
        setPhase("in");

        switchTimer = setTimeout(() => setPressing(null), 400);
      }, FADE_MS);
    };

    const interval = setInterval(run, CYCLE_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(fadeTimer);
      clearTimeout(switchTimer);
    };
  }, []);

  const contentStyle = {
    opacity: phase === "out" ? 0 : 1,
    transform: phase === "out" ? "translateY(8px)" : "translateY(0)",
    transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      <style>{`
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(245,166,35,0.55); }
          70%  { box-shadow: 0 0 0 7px rgba(245,166,35,0); }
          100% { box-shadow: 0 0 0 0 rgba(245,166,35,0); }
        }
        .toggle-press {
          animation: pulse-ring 0.42s ease forwards;
        }
        @keyframes spin-swap {
          0%   { transform: rotate(0deg); }
          50%  { transform: rotate(180deg); }
          100% { transform: rotate(360deg); }
        }
        .icon-spin {
          animation: spin-swap 0.7s ease infinite;
        }
      `}</style>

      {/* back */}
      <button
        type="button"
        onClick={onBack}
        style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          background: "transparent", border: "none",
          color: "rgba(232,213,183,0.5)", fontFamily: MONO,
          fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase",
          cursor: "pointer", padding: "0 0 16px 0",
        }}
      >
        <ArrowLeft size={13} /> Back
      </button>

      {/* title */}
      <div style={{ marginBottom: "22px" }}>
        <div style={{ fontFamily: SERIF, fontSize: "18px", color: "#e8d5b7", marginBottom: "3px" }}>
          Toggle Year System
        </div>
        <div style={{
          fontFamily: MONO, fontSize: "10px", letterSpacing: "0.18em",
          textTransform: "uppercase", color: "rgba(245,166,35,0.5)",
          display: "flex", alignItems: "center", gap: "7px",
        }}>
          <ArrowLeftRight size={11} className="icon-spin" style={{ color: GOLD }} />
          auto demo
        </div>
      </div>

      {/* toggle buttons (always visible, just active state changes) */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "28px" }}>
        <button
          type="button"
          className={pressing === "ad" ? "toggle-press" : ""}
          style={{
            fontFamily: MONO, fontSize: "13px", letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: !isBS ? "#e8d5b7" : "rgba(232,213,183,0.35)",
            background: !isBS ? "rgba(245,166,35,0.2)" : "transparent",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRight: "none",
            padding: "10px 24px",
            borderRadius: "10px 0 0 10px",
            cursor: "default",
            outline: "none",
            transition: "background 0.35s ease, color 0.35s ease",
          }}
        >
          A.D
        </button>
        <button
          type="button"
          className={pressing === "bs" ? "toggle-press" : ""}
          style={{
            fontFamily: MONO, fontSize: "13px", letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: isBS ? "#e8d5b7" : "rgba(232,213,183,0.35)",
            background: isBS ? "rgba(245,166,35,0.2)" : "transparent",
            border: "1px solid rgba(255,255,255,0.12)",
            padding: "10px 24px",
            borderRadius: "0 10px 10px 0",
            cursor: "default",
            outline: "none",
            transition: "background 0.35s ease, color 0.35s ease",
          }}
        >
          B.S
        </button>
      </div>

      {/* animated year + subtitle */}
      <div style={{ ...contentStyle, textAlign: "center", marginBottom: "24px" }}>
        <div style={{
          fontFamily: SERIF,
          fontSize: "clamp(52px, 14vw, 80px)",
          color: "#e8d5b7",
          letterSpacing: "0.01em",
          lineHeight: 1.05,
        }}>
          {isBS ? "2082" : "2026"}
        </div>
        <div style={{
          fontFamily: MONO, fontSize: "9px", letterSpacing: "0.28em",
          textTransform: "uppercase", color: "rgba(245,166,35,0.5)",
          marginTop: "4px",
        }}>
          {isBS ? "Bikram Sambat · Nepal" : "Anno Domini · English"}
        </div>
      </div>

      {/* animated month grid */}
      <div style={{
        ...contentStyle,
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "6px",
      }}>
        {(isBS ? BS_MONTHS : AD_MONTHS).map((m) => (
          <div
            key={m}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "10px",
              padding: "8px 6px",
              textAlign: "center",
              fontFamily: MONO,
              fontSize: isBS ? "9px" : "10px",
              letterSpacing: isBS ? "0.03em" : "0.08em",
              textTransform: isBS ? "none" : "uppercase",
              color: "#e8d5b7",
              lineHeight: 1.3,
            }}
          >
            {m}
          </div>
        ))}
      </div>

      {/* description */}
      <div style={{
        marginTop: "20px",
        fontFamily: MONO, fontSize: "11px",
        color: "rgba(232,213,183,0.45)", lineHeight: 1.7,
        textAlign: "center",
      }}>
        Use the <span style={{ color: GOLD }}>A.D / B.S</span> toggle at the top to switch
        between the English and Nepali calendar systems. Your date range is preserved across both views.
      </div>
    </div>
  );
}
