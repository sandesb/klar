import { useState, useEffect } from "react";
import { ArrowLeft, ClipboardList, Plus, Check, X, Circle, CircleCheck, Trash2 } from "lucide-react";

const MONO  = "'DM Mono', monospace";
const SERIF = "'Playfair Display', serif";
const GOLD  = "rgba(245,166,35,0.9)";
const DAYS_HDR = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// March 2026: starts Sunday (col 0), 31 days
const CELLS = Array.from({ length: 31 }, (_, i) => i + 1);
function getCol(day) { return (day - 1) % 7; }

const START_DAY = 4;
const END_DAY   = 23;
const PRESS_DAY = 10; // day being long-pressed (Tuesday)

// ─── Phases ──────────────────────────────────────────────────
const PHASES = [
  { id: "idle",            ms: 800  },  //  0
  { id: "press-day",       ms: 750  },  //  1 ring on day 10
  { id: "dialog-open",     ms: 700  },  //  2 dialog + "Morning run"
  { id: "click-plus",      ms: 380  },  //  3 ring on Plus
  { id: "type-T",          ms: 150  },  //  4
  { id: "type-Te",         ms: 150  },  //  5
  { id: "type-Tea",        ms: 155  },  //  6
  { id: "type-Team",       ms: 210  },  //  7
  { id: "save-new",        ms: 420  },  //  8 ring on Check
  { id: "both-tasks",      ms: 750  },  //  9 "Team" row visible
  { id: "mark-morning",    ms: 380  },  // 10 ring on circle of task1
  { id: "morning-crossed", ms: 750  },  // 11 task1 crossed out, trash red
  { id: "trash-click",     ms: 380  },  // 12 ring on trash
  { id: "task-deleted",    ms: 600  },  // 13 task1 removed
  { id: "dialog-close",    ms: 340  },  // 14 dialog fades away
  { id: "review-press",    ms: 750  },  // 15 long-press day 10 again
  { id: "review-open",     ms: 1700 },  // 16 dialog reopens with "Team" only
  { id: "fade",            ms: 480  },  // 17
];
const PI = Object.fromEntries(PHASES.map((p, idx) => [p.id, idx]));

function getTypedText(idx) {
  if (idx === PI["type-T"])           return "T";
  if (idx === PI["type-Te"])          return "Te";
  if (idx === PI["type-Tea"])         return "Tea";
  if (idx >= PI["type-Team"])         return "Team";
  return "";
}

// ─── Shared inline styles ────────────────────────────────────
const BTN = {
  background: "transparent", border: "none", padding: "4px",
  cursor: "default", display: "inline-flex",
  alignItems: "center", justifyContent: "center",
  color: "rgba(232,213,183,0.7)",
};
const CELL = {
  padding: "7px 10px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  verticalAlign: "middle",
};

