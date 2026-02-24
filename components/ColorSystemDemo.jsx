import { useState, useEffect } from "react";
import { ArrowLeft, Palette, CalendarArrowDown, RefreshCw } from "lucide-react";

const MONO  = "'DM Mono', monospace";
const SERIF = "'Playfair Display', serif";
const GOLD  = "rgba(245,166,35,0.9)";

// ─── Exact app color values ───────────────────────────────────
const C = {
  blue:  { bg: "rgba(80,140,200,0.4)",   fg: "rgba(200,220,255,0.95)", glow: "0 0 8px rgba(80,140,200,0.5)",   ring: "1px solid rgba(80,140,200,0.6)"  },
  red:   { bg: "rgba(200,80,80,0.35)",   fg: "rgba(255,200,200,0.9)", glow: "0 0 8px rgba(200,80,80,0.5)",   ring: "1px solid rgba(200,80,80,0.6)"   },
  yell:  { bg: "rgba(245,166,35,0.2)",   fg: "#f5c870",               glow: "none",                           ring: "none"                            },
  green: { bg: "rgba(70,200,110,0.5)",   fg: "rgba(220,255,220,0.98)",glow: "0 0 10px rgba(70,200,110,0.55)",ring: "1px solid rgba(70,200,110,0.75)" },
};
// Today-in-range: keep existing bg/fg, override glow+ring to green
const GREEN_RING = { glow: "0 0 10px rgba(70,200,110,0.55)", ring: "1px solid rgba(70,200,110,0.75)" };

// ─── Phases ───────────────────────────────────────────────────
const PHASES = [
  // ── Part 1: Color system ──
  { id: "idle",          ms: 700  }, //  0
  { id: "click-blue",    ms: 380  }, //  1  ring on We 11
  { id: "blue-red",      ms: 950  }, //  2  We 11 → red
  { id: "click-yellow",  ms: 380  }, //  3  ring on Fr 13
  { id: "yellow-blue",   ms: 950  }, //  4  Fr 13 → blue
  { id: "click-sat",     ms: 380  }, //  5  ring on Sa 14
  { id: "sat-blocked",   ms: 950  }, //  6  no change, hint
  // ── Part 2: Update buttons ──
  { id: "idle-2",        ms: 650  }, //  7
  { id: "click-extend",  ms: 380  }, //  8  ring on extend btn
  { id: "extended",      ms: 900  }, //  9  range grows +1 day (Fr 20)
  { id: "update-hint",   ms: 550  }, // 10  "click Update"
  { id: "click-update",  ms: 380  }, // 11  ring on update btn
  { id: "updated",       ms: 1000 }, // 12  "Saved!"
  { id: "fade",          ms: 480  }, // 13
];
const PI = Object.fromEntries(PHASES.map((p, i) => [p.id, i]));

// ─── Week strip for Part 1 (March 9–15, 2026) ────────────────
// Mo=1,Tu=2,We=3,Th=4,Fr=5(today),Sa=6,Su=0
const WEEK = [
  { num: 9,  label: "Mo", initial: "blue"  },
  { num: 10, label: "Tu", initial: "blue"  },
  { num: 11, label: "We", initial: "blue"  }, // toggles → red
  { num: 12, label: "Th", initial: "blue"  },
  { num: 13, label: "Fr", initial: "yell", today: true }, // today + toggles → blue
  { num: 14, label: "Sa", initial: "red",  locked: true },
  { num: 15, label: "Su", initial: "red",  locked: true },
];

// ─── Part 2 range strip (Mo 16 – Thu 19, extends to Fri 20) ──
const BASE_RANGE     = [16, 17, 18, 19];
const EXTENDED_RANGE = [16, 17, 18, 19, 20];
const LABELS_2       = ["Mo", "Tu", "We", "Th", "Fr"];

// ─── Helper: cell style from color key + optional today override ─
function cellStyle(colorKey, isToday, overrideRing) {
  const c = C[colorKey];
  return {
    background: c.bg,
    color: c.fg,
    boxShadow: isToday ? GREEN_RING.glow : c.glow,
    outline: isToday ? GREEN_RING.ring : c.ring,
  };
}

// ─── Legend chip ──────────────────────────────────────────────
function Chip({ colorKey, label, today }) {
  const c = C[colorKey];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{
        width: "18px", height: "18px", borderRadius: "50%",
        background: c.bg,
        boxShadow: today ? GREEN_RING.glow : c.glow,
        outline: today ? `2px solid rgba(70,200,110,0.8)` : "none",
        border: colorKey === "yell" ? "1px solid rgba(245,166,35,0.35)" : "none",
        flexShrink: 0,
      }} />
      <span style={{ fontFamily: MONO, fontSize: "11px", color: "rgba(232,213,183,0.75)", lineHeight: 1.5 }}>
        {label}
      </span>
    </div>
  );
}

