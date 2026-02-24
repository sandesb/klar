import { useState, useEffect } from "react";
import { ArrowLeft, Lock, Check, X } from "lucide-react";

const MONO  = "'DM Mono', monospace";
const SERIF = "'Playfair Display', serif";
const GOLD  = "rgba(245,166,35,0.9)";

const PHASES = [
  { id: "idle",        ms: 800  },  // range set, lock locked
  { id: "pressing",    ms: 740  },  // long-press glow builds
  { id: "dialog-open", ms: 550  },  // save dialog appears, empty input
  { id: "type-G",      ms: 170  },
  { id: "type-Gy",     ms: 155  },
  { id: "type-Gym",    ms: 180  },
  { id: "saving",      ms: 440  },  // ring on Save button
  { id: "saved",       ms: 2200 },  // saved range card appears
  { id: "fade",        ms: 480  },
];

const NAME_AT = {
  "type-G": "G", "type-Gy": "Gy", "type-Gym": "Gym",
  "saving": "Gym", "saved": "Gym", "fade": "Gym",
};

export default function SaveRangeDemo({ onBack }) {
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

  const phaseId      = PHASES[phaseIdx].id;
  const pressing     = phaseId === "pressing";
  const dialogVis    = ["dialog-open","type-G","type-Gy","type-Gym","saving"].includes(phaseId);
  const savingClick  = phaseId === "saving";
  const savedVis     = ["saved","fade"].includes(phaseId);
  const typedName    = NAME_AT[phaseId] ?? "";
  const hasName      = typedName.length > 0;
  const isTyping     = ["type-G","type-Gy","type-Gym"].includes(phaseId);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes lp-glow {
          0%   { box-shadow: 0 0 0 0   rgba(245,166,35,0.3); }
          100% { box-shadow: 0 0 0 10px rgba(245,166,35,0.7); }
        }
        .lp-pressing { animation: lp-glow 0.74s ease forwards; border-radius: 8px; }

        @keyframes save-ring {
          0%   { box-shadow: 0 0 0 0   rgba(70,200,110,0.8); }
          60%  { box-shadow: 0 0 0 6px rgba(70,200,110,0.2); }
          100% { box-shadow: 0 0 0 10px rgba(70,200,110,0);  }
        }
        .save-click { animation: save-ring 0.44s ease forwards; border-radius: 8px; }

        @keyframes dialog-pop {
          0%   { opacity: 0; transform: translateY(-7px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0)    scale(1); }
        }
        .dialog-pop { animation: dialog-pop 0.28s ease forwards; }

        @keyframes card-rise {
          0%   { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .card-rise { animation: card-rise 0.35s ease forwards; }

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
      <div style={{ marginBottom: "18px" }}>
        <div style={{ fontFamily: SERIF, fontSize: "18px", color: "#e8d5b7", marginBottom: "3px" }}>
          Save a Range
        </div>
        <div style={{
          fontFamily: MONO, fontSize: "10px", letterSpacing: "0.18em",
          textTransform: "uppercase", color: "rgba(245,166,35,0.5)",
          display: "flex", alignItems: "center", gap: "7px",
        }}>
          <Lock size={11} color={GOLD} /> auto demo · long press
        </div>
      </div>

      <div style={{ opacity, transition: "opacity 0.45s ease" }}>

        {/* Range status bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(245,166,35,0.07)",
          border: "1px solid rgba(245,166,35,0.2)",
          borderRadius: "24px", padding: "7px 14px",
          marginBottom: "18px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: GOLD, display: "inline-block" }} />
            <span style={{ fontFamily: MONO, fontSize: "11px", color: "#e8d5b7", letterSpacing: "0.04em" }}>
              Feb 21  →  Mar 20
            </span>
          </div>
          <span style={{ fontFamily: MONO, fontSize: "11px", color: "rgba(245,166,35,0.75)" }}>
            20 days
          </span>
        </div>

        {/* Lock button + hold hint */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "16px" }}>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              key={pressing ? `lock-${phaseIdx}` : "lock"}
              className={pressing ? "lp-pressing" : ""}
              style={{
                background: "rgba(245,166,35,0.15)",
                border: "1px solid rgba(245,166,35,0.45)",
                borderRadius: "8px", padding: "8px 13px",
                display: "flex", alignItems: "center",
                cursor: "default", color: GOLD,
                boxShadow: "0 0 10px rgba(245,166,35,0.18)",
              }}
            >
              <Lock size={17} />
            </button>
            {pressing && (
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

          <span style={{
            fontFamily: MONO, fontSize: "10px", letterSpacing: "0.05em",
            color: pressing
              ? GOLD
              : savedVis
                ? "rgba(70,200,110,0.85)"
                : "rgba(232,213,183,0.3)",
            paddingTop: "10px",
            transition: "color 0.4s ease",
          }}>
            {pressing
              ? "Hold to open save dialog…"
              : savedVis
                ? `Saved as "${typedName}" ✓`
                : "Long-press the lock icon to save"}
          </span>
        </div>

        {/* Save dialog */}
        {dialogVis && (
          <div className="dialog-pop" style={{
            background: "linear-gradient(180deg, #1e1205 0%, #0f0906 100%)",
            border: "1px solid rgba(245,166,35,0.28)",
            borderRadius: "12px", padding: "14px 16px",
            boxShadow: "0 8px 28px rgba(0,0,0,0.5), 0 0 14px rgba(245,166,35,0.07)",
            marginBottom: "16px",
          }}>
            {/* Dialog title */}
            <div style={{
              fontFamily: MONO, fontSize: "9px", letterSpacing: "0.2em",
              textTransform: "uppercase", color: "rgba(245,166,35,0.5)",
              marginBottom: "12px",
            }}>
              Save Range
            </div>

            {/* Range preview inside dialog */}
            <div style={{
              fontFamily: MONO, fontSize: "10px", color: "rgba(232,213,183,0.45)",
              letterSpacing: "0.04em", marginBottom: "12px",
            }}>
              Feb 21 → Mar 20 · 20 days
            </div>

            {/* Name input + buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                className={isTyping ? "typing-cursor" : ""}
                style={{
                  flex: 1,
                  background: "rgba(245,166,35,0.08)",
                  border: "1px solid rgba(245,166,35,0.35)",
                  borderRadius: "8px", padding: "8px 12px",
                  color: "#e8d5b7",
                  fontFamily: hasName ? SERIF : MONO,
                  fontSize: "15px",
                  minHeight: "20px",
                }}
              >
                {hasName
                  ? typedName
                  : <span style={{ color: "rgba(232,213,183,0.2)", fontSize: "11px", fontFamily: MONO }}>Name this range…</span>}
              </div>

              {/* Save (Check) button */}
              <button
                type="button"
                key={savingClick ? `save-${phaseIdx}` : "save"}
                className={savingClick ? "save-click" : ""}
                style={{
                  background: hasName ? "rgba(70,200,110,0.15)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${hasName ? "rgba(70,200,110,0.4)" : "rgba(255,255,255,0.1)"}`,
                  borderRadius: "8px", padding: "8px 11px",
                  display: "flex", alignItems: "center",
                  cursor: "default",
                  color: hasName ? "rgba(70,200,110,0.9)" : "rgba(232,213,183,0.25)",
                  transition: "all 0.25s ease",
                }}
              >
                <Check size={15} />
              </button>

              {/* Cancel (X) button */}
              <button
                type="button"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px", padding: "8px 11px",
                  display: "flex", alignItems: "center",
                  cursor: "default", color: "rgba(200,80,80,0.6)",
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Saved range card */}
        {savedVis && (
          <div className="card-rise" style={{
            background: "linear-gradient(180deg, #1e1205 0%, #0f0906 100%)",
            border: "1px solid rgba(245,166,35,0.25)",
            borderRadius: "12px", padding: "12px 16px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4), 0 0 12px rgba(245,166,35,0.06)",
            marginBottom: "6px",
          }}>
            <div style={{
              fontFamily: MONO, fontSize: "9px", letterSpacing: "0.2em",
              textTransform: "uppercase", color: "rgba(245,166,35,0.45)",
              marginBottom: "8px",
            }}>
              Saved
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{
                  fontFamily: SERIF, fontSize: "16px",
                  color: "#e8d5b7", marginBottom: "3px",
                }}>
                  {typedName}
                </div>
                <div style={{
                  fontFamily: MONO, fontSize: "10px",
                  color: "rgba(232,213,183,0.45)", letterSpacing: "0.04em",
                }}>
                  Feb 21  →  Mar 20
                </div>
              </div>
              <div style={{
                fontFamily: MONO, fontSize: "10px", letterSpacing: "0.05em",
                color: "rgba(70,200,110,0.8)",
              }}>
                20 days
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        <div style={{
          marginTop: savedVis ? "12px" : "18px",
          fontFamily: MONO, fontSize: "11px",
          color: "rgba(232,213,183,0.45)", lineHeight: 1.7, textAlign: "center",
        }}>
          <strong style={{ color: "#e8d5b7" }}>Long-press</strong> the{" "}
          <span style={{ color: GOLD }}>Lock</span> icon on a locked range to open the save dialog,
          give it a name, and access it any time.
        </div>
      </div>
    </div>
  );
}