export default function TodoTasksDemo({ onBack }) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [opacity, setOpacity]   = useState(1);

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

  const idx = phaseIdx;

  // Derived booleans
  const pressingDay    = idx === PI["press-day"]    || idx === PI["review-press"];
  const dialogVis      = (idx >= PI["dialog-open"]  && idx <= PI["dialog-close"]) || idx >= PI["review-open"];
  const dialogFading   = idx === PI["dialog-close"];
  const reviewMode     = idx >= PI["review-open"];
  const showInput      = idx >= PI["click-plus"]    && idx <= PI["save-new"];
  const t1Vis          = idx >= PI["dialog-open"]   && idx <= PI["trash-click"];
  const t1Done         = idx >= PI["morning-crossed"] && idx <= PI["trash-click"];
  const t2Vis          = idx >= PI["both-tasks"];
  const plusRing       = idx === PI["click-plus"];
  const saveRing       = idx === PI["save-new"];
  const markRing       = idx === PI["mark-morning"];
  const trashRing      = idx === PI["trash-click"];
  const typedText      = getTypedText(idx);
  const isTyping       = idx >= PI["type-T"] && idx <= PI["type-Team"];

  // Calendar day style
  function dayStyle(day) {
    const col   = getCol(day);
    const isStart = day === START_DAY;
    const isEnd   = day === END_DAY;
    const isEdge  = isStart || isEnd;
    const inR     = day >= START_DAY && day <= END_DAY;

    let br = "25px";
    if (inR && !isEdge) {
      if      (col === 0) br = "50% 0 0 50%";
      else if (col === 6) br = "0 50% 50% 0";
      else                br = "0";
    }

    return {
      borderRadius: br,
      background: isEdge ? "linear-gradient(135deg,#f5a623,#e8793a)"
                : inR    ? "rgba(245,166,35,0.2)"
                         : "transparent",
      color:  isEdge              ? "#1a0e00"
            : inR                 ? "#f5c870"
            : (col===6 || col===0)? "rgba(232,213,183,0.38)"
                                  : "rgba(232,213,183,0.8)",
      fontWeight: (isEdge || day === PRESS_DAY) ? "700" : "400",
      boxShadow:  isEdge ? "0 0 10px rgba(245,166,35,0.4)" : "none",
    };
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes day-lp {
          0%   { box-shadow: 0 0 0 0   rgba(245,166,35,0.85); }
          100% { box-shadow: 0 0 0 9px rgba(245,166,35,0.6);  }
        }
        .day-lp { animation: day-lp 0.75s ease forwards; border-radius: 25px; }

        @keyframes ring-gold {
          0%   { box-shadow: 0 0 0 0   rgba(245,166,35,0.8);  }
          55%  { box-shadow: 0 0 0 7px rgba(245,166,35,0.2);  }
          100% { box-shadow: 0 0 0 12px rgba(245,166,35,0);   }
        }
        .ring-gold { animation: ring-gold 0.42s ease forwards; border-radius: 50%; }

        @keyframes ring-green {
          0%   { box-shadow: 0 0 0 0   rgba(70,200,110,0.8);  }
          60%  { box-shadow: 0 0 0 6px rgba(70,200,110,0.2);  }
          100% { box-shadow: 0 0 0 10px rgba(70,200,110,0);   }
        }
        .ring-green { animation: ring-green 0.42s ease forwards; border-radius: 50%; }

        @keyframes ring-red {
          0%   { box-shadow: 0 0 0 0   rgba(200,80,80,0.8);   }
          60%  { box-shadow: 0 0 0 6px rgba(200,80,80,0.2);   }
          100% { box-shadow: 0 0 0 10px rgba(200,80,80,0);    }
        }
        .ring-red { animation: ring-red 0.42s ease forwards; border-radius: 50%; }

        @keyframes dialog-pop {
          0%   { opacity: 0; transform: translateY(-7px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .dialog-pop { animation: dialog-pop 0.28s ease forwards; }

        @keyframes row-in {
          0%   { opacity: 0; transform: translateX(-5px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .row-in { animation: row-in 0.24s ease forwards; }

        @keyframes blink-bar {
          0%,100% { opacity: 1; } 50% { opacity: 0; }
        }
        .typing-cursor::after {
          content: '|'; animation: blink-bar 0.85s step-end infinite;
          color: rgba(245,166,35,0.8);
        }
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
      <div style={{ marginBottom: "14px" }}>
        <div style={{ fontFamily: SERIF, fontSize: "18px", color: "#e8d5b7", marginBottom: "3px" }}>
          To-Do Tasks on a Day
        </div>
        <div style={{
          fontFamily: MONO, fontSize: "10px", letterSpacing: "0.18em",
          textTransform: "uppercase", color: "rgba(245,166,35,0.5)",
          display: "flex", alignItems: "center", gap: "7px",
        }}>
          <ClipboardList size={11} color={GOLD} /> auto demo
        </div>
      </div>

      <div style={{ opacity, transition: "opacity 0.45s ease" }}>

        {/* Status hint */}
        <div style={{
          textAlign: "center", fontFamily: MONO, fontSize: "10px",
          letterSpacing: "0.06em", marginBottom: "10px", minHeight: "15px",
          color: pressingDay    ? GOLD
               : reviewMode     ? "rgba(70,200,110,0.85)"
               : dialogVis      ? "rgba(245,166,35,0.65)"
                                : "rgba(232,213,183,0.28)",
          transition: "color 0.3s ease",
        }}>
          {pressingDay
            ? `Long-pressing March ${PRESS_DAY}…`
            : reviewMode
              ? "Reviewing tasks · March 10"
              : dialogVis
                ? "Tasks · March 10"
                : `Long-press any date in a saved range`}
        </div>

        {/* ── Mini calendar ── */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "14px", padding: "12px",
          marginBottom: "12px",
        }}>
          <div style={{
            fontFamily: SERIF, fontSize: "11px", letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#e8d5b7",
            textAlign: "center", marginBottom: "10px",
          }}>
            March 2026 · Saved Range
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
            {DAYS_HDR.map(d => (
              <div key={d} style={{
                textAlign: "center", fontSize: "7px", fontFamily: MONO,
                color: "rgba(232,213,183,0.25)", paddingBottom: "5px",
              }}>{d}</div>
            ))}
            {CELLS.map(day => {
              const isPressing = pressingDay && day === PRESS_DAY;
              return (
                <div
                  key={isPressing ? `d${day}-${idx}` : `d-${day}`}
                  className={isPressing ? "day-lp" : ""}
                  style={{
                    textAlign: "center", padding: "4px 0",
                    fontSize: "10px", fontFamily: MONO, userSelect: "none",
                    ...dayStyle(day),
                  }}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Todo dialog ── */}
        {dialogVis && (
          <div
            key={reviewMode ? "dlg-review" : "dlg-first"}
            className="dialog-pop"
            style={{
              background: "linear-gradient(180deg,#1e1205 0%,#0f0906 100%)",
              border: "1px solid rgba(245,166,35,0.25)",
              borderRadius: "12px", padding: "13px 15px",
              boxShadow: "0 8px 28px rgba(0,0,0,0.5), 0 0 14px rgba(245,166,35,0.06)",
              opacity: dialogFading ? 0 : 1,
              transition: "opacity 0.32s ease",
            }}
          >
            {/* Header */}
            <div style={{
              fontFamily: MONO, fontSize: "9px", letterSpacing: "0.2em",
              textTransform: "uppercase", color: "rgba(245,166,35,0.5)",
              marginBottom: "10px",
            }}>
              Tasks · March {PRESS_DAY}
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: MONO, fontSize: "12px" }}>
              <tbody>

                {/* Task 1: Morning run (pre-existing) */}
                {t1Vis && (
                  <tr key="t1" className="row-in">
                    <td style={{ ...CELL, width: "32px" }}>
                      <button
                        type="button"
                        key={markRing ? `mk-${idx}` : "mk"}
                        className={markRing ? "ring-gold" : ""}
                        style={BTN}
                      >
                        {t1Done
                          ? <CircleCheck size={17} color="rgba(70,200,110,0.9)" />
                          : <Circle size={17} />}
                      </button>
                    </td>
                    <td style={{
                      ...CELL,
                      textDecoration: t1Done ? "line-through" : "none",
                      color: t1Done ? "rgba(232,213,183,0.4)" : "rgba(232,213,183,0.9)",
                      transition: "text-decoration 0.3s, color 0.3s",
                    }}>
                      Morning run
                    </td>
                    <td style={{ ...CELL, width: "32px", textAlign: "right" }}>
                      <button
                        type="button"
                        key={trashRing ? `tr-${idx}` : "tr"}
                        className={trashRing ? "ring-red" : ""}
                        style={{ ...BTN, color: t1Done ? "rgba(200,80,80,0.9)" : "rgba(232,213,183,0.2)", transition: "color 0.35s" }}
                        title={t1Done ? "Delete" : "Finish task first"}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )}

                {/* Task 2: Team (newly added) */}
                {t2Vis && (
                  <tr key="t2" className="row-in">
                    <td style={{ ...CELL, width: "32px" }}>
                      <button type="button" style={BTN}><Circle size={17} /></button>
                    </td>
                    <td style={{ ...CELL, color: "rgba(232,213,183,0.9)" }}>
                      Team
                    </td>
                    <td style={{ ...CELL, width: "32px", textAlign: "right" }}>
                      <button type="button" style={{ ...BTN, color: "rgba(232,213,183,0.2)" }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )}

                {/* Plus / add-task row */}
                <tr>
                  <td style={{ ...CELL, width: "32px", borderBottom: "none" }}>
                    <button
                      type="button"
                      key={plusRing ? `pl-${idx}` : "pl"}
                      className={plusRing ? "ring-gold" : ""}
                      style={BTN}
                    >
                      <Plus size={17} />
                    </button>
                  </td>
                  <td style={{ ...CELL, borderBottom: "none" }} colSpan={2}>
                    {showInput && (
                      <div className="row-in" style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                        <div
                          className={isTyping ? "typing-cursor" : ""}
                          style={{
                            flex: 1,
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(245,166,35,0.3)",
                            borderRadius: "7px", padding: "5px 9px",
                            color: "#e8d5b7",
                            fontFamily: typedText ? SERIF : MONO,
                            fontSize: "12px", minHeight: "18px",
                          }}
                        >
                          {typedText || (
                            <span style={{ color: "rgba(232,213,183,0.2)", fontSize: "11px", fontFamily: MONO }}>
                              New task…
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          key={saveRing ? `sv-${idx}` : "sv"}
                          className={saveRing ? "ring-green" : ""}
                          style={{ ...BTN, color: typedText ? "rgba(70,200,110,0.9)" : "rgba(232,213,183,0.22)" }}
                        >
                          <Check size={16} />
                        </button>
                        <button type="button" style={{ ...BTN, color: "rgba(200,80,80,0.7)" }}>
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Description */}
        <div style={{
          marginTop: "14px", fontFamily: MONO, fontSize: "11px",
          color: "rgba(232,213,183,0.45)", lineHeight: 1.7, textAlign: "center",
        }}>
          <strong style={{ color: "#e8d5b7" }}>Long-press any date</strong> in a saved range to
          open its task list. <span style={{ color: "rgba(70,200,110,0.8)" }}>Mark</span> tasks done,
          then <span style={{ color: "rgba(200,80,80,0.75)" }}>delete</span> completed ones.
          Long-press again to review.
        </div>
      </div>
    </div>
  );
}