export default function ColorSystemDemo({ onBack }) {
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

  const i = phaseIdx;

  // ── Derived state ──────────────────────────────────────────
  const we11Color    = i >= PI["blue-red"]    ? "red"  : "blue";
  const fr13Color    = i >= PI["yellow-blue"] ? "blue" : "yell";
  const ringDay11    = i === PI["click-blue"];
  const ringDay13    = i === PI["click-yellow"];
  const ringDay14    = i === PI["click-sat"];
  const extendRing   = i === PI["click-extend"];
  const updateRing   = i === PI["click-update"];
  const rangeExtended= i >= PI["extended"];
  const showUpdHint  = i === PI["update-hint"];
  const savedOk      = i >= PI["updated"];

  // ── Hints ─────────────────────────────────────────────────
  const HINT = {
    idle:          "Observe the colors in a saved range",
    "click-blue":  "Clicking a blue working day…",
    "blue-red":    "Wasted – excluded from working count",
    "click-yellow":"Clicking a yellow free day…",
    "yellow-blue": "Converted to a working day!",
    "click-sat":   "Trying to click a Saturday…",
    "sat-blocked": "Rest day – cannot be changed",
    "idle-2":      "See extend & update in action",
    "click-extend":"Adding 1 working day…",
    extended:      "Extended to Fri 20 · Sat 21 skipped",
    "update-hint": "Changes pending — click Update to save",
    "click-update":"Saving…",
    updated:       "Range saved!",
    fade:          "",
  };
  const hint     = HINT[PHASES[i].id] || "";
  const hintColor = savedOk
    ? "rgba(70,200,110,0.9)"
    : i === PI["sat-blocked"]
      ? "rgba(200,80,80,0.85)"
      : i >= PI["yellow-blue"] && i < PI["click-sat"]
        ? "rgba(80,140,200,0.9)"
        : GOLD;

  // ── Day color lookup for week strip ───────────────────────
  function getDayColor(d) {
    if (d.num === 11) return we11Color;
    if (d.num === 13) return fr13Color;
    return d.initial;
  }
  function getRingClass(d) {
    if (d.num === 11 && ringDay11) return "ring-gold";
    if (d.num === 13 && ringDay13) return "ring-gold";
    if (d.num === 14 && ringDay14) return "ring-red";
    return "";
  }

  // ── Range for Part 2 ──────────────────────────────────────
  const displayRange = rangeExtended ? EXTENDED_RANGE : BASE_RANGE;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes ring-gold {
          0%   { box-shadow: 0 0 0 0   rgba(245,166,35,0.8);  }
          55%  { box-shadow: 0 0 0 7px rgba(245,166,35,0.2);  }
          100% { box-shadow: 0 0 0 12px rgba(245,166,35,0);   }
        }
        .ring-gold { animation: ring-gold 0.42s ease forwards; border-radius: 50%; }
        @keyframes ring-red {
          0%   { box-shadow: 0 0 0 0   rgba(200,80,80,0.85);  }
          55%  { box-shadow: 0 0 0 7px rgba(200,80,80,0.2);   }
          100% { box-shadow: 0 0 0 12px rgba(200,80,80,0);    }
        }
        .ring-red  { animation: ring-red  0.42s ease forwards; border-radius: 50%; }
        @keyframes ring-green {
          0%   { box-shadow: 0 0 0 0   rgba(70,200,110,0.8);  }
          55%  { box-shadow: 0 0 0 7px rgba(70,200,110,0.2);  }
          100% { box-shadow: 0 0 0 12px rgba(70,200,110,0);   }
        }
        .ring-green { animation: ring-green 0.42s ease forwards; border-radius: 6px; }
        @keyframes day-in {
          0%   { opacity: 0; transform: translateX(-6px) scale(0.85); }
          100% { opacity: 1; transform: translateX(0)    scale(1);    }
        }
        .day-in { animation: day-in 0.3s ease forwards; }
      `}</style>

      {/* Back */}
      <button type="button" onClick={onBack} style={{
        display: "inline-flex", alignItems: "center", gap: "6px",
        background: "transparent", border: "none",
        color: "rgba(232,213,183,0.5)", fontFamily: MONO,
        fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase",
        cursor: "pointer", padding: "0 0 14px 0",
      }}>
        <ArrowLeft size={13} /> Back
      </button>

      {/* Title */}
      <div style={{ marginBottom: "14px" }}>
        <div style={{ fontFamily: SERIF, fontSize: "18px", color: "#e8d5b7", marginBottom: "3px" }}>
          Color System &amp; Updates
        </div>
        <div style={{
          fontFamily: MONO, fontSize: "10px", letterSpacing: "0.18em",
          textTransform: "uppercase", color: "rgba(245,166,35,0.5)",
          display: "flex", alignItems: "center", gap: "7px",
        }}>
          <Palette size={11} color={GOLD} /> auto demo
        </div>
      </div>

      <div style={{ opacity, transition: "opacity 0.45s ease" }}>

        {/* ════ PART 1: COLOR SYSTEM ════ */}
        <div style={{
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "14px", padding: "14px 14px 12px",
          marginBottom: "0",
        }}>
          {/* section label */}
          <div style={{
            fontFamily: MONO, fontSize: "9px", letterSpacing: "0.22em",
            textTransform: "uppercase", color: "rgba(245,166,35,0.45)",
            marginBottom: "10px",
          }}>
            Part 1 · Color Guide
          </div>

          {/* Legend */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: "5px 16px", marginBottom: "14px",
          }}>
            <Chip colorKey="blue"  label="Working day (Blue)" />
            <Chip colorKey="yell"  label="Free / off day (Yellow)" />
            <Chip colorKey="red"   label="Weekend / Wasted (Red)" />
            <Chip colorKey="blue"  today label="Today – green border" />
          </div>

          {/* Status hint for Part 1 */}
          {i <= PI["sat-blocked"] && (
            <div style={{
              fontFamily: MONO, fontSize: "10px", textAlign: "center",
              letterSpacing: "0.05em", minHeight: "14px",
              color: hintColor, marginBottom: "10px",
              transition: "color 0.3s ease",
            }}>
              {hint}
            </div>
          )}

          {/* Week strip */}
          <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
            {WEEK.map(d => {
              const colorKey = getDayColor(d);
              const rc       = getRingClass(d);
              const cs       = cellStyle(colorKey, d.today);
              return (
                <div key={d.num} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <div style={{
                    fontFamily: MONO, fontSize: "8px",
                    color: "rgba(232,213,183,0.3)", letterSpacing: "0.05em",
                  }}>
                    {d.label}
                  </div>
                  <div
                    key={`${d.num}-${colorKey}-${d.today && fr13Color}`}
                    className={rc}
                    style={{
                      width: "34px", height: "34px",
                      borderRadius: "25px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: MONO, fontSize: "11px", fontWeight: "600",
                      userSelect: "none",
                      transition: "background 0.35s ease, color 0.35s ease, box-shadow 0.35s ease, outline 0.35s ease",
                      ...cs,
                    }}
                  >
                    {d.num}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interaction caption */}
          <div style={{
            marginTop: "10px", fontFamily: MONO, fontSize: "10px",
            color: "rgba(232,213,183,0.35)", textAlign: "center",
            lineHeight: 1.6,
          }}>
            <span style={{ color: "rgba(80,140,200,0.9)" }}>Blue</span> click →{" "}
            <span style={{ color: "rgba(200,80,80,0.85)" }}>Red</span>
            &nbsp;·&nbsp;
            <span style={{ color: "#f5c870" }}>Yellow</span> click →{" "}
            <span style={{ color: "rgba(80,140,200,0.9)" }}>Blue</span>
            &nbsp;·&nbsp;
            <span style={{ color: "rgba(200,80,80,0.7)" }}>Red</span> = locked
          </div>
        </div>

        {/* ════ DIVIDER ════ */}
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          margin: "14px 0",
        }}>
          <div style={{ flex: 1, height: "1px", background: "rgba(245,166,35,0.15)" }} />
          <div style={{
            fontFamily: MONO, fontSize: "9px", letterSpacing: "0.2em",
            textTransform: "uppercase", color: "rgba(245,166,35,0.35)",
            whiteSpace: "nowrap",
          }}>
            Part 2 · Extend &amp; Update
          </div>
          <div style={{ flex: 1, height: "1px", background: "rgba(245,166,35,0.15)" }} />
        </div>

        {/* ════ PART 2: UPDATE BUTTONS ════ */}
        <div style={{
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "14px", padding: "14px 14px 12px",
        }}>
          <div style={{
            fontFamily: MONO, fontSize: "9px", letterSpacing: "0.22em",
            textTransform: "uppercase", color: "rgba(245,166,35,0.45)",
            marginBottom: "12px",
          }}>
            Part 2 · Update Buttons
          </div>

          {/* Buttons row */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: "10px", marginBottom: "14px",
          }}>
            {/* Extend button */}
            <button
              type="button"
              key={extendRing ? `ext-${i}` : "ext"}
              className={extendRing ? "ring-gold" : ""}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(245,166,35,0.35)",
                borderRadius: "10px", padding: "8px 12px",
                color: "rgba(245,166,35,0.95)", fontFamily: MONO,
                fontSize: "11px", letterSpacing: "0.08em", cursor: "default",
              }}
              title="Extend range by 1 working day"
            >
              <CalendarArrowDown size={15} />
              <span>+1 day</span>
            </button>

            {/* Saved range label */}
            <div style={{
              fontFamily: SERIF, fontSize: "13px", color: "#e8d5b7",
              padding: "6px 14px",
            }}>
              Gym
            </div>

            {/* Update button */}
            <button
              type="button"
              key={updateRing ? `upd-${i}` : "upd"}
              className={updateRing ? "ring-green" : ""}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                background: i >= PI["update-hint"] && !savedOk
                  ? "rgba(245,166,35,0.18)"
                  : "rgba(255,255,255,0.06)",
                border: i >= PI["update-hint"] && !savedOk
                  ? "1px solid rgba(245,166,35,0.7)"
                  : "1px solid rgba(245,166,35,0.35)",
                borderRadius: "10px", padding: "8px 12px",
                color: "rgba(245,166,35,0.95)", fontFamily: MONO,
                fontSize: "11px", letterSpacing: "0.08em", cursor: "default",
                transition: "background 0.3s, border-color 0.3s",
              }}
              title="Update saved range with current changes"
            >
              <RefreshCw size={15} />
              <span>Update</span>
            </button>
          </div>

          {/* Range strip */}
          <div style={{ display: "flex", gap: "4px", justifyContent: "center", marginBottom: "10px" }}>
            {EXTENDED_RANGE.map((day, idx) => {
              const inBase     = BASE_RANGE.includes(day);
              const isNew      = day === 20;
              const isVisible  = displayRange.includes(day);
              const isFirst    = day === displayRange[0];
              const isLast     = day === displayRange[displayRange.length - 1];

              if (!isVisible && !isNew) return null;

              return (
                <div
                  key={isNew ? `d20-${rangeExtended}` : `d${day}`}
                  className={isNew && rangeExtended ? "day-in" : ""}
                  style={{
                    display: "flex", flexDirection: "column",
                    alignItems: "center", gap: "4px",
                    opacity: !isVisible ? 0 : 1,
                    transition: "opacity 0.3s",
                  }}
                >
                  <div style={{
                    fontFamily: MONO, fontSize: "8px",
                    color: "rgba(232,213,183,0.3)", letterSpacing: "0.05em",
                  }}>
                    {LABELS_2[idx]}
                  </div>
                  <div style={{
                    width: "34px", height: "34px",
                    borderRadius: isFirst ? "50% 0 0 50%" : isLast ? "0 50% 50% 0" : "0",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: MONO, fontSize: "11px", fontWeight: isFirst || isLast ? "700" : "400",
                    userSelect: "none",
                    background: isFirst || isLast
                      ? "linear-gradient(135deg,#f5a623,#e8793a)"
                      : "rgba(80,140,200,0.35)",
                    color: isFirst || isLast ? "#1a0e00" : "rgba(200,220,255,0.9)",
                    boxShadow: isFirst || isLast ? "0 0 10px rgba(245,166,35,0.4)" : "0 0 6px rgba(80,140,200,0.3)",
                  }}>
                    {day}
                  </div>
                </div>
              );
            })}

            {/* Sa 21 skipped indicator */}
            {rangeExtended && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }} className="day-in">
                <div style={{ fontFamily: MONO, fontSize: "8px", color: "rgba(232,213,183,0.3)" }}>Sa</div>
                <div style={{
                  width: "34px", height: "34px", borderRadius: "25px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: MONO, fontSize: "11px",
                  background: "rgba(200,80,80,0.25)",
                  color: "rgba(255,180,180,0.6)",
                  border: "1px dashed rgba(200,80,80,0.4)",
                }}>
                  21
                </div>
              </div>
            )}
          </div>

          {/* Sa skip label */}
          {rangeExtended && (
            <div style={{
              textAlign: "center", fontFamily: MONO, fontSize: "9px",
              color: "rgba(200,80,80,0.6)", letterSpacing: "0.08em",
              marginBottom: "8px",
            }}>
              Sa 21 skipped (rest day)
            </div>
          )}

          {/* Part 2 status hint */}
          {i >= PI["idle-2"] && (
            <div style={{
              fontFamily: MONO, fontSize: "10px", textAlign: "center",
              letterSpacing: "0.05em", minHeight: "14px",
              color: savedOk
                ? "rgba(70,200,110,0.9)"
                : showUpdHint
                  ? GOLD
                  : "rgba(232,213,183,0.4)",
              transition: "color 0.3s ease",
            }}>
              {hint}
            </div>
          )}
        </div>

        {/* Description */}
        <div style={{
          marginTop: "13px", fontFamily: MONO, fontSize: "11px",
          color: "rgba(232,213,183,0.4)", lineHeight: 1.7, textAlign: "center",
        }}>
          After modifying days, always press{" "}
          <span style={{ color: GOLD }}>Update</span> to save the changes to your range.
        </div>

      </div>
    </div>
  );
}
