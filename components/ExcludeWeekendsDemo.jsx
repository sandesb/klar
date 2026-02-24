import { useState, useEffect } from "react";
import { ArrowLeft, CalendarMinus } from "lucide-react";

const MONO  = "'DM Mono', monospace";
const SERIF = "'Playfair Display', serif";
const GOLD  = "rgba(245,166,35,0.9)";
const DAYS_HDR = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// March 2026: starts Sunday (col 0), 31 days
const CELLS = Array.from({ length: 31 }, (_, i) => i + 1);
function getCol(day) { return (day - 1) % 7; }

// Range: March 4–23 (20 days)
// Weekends in range: 7(Sa) 8(Su) 14(Sa) 15(Su) 21(Sa) 22(Su) = 6 days
// Working days after exclusion: 14
const START_DAY    = 4;
const END_DAY      = 23;
const TOTAL_DAYS   = 20;
const WORKING_DAYS = 14;

const PHASES = [
  { id: "idle",     ms: 950  },
  { id: "click",    ms: 480  },
  { id: "excluded", ms: 2400 },
  { id: "fade",     ms: 480  },
];

export default function ExcludeWeekendsDemo({ onBack }) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [opacity, setOpacity]   = useState(1);
  const [displayCount, setDisplayCount] = useState(TOTAL_DAYS);

  useEffect(() => {
    const phase = PHASES[phaseIdx];
    let t1, t2;
    if (phase.id === "fade") {
      t1 = setTimeout(() => setOpacity(0), 40);
      t2 = setTimeout(() => { setPhaseIdx(0); setOpacity(1); }, phase.ms);
    } else {
      t2 = setTimeout(() => setPhaseIdx(i => (i + 1) % PHASES.length), phase.ms);
    }
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [phaseIdx]);

  const phaseId  = PHASES[phaseIdx].id;
  const clicking = phaseId === "click";
  const excluded = ["excluded", "fade"].includes(phaseId);

  // Animate working-days counter down when exclusion activates
  useEffect(() => {
    if (excluded) {
      let current = TOTAL_DAYS;
      const interval = setInterval(() => {
        current = Math.max(current - 1, WORKING_DAYS);
        setDisplayCount(current);
        if (current <= WORKING_DAYS) clearInterval(interval);
      }, 85);
      return () => clearInterval(interval);
    } else {
      setDisplayCount(TOTAL_DAYS);
    }
  }, [excluded]);

  function getDayStyle(day) {
    const col      = getCol(day);
    const isWeekend = col === 0 || col === 6;
    const isStart  = day === START_DAY;
    const isEnd    = day === END_DAY;
    const isEdge   = isStart || isEnd;
    const inR      = day >= START_DAY && day <= END_DAY;
    const isExcluded = excluded && inR && isWeekend;

    let borderRadius = "25px";
    if (inR && !isEdge) {
      if      (col === 0) borderRadius = "50% 0 0 50%";
      else if (col === 6) borderRadius = "0 50% 50% 0";
      else                borderRadius = "0";
    }

    if (isExcluded) {
      return {
        borderRadius,
        background: "rgba(200,80,80,0.35)",
        color: "rgba(255,200,200,0.9)",
        boxShadow: "0 0 7px rgba(200,80,80,0.4)",
        outline: "1px solid rgba(200,80,80,0.45)",
        fontWeight: "400",
        transition: "background 0.5s ease, color 0.5s ease, box-shadow 0.5s ease",
      };
    }

    return {
      borderRadius,
      background: isEdge ? "linear-gradient(135deg, #f5a623, #e8793a)"
                : inR    ? "rgba(245,166,35,0.2)"
                         : "transparent",
      color:  isEdge             ? "#1a0e00"
            : inR                ? "#f5c870"
            : isWeekend          ? "rgba(232,213,183,0.38)"
                                 : "rgba(232,213,183,0.8)",
      fontWeight: isEdge ? "700" : "400",
      boxShadow:  isEdge ? "0 0 10px rgba(245,166,35,0.4)" : "none",
      transition: "background 0.5s ease, color 0.5s ease",
    };
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes btn-ring {
          0%   { box-shadow: 0 0 0 0   rgba(245,166,35,0.75); }
          55%  { box-shadow: 0 0 0 7px rgba(245,166,35,0.2);  }
          100% { box-shadow: 0 0 0 12px rgba(245,166,35,0);   }
        }
        .btn-click { animation: btn-ring 0.48s ease forwards; border-radius: 8px; }

        @keyframes count-tick {
          0%   { transform: translateY(0);    opacity: 1; }
          40%  { transform: translateY(-4px); opacity: 0.4; }
          100% { transform: translateY(0);    opacity: 1; }
        }
        .count-tick { animation: count-tick 0.18s ease; }
      `}</style>

      {/* Back */}
      <button type="button" onClick={onBack} style={{
        display: "inline-flex", alignItems: "center", gap: "6px",
        background: "transparent", border: "none",
        color: "rgba(232,213,183,0.5)", fontFamily: MONO,
        fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase",
        cursor: "pointer", padding: "0 0 16px 0",
      }}>
        <ArrowLeft size={13} /> Back
      </button>

      {/* Title */}
      <div style={{ marginBottom: "18px" }}>
        <div style={{ fontFamily: SERIF, fontSize: "18px", color: "#e8d5b7", marginBottom: "3px" }}>
          Exclude Weekends
        </div>
        <div style={{
          fontFamily: MONO, fontSize: "10px", letterSpacing: "0.18em",
          textTransform: "uppercase", color: "rgba(245,166,35,0.5)",
          display: "flex", alignItems: "center", gap: "7px",
        }}>
          <CalendarMinus size={11} color={GOLD} /> auto demo
        </div>
      </div>

      <div style={{ opacity, transition: "opacity 0.45s ease" }}>

        {/* Range info bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(245,166,35,0.07)",
          border: "1px solid rgba(245,166,35,0.2)",
          borderRadius: "24px", padding: "8px 16px",
          marginBottom: "16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{
              width: "7px", height: "7px", borderRadius: "50%",
              background: GOLD, display: "inline-block",
            }} />
            <span style={{ fontFamily: MONO, fontSize: "11px", color: "#e8d5b7", letterSpacing: "0.04em" }}>
              March 04  →  March 23
            </span>
          </div>
          <div style={{
            fontFamily: MONO, fontSize: "11px", letterSpacing: "0.05em",
            color: excluded ? "rgba(70,200,110,0.9)" : "rgba(245,166,35,0.8)",
            transition: "color 0.5s ease",
            display: "flex", alignItems: "center", gap: "3px",
          }}>
            <span
              key={displayCount}
              className="count-tick"
              style={{ display: "inline-block", minWidth: "20px", textAlign: "right" }}
            >
              {displayCount}
            </span>
            <span style={{ opacity: 0.75 }}>
              {excluded ? " working days" : " days"}
            </span>
          </div>
        </div>

        {/* CalendarMinus button + label */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
          <button
            type="button"
            key={clicking ? `btn-${phaseIdx}` : "btn"}
            className={clicking ? "btn-click" : ""}
            style={{
              background: excluded ? "rgba(245,166,35,0.15)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${excluded ? "rgba(245,166,35,0.35)" : "rgba(255,255,255,0.12)"}`,
              borderRadius: "8px", padding: "7px 12px",
              display: "flex", alignItems: "center",
              cursor: "default", color: GOLD,
              transition: "background 0.3s, border 0.3s",
            }}
          >
            <CalendarMinus size={16} />
          </button>

          <span style={{
            fontFamily: MONO, fontSize: "10px", letterSpacing: "0.06em",
            color: excluded ? "rgba(200,80,80,0.85)" : "rgba(232,213,183,0.3)",
            transition: "color 0.4s ease",
          }}>
            {excluded ? "6 weekend days excluded" : "Click to exclude weekends"}
          </span>
        </div>

        {/* Legend (only when excluded) */}
        <div style={{
          display: "flex", gap: "16px", marginBottom: "12px",
          fontFamily: MONO, fontSize: "10px",
          color: "rgba(232,213,183,0.38)", letterSpacing: "0.05em",
          alignItems: "center",
          opacity: excluded ? 1 : 0, transition: "opacity 0.4s ease",
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{
              width: "11px", height: "11px", borderRadius: "3px",
              background: "rgba(200,80,80,0.35)",
              outline: "1px solid rgba(200,80,80,0.45)",
              display: "inline-block",
            }} />
            Sa / Su — excluded
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{
              width: "11px", height: "11px", borderRadius: "3px",
              background: "rgba(245,166,35,0.2)", display: "inline-block",
            }} />
            Working day
          </span>
        </div>

        {/* Calendar */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "14px", padding: "14px",
        }}>
          <div style={{
            fontFamily: SERIF, fontSize: "12px", letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#e8d5b7",
            textAlign: "center", marginBottom: "12px",
          }}>
            March 2026
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
            {DAYS_HDR.map(d => (
              <div key={d} style={{
                textAlign: "center", fontSize: "8px", fontFamily: MONO,
                paddingBottom: "6px",
                color: (d === "Su" || d === "Sa") && excluded
                  ? "rgba(200,80,80,0.65)"
                  : "rgba(232,213,183,0.28)",
                transition: "color 0.5s ease",
              }}>{d}</div>
            ))}
            {CELLS.map(day => (
              <div key={day} style={{
                textAlign: "center", padding: "4px 0",
                fontSize: "10px", fontFamily: MONO, userSelect: "none",
                ...getDayStyle(day),
              }}>
                {day}
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div style={{
          marginTop: "18px", fontFamily: MONO, fontSize: "11px",
          color: "rgba(232,213,183,0.45)", lineHeight: 1.7, textAlign: "center",
        }}>
          Click <span style={{ color: GOLD }}>Calendar−</span> to toggle weekend exclusion.
          Saturdays &amp; Sundays turn{" "}
          <span style={{ color: "rgba(255,120,120,0.85)" }}>red</span> and are removed from the working day count.
        </div>
      </div>
    </div>
  );
}
