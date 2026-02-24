import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";

const MONO = "'DM Mono', monospace";
const SERIF = "'Playfair Display', serif";
const GOLD = "rgba(245,166,35,0.9)";
const DAYS_HDR = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// March 2026: March 1 = Sunday (col 0), 31 days
const MONTH_START_COL = 0;
const MONTH_DAYS = 31;

const CELLS = [
  ...Array(MONTH_START_COL).fill(null),
  ...Array.from({ length: MONTH_DAYS }, (_, i) => i + 1),
];

function getCol(day) {
  return (MONTH_START_COL + day - 1) % 7;
}

// Only handle March (month 03) for this demo
function parseDay(str) {
  if (!str || str.length < 5) return null;
  const [m, d] = str.split("/").map(Number);
  if (m !== 3) return null;
  if (d < 1 || d > 31) return null;
  return d;
}

// Typing sequence: {start value, end value, how long to stay on this step}
const STEPS = [
  { s: "",       e: "",       ms: 750  },
  { s: "0",      e: "",       ms: 150  },
  { s: "03",     e: "",       ms: 150  },
  { s: "03/",    e: "",       ms: 150  },
  { s: "03/0",   e: "",       ms: 150  },
  { s: "03/05",  e: "",       ms: 850  },  // start registered
  { s: "03/05",  e: "0",      ms: 150  },
  { s: "03/05",  e: "03",     ms: 150  },
  { s: "03/05",  e: "03/",    ms: 150  },
  { s: "03/05",  e: "03/2",   ms: 150  },
  { s: "03/05",  e: "03/24",  ms: 1800 }, // range registered
  { s: "",       e: "",       ms: 500, fade: true },
];

