import { useState, useEffect } from "react";
import { ArrowLeft, Lock, LockOpen } from "lucide-react";

const MONO  = "'DM Mono', monospace";
const SERIF = "'Playfair Display', serif";
const GOLD  = "rgba(245,166,35,0.9)";

// ─── Mock month data ────────────────────────────────────────
// A.D: Feb 21 → March 20 (same range in both systems)
// Feb 2026 starts Sunday (col 0), 28 days
// March 2026 starts Sunday (col 0), 31 days
// B.S. equivalent: Falgun 9 → Chaitra 7
// Falgun starts Feb 13 (Friday, col 5), 29 days
// Chaitra starts March 14 (Saturday, col 6), 30 days

const VIEWS = {
  ad: {
    label:  "A.D. · 2026",
    status: "Feb 21  →  Mar 20",
    months: [
      { name: "February",             startCol: 0, total: 28, from: 21, to: 28 },
      { name: "March",                startCol: 0, total: 31, from:  1, to: 20 },
    ],
  },
  bs: {
    label:  "B.S. · 2082",
    status: "Falgun 9  →  Chaitra 7",
    months: [
      { name: "Falgun / फागुन",       startCol: 5, total: 29, from:  9, to: 29 },
      { name: "Chaitra / चैत",        startCol: 6, total: 30, from:  1, to:  7 },
    ],
  },
};

const DAYS_HDR = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const PHASES = [
  { id: "idle",       ms: 950  },  // AD view, unlocked
  { id: "click-lock", ms: 480  },  // ring on lock icon
  { id: "locked",     ms: 850  },  // lock closes + gold
  { id: "click-bs",   ms: 480  },  // ring on BS toggle, calendar fades
  { id: "bs-view",    ms: 2000 },  // BS month names visible
  { id: "click-ad",   ms: 480  },  // ring on AD toggle, calendar fades
  { id: "ad-view",    ms: 950  },  // back to AD
  { id: "fade",       ms: 480  },
];

function MockMonthCard({ month }) {
  const cells = [
    ...Array(month.startCol).fill(null),
    ...Array.from({ length: month.total }, (_, i) => i + 1),
  ];

  function cellStyle(day) {
    const isEdge = day === month.from || day === month.to;
    const inR    = day >= month.from && day <= month.to;
    const col    = cells.indexOf(day) % 7; // approximate col after leading nulls

    // border-radius for range strip
    const actualCol = (month.startCol + day - 1) % 7;
    let borderRadius = isEdge ? "25px"
      : actualCol === 0 ? "50% 0 0 50%"
      : actualCol === 6 ? "0 50% 50% 0"
      : "0";
    if (!inR || isEdge) borderRadius = isEdge ? "25px" : "2px";

    return {
      height: "9px",
      borderRadius,
      background: isEdge
        ? "linear-gradient(135deg, #f5a623, #e8793a)"
        : inR
          ? "rgba(245,166,35,0.28)"
          : "rgba(255,255,255,0.06)",
      boxShadow: isEdge ? "0 0 6px rgba(245,166,35,0.4)" : "none",
      transition: "background 0.45s ease",
    };
  }

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "12px", padding: "12px",
      flex: 1,
    }}>
      <div style={{
        fontFamily: SERIF, fontSize: "11px", letterSpacing: "0.08em",
        textTransform: month.name.includes("/") ? "none" : "uppercase",
        color: "#e8d5b7", textAlign: "center", marginBottom: "10px",
        lineHeight: 1.3,
      }}>
        {month.name}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", marginBottom: "4px" }}>
        {DAYS_HDR.map(d => (
          <div key={d} style={{
            textAlign: "center", fontSize: "7px", fontFamily: MONO,
            color: "rgba(232,213,183,0.22)", paddingBottom: "4px",
          }}>{d}</div>
        ))}
        {cells.map((day, i) => (
          <div key={i} style={day ? cellStyle(day) : { height: "9px" }} />
        ))}
      </div>
    </div>
  );
}

