import { useState, useEffect } from "react";
import { ArrowLeft, CalendarPlus, Check } from "lucide-react";

const MONO  = "'DM Mono', monospace";
const SERIF = "'Playfair Display', serif";
const GOLD  = "rgba(245,166,35,0.9)";
const DAYS_HDR = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// March 2026: starts Sunday (col 0), 31 days
const CELLS = Array.from({ length: 31 }, (_, i) => i + 1);
function getCol(day) { return (day - 1) % 7; }

// Range: March 4–23 (20 days)
// N = 5 → working cols 0–4 (Su,Mo,Tu,We,Th) = blue; col 6 (Sa) always red
// Blue days: 4,5,8,9,10,11,12,15,16,17,18,19,22,23 = 14
// Red days (Sa): 7, 14, 21
// Golden (Fr, in-range not working): 6, 13, 20
const START_DAY    = 4;
const END_DAY      = 23;
const TOTAL_DAYS   = 20;
const CUSTOM_N     = 5;
const WORKING_DAYS = 14;

const PHASES = [
  { id: "idle",        ms: 850  },
  { id: "click",       ms: 480  },  // ring on CalendarPlus
  { id: "dialog-open", ms: 650  },  // dialog appears, empty input
  { id: "type-5",      ms: 600  },  // "5" typed
  { id: "proceed",     ms: 400  },  // ring on Proceed button
  { id: "custom-set",  ms: 2100 },  // blue working days in calendar
  { id: "fade",        ms: 480  },
];

