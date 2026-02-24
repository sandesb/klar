import { useState, useEffect } from "react";
import { ArrowLeft, CalendarRange } from "lucide-react";

const MONO  = "'DM Mono', monospace";
const SERIF = "'Playfair Display', serif";
const GOLD  = "rgba(245,166,35,0.9)";
const DAYS_HDR = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// March 2026: March 1 = Sunday (col 0), 31 days
const CELLS = Array.from({ length: 31 }, (_, i) => i + 1); // no leading nulls
function getCol(day) { return (day - 1) % 7; }

// Demo: today = March 4, range = 20 days → March 4–23
const DEMO_TODAY = 4;
const DEMO_END   = 23;

// ─────────────────────────────────────────────────────────────
// Custom phase-loop hook
// ─────────────────────────────────────────────────────────────
function usePhaseLoop(phases) {
  const [idx, setIdx]       = useState(0);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const phase = phases[idx];
    let t1, t2;
    if (phase.id === "fade") {
      t1 = setTimeout(() => setOpacity(0), 40);
      t2 = setTimeout(() => { setIdx(0); setOpacity(1); }, phase.ms);
    } else {
      t2 = setTimeout(() => setIdx(i => (i + 1) % phases.length), phase.ms);
    }
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  return { idx, phaseId: phases[idx].id, opacity };
}

// ─────────────────────────────────────────────────────────────
// Calendar day styling helper
// ─────────────────────────────────────────────────────────────
function getDayStyle(day, startDay, endDay) {
  const col    = getCol(day);
  const isStart = startDay != null && day === startDay;
  const isEnd   = endDay   != null && day === endDay;
  const isEdge  = isStart || isEnd;
  const inR     = startDay != null && endDay != null && day >= startDay && day <= endDay;

  let borderRadius = "25px";
  if (inR && !isEdge) {
    if      (col === 0) borderRadius = "50% 0 0 50%";
    else if (col === 6) borderRadius = "0 50% 50% 0";
    else                borderRadius = "0";
  }
  return {
    borderRadius,
    background: isEdge ? "linear-gradient(135deg, #f5a623, #e8793a)"
              : inR    ? "rgba(245,166,35,0.2)"
                       : "transparent",
    color:  isEdge               ? "#1a0e00"
          : inR                  ? "#f5c870"
          : (col===6 || col===0) ? "rgba(232,213,183,0.38)"
                                 : "rgba(232,213,183,0.8)",
    fontWeight: isEdge ? "700" : "400",
    boxShadow:  isEdge ? "0 0 10px rgba(245,166,35,0.4)" : "none",
    transition: "background 0.25s ease, color 0.25s ease",
  };
}

// ─────────────────────────────────────────────────────────────
// Part 1 phases  (click → input → type → range)
// ─────────────────────────────────────────────────────────────
const P1 = [
  { id: "idle",       ms: 750  },
  { id: "click",      ms: 480  },
  { id: "input-show", ms: 500  },
  { id: "type-2",     ms: 180  },
  { id: "type-20",    ms: 200  },
  { id: "range-set",  ms: 1800 },
  { id: "fade",       ms: 480  },
];

// ─────────────────────────────────────────────────────────────
// Part 2 phases  (long-press → saved-ranges dialog)
// ─────────────────────────────────────────────────────────────
const P2 = [
  { id: "idle",        ms: 900  },
  { id: "pressing",    ms: 720  },
  { id: "dialog-open", ms: 2200 },
  { id: "fade",        ms: 480  },
];

const FAKE_RANGES = [
  { title: "Gym",       range: "Feb 21  →  Mar 13", days: "12 working days" },
  { title: "Sprint Q1", range: "Mar 01  →  Mar 15", days: "11 working days" },
  { title: "Dashain",   range: "Oct 02  →  Oct 12", days:  "7 working days" },
];