export default function ManualDateEntryDemo({ onBack }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const step = STEPS[stepIdx];
    let t1, t2;
    if (step.fade) {
      t1 = setTimeout(() => setOpacity(0), 50);
      t2 = setTimeout(() => { setStepIdx(0); setOpacity(1); }, step.ms);
    } else {
      t2 = setTimeout(() => setStepIdx(i => (i + 1) % STEPS.length), step.ms);
    }
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [stepIdx]);

  const { s: startVal, e: endVal } = STEPS[stepIdx];
  const startDay = parseDay(startVal);
  const endDay   = parseDay(endVal);

  const typingStart   = stepIdx >= 1 && stepIdx <= 4;
  const startComplete = stepIdx >= 5;
  const typingEnd     = stepIdx >= 6 && stepIdx <= 9;
  const rangeComplete = stepIdx >= 10;

  const startActive = typingStart;
  const endActive   = typingEnd;

  function dayStyle(day) {
    const col    = getCol(day);
    const isSat  = col === 6;
    const isSun  = col === 0;
    const isStart = startDay != null && day === startDay;
    const isEnd   = endDay   != null && day === endDay;
    const isEdge  = isStart || isEnd;
    const inR     = startDay != null && endDay != null && day >= startDay && day <= endDay;

    let borderRadius = "25px";
    if (inR && !isEdge) {
      if (col === 0)      borderRadius = "50% 0 0 50%";
      else if (col === 6) borderRadius = "0 50% 50% 0";
      else                borderRadius = "0";
    }

    return {
      borderRadius,
      background: isEdge
        ? "linear-gradient(135deg, #f5a623, #e8793a)"
        : inR  ? "rgba(245,166,35,0.2)"
               : "transparent",
      color: isEdge
        ? "#1a0e00"
        : inR      ? "#f5c870"
        : (isSat || isSun) ? "rgba(232,213,183,0.38)"
                           : "rgba(232,213,183,0.8)",
      fontWeight: isEdge ? "700" : "400",
      boxShadow:  isEdge ? "0 0 10px rgba(245,166,35,0.4)" : "none",
      transition: "background 0.25s ease, color 0.25s ease",
    };
  }

  /* Shared input box styles */
  function inputBoxStyle(active, hasValue) {
    return {
      background:   active ? "rgba(245,166,35,0.1)" : "transparent",
      border:       active ? "1px solid rgba(245,166,35,0.5)"
                           : "1px solid rgba(255,255,255,0.08)",
      borderRadius: "10px",
      padding:      "11px 8px",
      color:        "#e8d5b7",
      fontFamily:   hasValue ? SERIF : MONO,
      fontSize:     "18px",
      letterSpacing:"0.08em",
      textAlign:    "center",
      transition:   "border 0.2s, background 0.2s, box-shadow 0.2s",
      boxShadow:    active ? "0 0 18px rgba(245,166,35,0.08)" : "none",
      minHeight:    "22px",
    };
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes blink-bar {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        .typing-cursor::after {
          content: '|';
          margin-left: "2px";
          animation: blink-bar 0.85s step-end infinite;
          color: rgba(245,166,35,0.8);
        }
      `}</style>

      {/* back */}
      <button type="button" onClick={onBack} style={{
        display: "inline-flex", alignItems: "center", gap: "6px",
        background: "transparent", border: "none",
        color: "rgba(232,213,183,0.5)", fontFamily: MONO,
        fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase",
        cursor: "pointer", padding: "0 0 16px 0",
      }}>
        <ArrowLeft size={13} /> Back
      </button>

      {/* title */}
      <div style={{ marginBottom: "18px" }}>
        <div style={{ fontFamily: SERIF, fontSize: "18px", color: "#e8d5b7", marginBottom: "3px" }}>
          Manual Date Entry
        </div>
        <div style={{
          fontFamily: MONO, fontSize: "10px", letterSpacing: "0.18em",
          textTransform: "uppercase", color: "rgba(245,166,35,0.5)",
          display: "flex", alignItems: "center", gap: "7px",
        }}>
          <span style={{ fontFamily: MONO, fontSize: "13px", color: GOLD }}>MM/DD</span>
          auto demo
        </div>
      </div>

      <div style={{ opacity, transition: "opacity 0.45s ease" }}>

        {/* ── Input fields ── */}
        <div style={{
          display: "flex", gap: "10px", alignItems: "flex-end",
          maxWidth: "320px", margin: "0 auto 22px",
        }}>
          {/* START */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{
              fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase",
              color: startActive ? "rgba(245,166,35,0.85)" : "rgba(245,166,35,0.45)",
              fontFamily: MONO, transition: "color 0.2s",
            }}>Start</label>
            <div
              className={typingStart ? "typing-cursor" : ""}
              style={inputBoxStyle(startActive, !!startVal)}
            >
              {startVal
                ? startVal
                : <span style={{ color: "rgba(232,213,183,0.18)", fontSize: "13px", fontFamily: MONO }}>MM/DD</span>}
            </div>
          </div>

          <div style={{ color: "rgba(232,213,183,0.3)", fontSize: "20px", paddingBottom: "12px" }}>→</div>

          {/* END */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{
              fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase",
              color: endActive ? "rgba(245,166,35,0.85)" : "rgba(245,166,35,0.45)",
              fontFamily: MONO, transition: "color 0.2s",
            }}>End</label>
            <div
              className={typingEnd ? "typing-cursor" : ""}
              style={inputBoxStyle(endActive, !!endVal)}
            >
              {endVal
                ? endVal
                : <span style={{ color: "rgba(232,213,183,0.18)", fontSize: "13px", fontFamily: MONO }}>MM/DD</span>}
            </div>
          </div>
        </div>

        {/* ── Status line ── */}
        <div style={{
          textAlign: "center", fontFamily: MONO, fontSize: "11px",
          letterSpacing: "0.06em", minHeight: "18px", marginBottom: "16px",
          color: rangeComplete
            ? "rgba(70,200,110,0.9)"
            : startComplete
              ? GOLD
              : "rgba(232,213,183,0.3)",
          transition: "color 0.3s ease",
        }}>
          {rangeComplete
            ? "March 05  →  March 24  ·  20 days"
            : startComplete
              ? "Start · March 05 — now pick End"
              : "Type MM/DD into Start field"}
        </div>

        {/* ── Calendar ── */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px", padding: "18px",
          maxWidth: "320px", margin: "0 auto",
        }}>
          <div style={{
            fontFamily: SERIF, fontSize: "13px", letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#e8d5b7",
            textAlign: "center", marginBottom: "14px",
          }}>
            March 2026
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px" }}>
            {DAYS_HDR.map(d => (
              <div key={d} style={{
                textAlign: "center", fontSize: "9px", fontFamily: MONO,
                color: "rgba(232,213,183,0.28)", letterSpacing: "0.04em", paddingBottom: "7px",
              }}>{d}</div>
            ))}
            {CELLS.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />;
              return (
                <div key={`d-${day}`} style={{
                  textAlign: "center", padding: "5px 0",
                  fontSize: "11px", fontFamily: MONO, userSelect: "none",
                  ...dayStyle(day),
                }}>
                  {day}
                </div>
              );
            })}
          </div>
        </div>

        {/* description */}
        <div style={{
          marginTop: "18px", fontFamily: MONO, fontSize: "11px",
          color: "rgba(232,213,183,0.45)", lineHeight: 1.7, textAlign: "center",
        }}>
          Type <span style={{ color: GOLD }}>MM/DD</span> directly into the{" "}
          <span style={{ color: GOLD }}>Start</span> or{" "}
          <span style={{ color: GOLD }}>End</span> fields — no clicking on the calendar needed.
        </div>
      </div>
    </div>
  );
}