export default function LockSwitchDemo({ onBack }) {
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

  const phaseId = PHASES[phaseIdx].id;

  const clickingLock = phaseId === "click-lock";
  const isLocked     = !["idle"].includes(phaseId);
  const clickingBS   = phaseId === "click-bs";
  const clickingAD   = phaseId === "click-ad";
  const isBS         = ["bs-view", "click-ad"].includes(phaseId);

  // Calendar content fades out during toggle-clicks, then reappears with new labels
  const calFading    = clickingBS || clickingAD;

  const currentView  = isBS ? VIEWS.bs : VIEWS.ad;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes lock-ring {
          0%   { box-shadow: 0 0 0 0   rgba(245,166,35,0.75); }
          55%  { box-shadow: 0 0 0 7px rgba(245,166,35,0.2);  }
          100% { box-shadow: 0 0 0 12px rgba(245,166,35,0);   }
        }
        .lock-click { animation: lock-ring 0.48s ease forwards; border-radius: 8px; }

        @keyframes toggle-ring {
          0%   { box-shadow: 0 0 0 0   rgba(245,166,35,0.75); }
          60%  { box-shadow: 0 0 0 6px rgba(245,166,35,0.2);  }
          100% { box-shadow: 0 0 0 10px rgba(245,166,35,0);   }
        }
        .toggle-click { animation: toggle-ring 0.42s ease forwards; border-radius: 8px 0 0 8px; }
        .toggle-click-r { animation: toggle-ring 0.42s ease forwards; border-radius: 0 8px 8px 0; }

        @keyframes lock-seal {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.3) rotate(-10deg); }
          70%  { transform: scale(0.9) rotate(5deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        .lock-seal { animation: lock-seal 0.45s ease forwards; }
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
          Lock &amp; Switch View
        </div>
        <div style={{
          fontFamily: MONO, fontSize: "10px", letterSpacing: "0.18em",
          textTransform: "uppercase", color: "rgba(245,166,35,0.5)",
          display: "flex", alignItems: "center", gap: "7px",
        }}>
          <Lock size={11} color={GOLD} /> auto demo
        </div>
      </div>

      <div style={{ opacity, transition: "opacity 0.45s ease" }}>

        {/* ── Controls bar: toggle + lock ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: "16px",
        }}>
          {/* A.D / B.S toggle replica */}
          <div style={{ display: "flex" }}>
            <button
              type="button"
              key={clickingBS ? `btn-ad-${phaseIdx}` : "btn-ad"}
              className={clickingBS ? "toggle-click" : ""}
              style={{
                fontFamily: MONO, fontSize: "12px", letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: !isBS ? "#e8d5b7" : "rgba(245,166,35,0.7)",
                background: !isBS ? "rgba(245,166,35,0.2)" : "transparent",
                border: "1px solid rgba(245,166,35,0.5)",
                borderRight: "none",
                padding: "7px 16px",
                borderRadius: "8px 0 0 8px",
                cursor: "default", outline: "none",
                transition: "background 0.4s ease, color 0.4s ease",
              }}
            >
              A.D
            </button>
            <button
              type="button"
              key={clickingAD ? `btn-bs-${phaseIdx}` : "btn-bs"}
              className={clickingAD ? "toggle-click-r" : ""}
              style={{
                fontFamily: MONO, fontSize: "12px", letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: isBS ? "#e8d5b7" : "rgba(245,166,35,0.7)",
                background: isBS ? "rgba(245,166,35,0.2)" : "transparent",
                border: "1px solid rgba(245,166,35,0.5)",
                padding: "7px 16px",
                borderRadius: "0 8px 8px 0",
                cursor: "default", outline: "none",
                transition: "background 0.4s ease, color 0.4s ease",
              }}
            >
              B.S
            </button>
          </div>

          {/* Lock button */}
          <button
            type="button"
            key={clickingLock ? `lock-${phaseIdx}` : "lock"}
            className={clickingLock ? "lock-click" : isLocked ? "lock-seal" : ""}
            style={{
              background: isLocked ? "rgba(245,166,35,0.15)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${isLocked ? "rgba(245,166,35,0.45)" : "rgba(255,255,255,0.12)"}`,
              borderRadius: "8px", padding: "7px 12px",
              display: "flex", alignItems: "center",
              cursor: "default",
              color: isLocked ? GOLD : "rgba(232,213,183,0.45)",
              boxShadow: isLocked ? "0 0 10px rgba(245,166,35,0.2)" : "none",
              transition: "all 0.35s ease",
            }}
          >
            {isLocked
              ? <Lock size={16} />
              : <LockOpen size={16} />}
          </button>
        </div>

        {/* ── Status bar ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(245,166,35,0.07)",
          border: "1px solid rgba(245,166,35,0.2)",
          borderRadius: "24px", padding: "7px 14px",
          marginBottom: "16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: GOLD, display: "inline-block" }} />
            <span style={{
              fontFamily: MONO, fontSize: "11px", letterSpacing: "0.04em",
              color: "#e8d5b7",
              transition: "opacity 0.35s ease",
              opacity: calFading ? 0 : 1,
            }}>
              {currentView.status}
            </span>
          </div>
          <span style={{
            fontFamily: MONO, fontSize: "9px", letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: isLocked ? GOLD : "rgba(232,213,183,0.28)",
            transition: "color 0.4s ease",
          }}>
            {isLocked ? "locked" : "unlocked"}
          </span>
        </div>

        {/* ── Calendar month cards ── */}
        <div style={{
          display: "flex", gap: "8px",
          opacity: calFading ? 0 : 1,
          transition: "opacity 0.38s ease",
        }}>
          {currentView.months.map(m => (
            <MockMonthCard key={m.name} month={m} />
          ))}
        </div>

        {/* ── System label ── */}
        <div style={{
          textAlign: "center", marginTop: "12px",
          fontFamily: MONO, fontSize: "10px", letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: isBS ? "rgba(245,166,35,0.6)" : "rgba(232,213,183,0.28)",
          transition: "color 0.4s ease",
          opacity: calFading ? 0 : 1,
        }}>
          {currentView.label}
        </div>

        {/* Description */}
        <div style={{
          marginTop: "18px", fontFamily: MONO, fontSize: "11px",
          color: "rgba(232,213,183,0.45)", lineHeight: 1.7, textAlign: "center",
        }}>
          Click the <span style={{ color: GOLD }}>Lock</span> icon to lock your range, then use
          the <span style={{ color: GOLD }}>A.D / B.S</span> toggle to view the same dates
          in either calendar system.
        </div>
      </div>
    </div>
  );
}