// ─────────────────────────────────────────────────────────────
// Mini calendar (shared by both parts)
// ─────────────────────────────────────────────────────────────
function MiniCalendar({ startDay, endDay }) {
  return (
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
            color: "rgba(232,213,183,0.28)", paddingBottom: "6px",
          }}>{d}</div>
        ))}
        {CELLS.map(day => (
          <div key={day} style={{
            textAlign: "center", padding: "4px 0",
            fontSize: "10px", fontFamily: MONO, userSelect: "none",
            ...getDayStyle(day, startDay, endDay),
          }}>
            {day}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
export default function DaysModeDemo({ onBack }) {
  const p1 = usePhaseLoop(P1);
  const p2 = usePhaseLoop(P2);

  // Part 1 derived
  const p1Clicking  = p1.phaseId === "click";
  const p1InputVis  = ["input-show","type-2","type-20","range-set","fade"].includes(p1.phaseId);
  const p1TypedVal  = p1.phaseId === "type-2"  ? "2"
                    : ["type-20","range-set","fade"].includes(p1.phaseId) ? "20" : "";
  const p1RangeSet  = ["range-set","fade"].includes(p1.phaseId);

  // Part 2 derived
  const p2Pressing  = p2.phaseId === "pressing";
  const p2DialogVis = ["dialog-open","fade"].includes(p2.phaseId);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes icon-ring {
          0%   { box-shadow: 0 0 0 0   rgba(245,166,35,0.75); }
          55%  { box-shadow: 0 0 0 7px rgba(245,166,35,0.2); }
          100% { box-shadow: 0 0 0 12px rgba(245,166,35,0); }
        }
        .icon-click { animation: icon-ring 0.48s ease forwards; border-radius: 8px; }

        @keyframes lp-build {
          0%   { box-shadow: 0 0 0 0   rgba(245,166,35,0.3); }
          100% { box-shadow: 0 0 0 9px rgba(245,166,35,0.65); }
        }
        .lp-pressing { animation: lp-build 0.72s ease forwards; border-radius: 8px; }

        @keyframes dialog-pop {
          0%   { opacity: 0; transform: translateY(-7px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0)    scale(1); }
        }
        .dialog-pop { animation: dialog-pop 0.28s ease forwards; }

        @keyframes input-slide {
          0%   { opacity: 0; transform: translateX(-6px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .input-slide { animation: input-slide 0.28s ease forwards; }
      `}</style>

      {/* ── Back ── */}
      <button type="button" onClick={onBack} style={{
        display: "inline-flex", alignItems: "center", gap: "6px",
        background: "transparent", border: "none",
        color: "rgba(232,213,183,0.5)", fontFamily: MONO,
        fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase",
        cursor: "pointer", padding: "0 0 16px 0",
      }}>
        <ArrowLeft size={13} /> Back
      </button>

      {/* ── Title ── */}
      <div style={{ marginBottom: "18px" }}>
        <div style={{ fontFamily: SERIF, fontSize: "18px", color: "#e8d5b7", marginBottom: "3px" }}>
          Days Mode
        </div>
        <div style={{
          fontFamily: MONO, fontSize: "10px", letterSpacing: "0.18em",
          textTransform: "uppercase", color: "rgba(245,166,35,0.5)",
          display: "flex", alignItems: "center", gap: "7px",
        }}>
          <CalendarRange size={11} color={GOLD} /> auto demo · two modes
        </div>
      </div>

      {/* ══════════════════ PART 1 ══════════════════ */}
      <div style={{ opacity: p1.opacity, transition: "opacity 0.45s ease" }}>

        <div style={{
          fontFamily: MONO, fontSize: "9px", letterSpacing: "0.2em",
          textTransform: "uppercase", color: "rgba(245,166,35,0.55)",
          marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px",
        }}>
          <span style={{ width: "18px", height: "1px", background: "rgba(245,166,35,0.3)", display: "inline-block" }} />
          Click — enter number of days
          <span style={{ flex: 1, height: "1px", background: "rgba(245,166,35,0.15)", display: "inline-block" }} />
        </div>

        {/* Icon + input row */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
          <button
            type="button"
            key={p1Clicking ? `p1-btn-${p1.idx}` : "p1-btn"}
            className={p1Clicking ? "icon-click" : ""}
            style={{
              background: p1InputVis ? "rgba(245,166,35,0.15)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${p1InputVis ? "rgba(245,166,35,0.35)" : "rgba(255,255,255,0.12)"}`,
              borderRadius: "8px", padding: "7px 12px",
              display: "flex", alignItems: "center",
              cursor: "default", color: GOLD,
              transition: "background 0.3s, border 0.3s",
            }}
          >
            <CalendarRange size={16} />
          </button>

          {p1InputVis && (
            <div className="input-slide" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "64px",
                background: "rgba(245,166,35,0.08)",
                border: "1px solid rgba(245,166,35,0.35)",
                borderRadius: "8px", padding: "7px 10px",
                color: "#e8d5b7",
                fontFamily: p1TypedVal ? SERIF : MONO,
                fontSize: "16px", textAlign: "center",
                minHeight: "20px",
              }}>
                {p1TypedVal
                  ? p1TypedVal
                  : <span style={{ color: "rgba(232,213,183,0.2)", fontSize: "12px", fontFamily: MONO }}>days</span>}
              </div>
              {p1TypedVal === "20" && (
                <span style={{
                  fontFamily: MONO, fontSize: "10px", letterSpacing: "0.04em",
                  color: "rgba(245,166,35,0.65)",
                }}>
                  20 days from today →
                </span>
              )}
            </div>
          )}
        </div>

        {/* Status */}
        <div style={{
          fontFamily: MONO, fontSize: "11px", letterSpacing: "0.05em",
          color: p1RangeSet ? "rgba(70,200,110,0.9)" : "rgba(232,213,183,0.22)",
          minHeight: "16px", marginBottom: "14px", transition: "color 0.3s",
        }}>
          {p1RangeSet ? "March 04  →  March 23  ·  20 days" : ""}
        </div>

        <MiniCalendar startDay={p1RangeSet ? DEMO_TODAY : null} endDay={p1RangeSet ? DEMO_END : null} />
      </div>
<hr></hr>
      {/* ══════════════════ DIVIDER ══════════════════ */}
      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
        margin: "24px 0",
      }}>
        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
        <span style={{
          fontFamily: MONO, fontSize: "9px", letterSpacing: "0.22em",
          textTransform: "uppercase", color: "rgba(245,166,35,0.5)",
          whiteSpace: "nowrap", padding: "3px 10px",
          border: "1px solid rgba(245,166,35,0.2)", borderRadius: "20px",
        }}>
          long press
        </span>
        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
      </div>

      {/* ══════════════════ PART 2 ══════════════════ */}
      <div style={{ opacity: p2.opacity, transition: "opacity 0.45s ease" }}>

        <div style={{
          fontFamily: MONO, fontSize: "9px", letterSpacing: "0.2em",
          textTransform: "uppercase", color: "rgba(245,166,35,0.55)",
          marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px",
        }}>
          <span style={{ width: "18px", height: "1px", background: "rgba(245,166,35,0.3)", display: "inline-block" }} />
          Long-press — view saved ranges
          <span style={{ flex: 1, height: "1px", background: "rgba(245,166,35,0.15)", display: "inline-block" }} />
        </div>

        {/* Icon button with long-press indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              key={p2Pressing ? `p2-btn-${p2.idx}` : "p2-btn"}
              className={p2Pressing ? "lp-pressing" : ""}
              style={{
                background: p2DialogVis ? "rgba(245,166,35,0.15)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${(p2Pressing || p2DialogVis) ? "rgba(245,166,35,0.45)" : "rgba(255,255,255,0.12)"}`,
                borderRadius: "8px", padding: "7px 12px",
                display: "flex", alignItems: "center",
                cursor: "default", color: GOLD,
                transition: "background 0.3s, border 0.3s",
              }}
            >
              <CalendarRange size={16} />
            </button>
            {p2Pressing && (
              <div style={{
                position: "absolute", top: "calc(100% + 5px)", left: "50%",
                transform: "translateX(-50%)",
                fontFamily: MONO, fontSize: "9px", letterSpacing: "0.1em",
                color: "rgba(245,166,35,0.6)", whiteSpace: "nowrap",
              }}>
                hold…
              </div>
            )}
          </div>

          {p2DialogVis && (
            <span style={{
              fontFamily: MONO, fontSize: "10px", letterSpacing: "0.06em",
              color: "rgba(70,200,110,0.8)",
            }}>
              Saved ranges opened ↓
            </span>
          )}
        </div>

        {/* Saved ranges mini-dialog */}
        {p2DialogVis && (
          <div className="dialog-pop" style={{
            background: "linear-gradient(180deg, #1e1205 0%, #0f0906 100%)",
            border: "1px solid rgba(245,166,35,0.25)",
            borderRadius: "12px", padding: "14px 16px",
            boxShadow: "0 8px 28px rgba(0,0,0,0.5), 0 0 16px rgba(245,166,35,0.06)",
          }}>
            <div style={{
              fontFamily: MONO, fontSize: "9px", letterSpacing: "0.2em",
              textTransform: "uppercase", color: "rgba(245,166,35,0.5)",
              marginBottom: "10px",
            }}>
              Saved Ranges
            </div>
            {FAKE_RANGES.map((r, i) => (
              <div key={r.title} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "9px 0",
                borderBottom: i < FAKE_RANGES.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}>
                <div>
                  <div style={{
                    fontFamily: SERIF, fontSize: "13px",
                    color: "#e8d5b7", marginBottom: "2px",
                  }}>
                    {r.title}
                  </div>
                  <div style={{
                    fontFamily: MONO, fontSize: "9px",
                    color: "rgba(232,213,183,0.45)", letterSpacing: "0.04em",
                  }}>
                    {r.range}
                  </div>
                </div>
                <div style={{
                  fontFamily: MONO, fontSize: "9px", letterSpacing: "0.05em",
                  color: "rgba(70,200,110,0.8)",
                }}>
                  {r.days}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
