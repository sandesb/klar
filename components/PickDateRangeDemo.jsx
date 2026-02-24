import { useState, useEffect } from "react";
import { ArrowLeft, MousePointerClick } from "lucide-react";

const MONO = "'DM Mono', monospace";
const SERIF = "'Playfair Display', serif";
const GOLD = "rgba(245,166,35,0.9)";

const DAYS_HDR = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// February 2026: starts on Sunday (col 0), 28 days
const MONTH_START_COL = 0;
const TOTAL_DAYS = 28;
const START_DAY = 10; // Tuesday (col 2)
const END_DAY = 24;   // Tuesday (col 2)

function getCol(day) {
  return (MONTH_START_COL + day - 1) % 7;
}

// cells: leading nulls + 1..28
const CELLS = [
  ...Array(MONTH_START_COL).fill(null),
  ...Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1),
];

const PHASES = [
  { id: "idle",        ms: 800  },
  { id: "click-start", ms: 520  },
  { id: "start-set",   ms: 900  },
  { id: "click-end",   ms: 520  },
  { id: "range-set",   ms: 1700 },
  { id: "fade",        ms: 500  },
];

const STATUS = {
  "idle":        { text: "Click any date to set the Start",   color: "rgba(232,213,183,0.38)" },
  "click-start": { text: "Clicking…",                         color: GOLD },
  "start-set":   { text: "Start · February 10",               color: GOLD },
  "click-end":   { text: "Clicking end date…",                color: GOLD },
  "range-set":   { text: "February 10  →  February 24 · 15 days", color: "rgba(70,200,110,0.9)" },
  "fade":        { text: "",                                   color: "transparent" },
};

export default function PickDateRangeDemo({ onBack }) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [opacity, setOpacity]   = useState(1);

  useEffect(() => {
    const phase = PHASES[phaseIdx];
    let t1, t2;
    if (phase.id === "fade") {
      t1 = setTimeout(() => setOpacity(0), 50);
      t2 = setTimeout(() => { setPhaseIdx(0); setOpacity(1); }, phase.ms);
    } else {
      t2 = setTimeout(() => setPhaseIdx(i => (i + 1) % PHASES.length), phase.ms);
    }
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [phaseIdx]);

  const phaseId = PHASES[phaseIdx].id;
  const clickingStart = phaseId === "click-start";
  const clickingEnd   = phaseId === "click-end";
  const startSet      = ["start-set","click-end","range-set","fade"].includes(phaseId);
  const rangeSet      = ["range-set","fade"].includes(phaseId);
  const status        = STATUS[phaseId];

  function dayStyle(day) {
    const col    = getCol(day);
    const isSat  = col === 6;
    const isSun  = col === 0;
    const isStart = day === START_DAY && startSet;
    const isEnd   = day === END_DAY   && rangeSet;
    const isEdge  = isStart || isEnd;
    const inR     = rangeSet && day >= START_DAY && day <= END_DAY;

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
        : inR
          ? "rgba(245,166,35,0.2)"
          : "transparent",
      color: isEdge
        ? "#1a0e00"
        : inR
          ? "#f5c870"
          : isSat || isSun
            ? "rgba(232,213,183,0.38)"
            : "rgba(232,213,183,0.8)",
      fontWeight: isEdge ? "700" : "400",
      boxShadow: isEdge ? "0 0 10px rgba(245,166,35,0.4)" : "none",
    };
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      <style>{`
        @keyframes pick-ring {
          0%   { box-shadow: 0 0 0 0   rgba(245,166,35,0.85); background: rgba(245,166,35,0.18); }
          55%  { box-shadow: 0 0 0 7px rgba(245,166,35,0.25); background: rgba(245,166,35,0.28); }
          100% { box-shadow: 0 0 0 12px rgba(245,166,35,0);   background: transparent; }
        }
        .day-click { animation: pick-ring 0.52s ease forwards; border-radius: 25px; }
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
      <div style={{ marginBottom: "18px" }}>
        <div style={{ fontFamily: SERIF, fontSize: "18px", color: "#e8d5b7", marginBottom: "3px" }}>
          Pick a Date Range
        </div>
        <div style={{
          fontFamily: MONO, fontSize: "10px", letterSpacing: "0.18em",
          textTransform: "uppercase", color: "rgba(245,166,35,0.5)",
          display: "flex", alignItems: "center", gap: "7px",
        }}>
          <MousePointerClick size={11} color={GOLD} />
          auto demo
        </div>
      </div>

      {/* fading wrapper */}
      <div style={{ opacity, transition: "opacity 0.45s ease" }}>

        {/* status pill */}
        <div style={{
          textAlign: "center",
          fontFamily: MONO,
          fontSize: "11px",
          letterSpacing: "0.06em",
          color: status.color,
          minHeight: "18px",
          marginBottom: "16px",
          transition: "color 0.3s ease",
        }}>
          {status.text}
        </div>

        {/* calendar card */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px",
          padding: "18px",
          maxWidth: "320px",
          margin: "0 auto",
        }}>
          {/* month label */}
          <div style={{
            fontFamily: SERIF, fontSize: "13px", letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#e8d5b7",
            textAlign: "center", marginBottom: "14px",
          }}>
            February 2026
          </div>

          {/* grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px" }}>
            {DAYS_HDR.map(d => (
              <div key={d} style={{
                textAlign: "center", fontSize: "9px", fontFamily: MONO,
                color: "rgba(232,213,183,0.28)", letterSpacing: "0.04em", paddingBottom: "7px",
              }}>{d}</div>
            ))}

            {CELLS.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />;
              const isClickingThis =
                (day === START_DAY && clickingStart) ||
                (day === END_DAY   && clickingEnd);
              return (
                <div
                  key={isClickingThis ? `${day}-p${phaseIdx}` : `d-${day}`}
                  className={isClickingThis ? "day-click" : ""}
                  style={{
                    textAlign: "center",
                    padding: "5px 0",
                    fontSize: "11px",
                    fontFamily: MONO,
                    userSelect: "none",
                    ...dayStyle(day),
                  }}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>

        {/* legend */}
        <div style={{
          display: "flex", justifyContent: "center", gap: "18px",
          marginTop: "16px", fontFamily: MONO, fontSize: "10px",
          color: "rgba(232,213,183,0.35)", letterSpacing: "0.06em",
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "linear-gradient(135deg,#f5a623,#e8793a)", display: "inline-block" }} />
            Start / End
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "rgba(245,166,35,0.2)", display: "inline-block" }} />
            In range
          </span>
        </div>

        {/* description */}
        <div style={{
          marginTop: "18px", fontFamily: MONO, fontSize: "11px",
          color: "rgba(232,213,183,0.45)", lineHeight: 1.7, textAlign: "center",
        }}>
          Click any date to set the <span style={{ color: GOLD }}>Start</span>, then click
          another to set the <span style={{ color: GOLD }}>End</span>. Working days appear instantly.
        </div>
      </div>
    </div>
  );
}