export default function CustomWorkingDaysDemo({ onBack }) {
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

  const phaseId       = PHASES[phaseIdx].id;
  const clicking      = phaseId === "click";
  const dialogVisible = ["dialog-open", "type-5", "proceed"].includes(phaseId);
  const hasValue      = ["type-5", "proceed"].includes(phaseId);
  const proceedClick  = phaseId === "proceed";
  const customActive  = ["custom-set", "fade"].includes(phaseId);
  const btnHighlight  = ["dialog-open", "type-5", "proceed"].includes(phaseId);

  // Count down when custom working days activate
  useEffect(() => {
    if (customActive) {
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
  }, [customActive]);

  function getDayStyle(day) {
    const col = getCol(day);
    const isStart = day === START_DAY;
    const isEnd   = day === END_DAY;
    const isEdge  = isStart || isEnd;
    const inR     = day >= START_DAY && day <= END_DAY;
    const isCustomWorking  = customActive && inR && col < CUSTOM_N && col !== 6;
    const isCustomExcluded = customActive && inR && col === 6;

    let borderRadius = "25px";
    if (inR && !isEdge) {
      if      (col === 0) borderRadius = "50% 0 0 50%";
      else if (col === 6) borderRadius = "0 50% 50% 0";
      else                borderRadius = "0";
    }

    if (isEdge) return {
      borderRadius: "25px",
      background: "linear-gradient(135deg, #f5a623, #e8793a)",
      color: "#1a0e00", fontWeight: "700",
      boxShadow: "0 0 10px rgba(245,166,35,0.4)",
      transition: "all 0.45s ease",
    };
    if (isCustomExcluded) return {
      borderRadius,
      background: "rgba(200,80,80,0.35)",
      color: "rgba(255,200,200,0.9)",
      boxShadow: "0 0 7px rgba(200,80,80,0.4)",
      outline: "1px solid rgba(200,80,80,0.45)",
      transition: "all 0.45s ease",
    };
    if (isCustomWorking) return {
      borderRadius,
      background: "rgba(80,140,200,0.4)",
      color: "rgba(200,220,255,0.95)",
      boxShadow: "0 0 8px rgba(80,140,200,0.5)",
      outline: "1px solid rgba(80,140,200,0.6)",
      fontWeight: "500",
      transition: "all 0.45s ease",
    };
    return {
      borderRadius,
      background: inR ? "rgba(245,166,35,0.2)" : "transparent",
      color: (col === 6 || col === 0) ? "rgba(232,213,183,0.38)" : "rgba(232,213,183,0.8)",
      transition: "all 0.45s ease",
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

        @keyframes proceed-ring {
          0%   { box-shadow: 0 0 0 0   rgba(70,200,110,0.8); }
          60%  { box-shadow: 0 0 0 6px rgba(70,200,110,0.2); }
          100% { box-shadow: 0 0 0 10px rgba(70,200,110,0); }
        }
        .proceed-click { animation: proceed-ring 0.4s ease forwards; border-radius: 8px; }

        @keyframes dialog-slide {
          0%   { opacity: 0; transform: translateY(-6px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0)    scale(1); }
        }
        .dialog-appear { animation: dialog-slide 0.26s ease forwards; }

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
          Custom Working Days
        </div>
        <div style={{
          fontFamily: MONO, fontSize: "10px", letterSpacing: "0.18em",
          textTransform: "uppercase", color: "rgba(245,166,35,0.5)",
          display: "flex", alignItems: "center", gap: "7px",
        }}>
          <CalendarPlus size={11} color={GOLD} /> auto demo
        </div>
      </div>

      <div style={{ opacity, transition: "opacity 0.45s ease" }}>

        {/* Range bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(245,166,35,0.07)",
          border: "1px solid rgba(245,166,35,0.2)",
          borderRadius: "24px", padding: "8px 16px",
          marginBottom: "16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: GOLD, display: "inline-block" }} />
            <span style={{ fontFamily: MONO, fontSize: "11px", color: "#e8d5b7", letterSpacing: "0.04em" }}>
              March 04  →  March 23
            </span>
          </div>
          <div style={{
            fontFamily: MONO, fontSize: "11px", letterSpacing: "0.05em",
            color: customActive ? "rgba(100,180,255,0.9)" : "rgba(245,166,35,0.8)",
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
              {customActive ? " working days" : " days"}
            </span>
          </div>
        </div>

        {/* CalendarPlus button + dialog */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
            <button
              type="button"
              key={clicking ? `btn-${phaseIdx}` : "btn"}
              className={clicking ? "btn-click" : ""}
              style={{
                background: btnHighlight ? "rgba(245,166,35,0.15)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${btnHighlight ? "rgba(245,166,35,0.35)" : "rgba(255,255,255,0.12)"}`,
                borderRadius: "8px", padding: "7px 12px",
                display: "flex", alignItems: "center",
                cursor: "default", color: GOLD,
                transition: "background 0.3s, border 0.3s",
              }}
            >
              <CalendarPlus size={16} />
            </button>

            <span style={{
              fontFamily: MONO, fontSize: "10px", letterSpacing: "0.05em",
              color: customActive
                ? "rgba(100,180,255,0.85)"
                : btnHighlight
                  ? GOLD
                  : "rgba(232,213,183,0.3)",
              transition: "color 0.4s ease",
            }}>
              {customActive
                ? `${CUSTOM_N} days/week active`
                : btnHighlight
                  ? "Enter working days per week…"
                  : "Click to set custom working days"}
            </span>
          </div>

          {/* Popup dialog */}
          {dialogVisible && (
            <div className="dialog-appear" style={{
              background: "linear-gradient(180deg, #1e1205 0%, #0f0906 100%)",
              border: "1px solid rgba(245,166,35,0.28)",
              borderRadius: "12px", padding: "14px 16px",
              boxShadow: "0 8px 28px rgba(0,0,0,0.5), 0 0 14px rgba(245,166,35,0.07)",
            }}>
              <div style={{
                fontFamily: MONO, fontSize: "9px", letterSpacing: "0.2em",
                textTransform: "uppercase", color: "rgba(245,166,35,0.5)",
                marginBottom: "12px",
              }}>
                Working Days / Week (1 – 6)
              </div>

              {/* Day bubbles row */}
              <div style={{
                display: "flex", gap: "6px", marginBottom: "12px",
                justifyContent: "center",
              }}>
                {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d, i) => {
                  const isWorking = hasValue && i < CUSTOM_N;
                  const isSat     = i === 6;
                  return (
                    <div key={d} style={{
                      width: "32px", height: "32px", borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: MONO, fontSize: "9px", letterSpacing: "0.04em",
                      background: isSat
                        ? "rgba(200,80,80,0.25)"
                        : isWorking
                          ? "rgba(80,140,200,0.35)"
                          : "rgba(255,255,255,0.05)",
                      color: isSat
                        ? "rgba(255,200,200,0.8)"
                        : isWorking
                          ? "rgba(200,220,255,0.9)"
                          : "rgba(232,213,183,0.35)",
                      border: isSat
                        ? "1px solid rgba(200,80,80,0.4)"
                        : isWorking
                          ? "1px solid rgba(80,140,200,0.5)"
                          : "1px solid rgba(255,255,255,0.08)",
                      transition: "all 0.3s ease",
                    }}>
                      {d}
                    </div>
                  );
                })}
              </div>

              {/* Number input + Proceed */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  flex: 1, background: "rgba(245,166,35,0.08)",
                  border: "1px solid rgba(245,166,35,0.35)",
                  borderRadius: "8px", padding: "8px 12px",
                  color: "#e8d5b7",
                  fontFamily: hasValue ? SERIF : MONO,
                  fontSize: "18px", textAlign: "center",
                  minHeight: "20px",
                  transition: "font-family 0.2s",
                }}>
                  {hasValue
                    ? CUSTOM_N
                    : <span style={{ color: "rgba(232,213,183,0.2)", fontSize: "12px", fontFamily: MONO }}>1 – 6</span>}
                </div>

                <button
                  type="button"
                  key={proceedClick ? `proceed-${phaseIdx}` : "proceed"}
                  className={proceedClick ? "proceed-click" : ""}
                  style={{
                    background: hasValue ? "rgba(70,200,110,0.15)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${hasValue ? "rgba(70,200,110,0.4)" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: "8px", padding: "8px 14px",
                    display: "flex", alignItems: "center", gap: "5px",
                    cursor: "default",
                    color: hasValue ? "rgba(70,200,110,0.9)" : "rgba(232,213,183,0.25)",
                    fontFamily: MONO, fontSize: "11px", letterSpacing: "0.08em",
                    transition: "all 0.25s ease",
                  }}
                >
                  <Check size={13} /> Proceed
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div style={{
          display: "flex", gap: "14px", marginBottom: "12px",
          fontFamily: MONO, fontSize: "10px",
          color: "rgba(232,213,183,0.38)", letterSpacing: "0.05em",
          alignItems: "center",
          opacity: customActive ? 1 : 0, transition: "opacity 0.4s ease",
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "11px", height: "11px", borderRadius: "3px", background: "rgba(80,140,200,0.4)", outline: "1px solid rgba(80,140,200,0.5)", display: "inline-block" }} />
            Working (Su–Th)
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "11px", height: "11px", borderRadius: "3px", background: "rgba(200,80,80,0.35)", display: "inline-block" }} />
            Saturday
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
            {DAYS_HDR.map((d, i) => (
              <div key={d} style={{
                textAlign: "center", fontSize: "8px", fontFamily: MONO,
                paddingBottom: "6px",
                color: i === 6 && customActive
                  ? "rgba(200,80,80,0.65)"
                  : (i < CUSTOM_N && customActive)
                    ? "rgba(100,180,255,0.7)"
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
          Enter <span style={{ color: GOLD }}>1–6</span> to set working days per week.
          Active days highlight in <span style={{ color: "rgba(100,180,255,0.9)" }}>blue</span>,
          Saturdays always in <span style={{ color: "rgba(255,120,120,0.8)" }}>red</span>.
        </div>
      </div>
    </div>
  );
}
