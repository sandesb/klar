import { useState } from "react";
import {
  CalendarRange,
  CalendarMinus,
  CalendarPlus,
  Lock,
  Timer,
  ClipboardList,
  Palette,
  MousePointerClick,
  Calendar,
  Briefcase,
  Bookmark,
} from "lucide-react";
import ToggleYearDemo        from "./ToggleYearDemo.jsx";
import PickDateRangeDemo     from "./PickDateRangeDemo.jsx";
import ManualDateEntryDemo   from "./ManualDateEntryDemo.jsx";
import DaysModeDemo          from "./DaysModeDemo.jsx";
import ExcludeWeekendsDemo   from "./ExcludeWeekendsDemo.jsx";
import CustomWorkingDaysDemo from "./CustomWorkingDaysDemo.jsx";
import LockSwitchDemo        from "./LockSwitchDemo.jsx";
import SaveRangeDemo         from "./SaveRangeDemo.jsx";
import TodoTasksDemo         from "./TodoTasksDemo.jsx";
import ColorSystemDemo       from "./ColorSystemDemo.jsx";

const GOLD  = "rgba(245,166,35,0.9)";
const MONO  = "'DM Mono', monospace";
const SERIF = "'Playfair Display', serif";

// ─── Category section header ───────────────────────────────────
function SectionHeader({ icon: Icon, label }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "8px",
      marginBottom: "8px", marginTop: "18px",
    }}>
      <Icon size={11} color="rgba(245,166,35,0.5)" />
      <span style={{
        fontFamily: MONO, fontSize: "9px", letterSpacing: "0.22em",
        textTransform: "uppercase", color: "rgba(245,166,35,0.45)",
        whiteSpace: "nowrap",
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: "1px", background: "rgba(245,166,35,0.12)" }} />
    </div>
  );
}

// ─── Individual icon card ──────────────────────────────────────
function IconCard({ iconContent, label, onClick, hasTryIt, dim }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => onClick && setHovered(true)}
      onMouseLeave={() => onClick && setHovered(false)}
      style={{
        position: "relative",
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: "7px",
        padding: "11px 6px 10px",
        borderRadius: "12px",
        background: hovered
          ? "rgba(245,166,35,0.09)"
          : dim
            ? "rgba(255,255,255,0.015)"
            : "rgba(255,255,255,0.03)",
        border: hovered
          ? "1px solid rgba(245,166,35,0.32)"
          : "1px solid rgba(255,255,255,0.07)",
        cursor: onClick ? "pointer" : "default",
        transition: "background 0.15s ease, border-color 0.15s ease",
        userSelect: "none",
      }}
    >
      {/* green dot for items with a demo */}
      {hasTryIt && (
        <div style={{
          position: "absolute", top: "7px", right: "7px",
          width: "5px", height: "5px", borderRadius: "50%",
          background: "rgba(70,200,110,0.8)",
          boxShadow: "0 0 5px rgba(70,200,110,0.6)",
        }} />
      )}

      {/* icon box */}
      <div style={{
        width: "36px", height: "36px", borderRadius: "10px",
        background: dim ? "rgba(245,166,35,0.04)" : "rgba(245,166,35,0.08)",
        border: "1px solid rgba(245,166,35,0.14)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: dim ? "rgba(245,166,35,0.45)" : GOLD,
      }}>
        {iconContent}
      </div>

      {/* label */}
      <div style={{
        fontFamily: MONO, fontSize: "9px", letterSpacing: "0.04em",
        textTransform: "uppercase", textAlign: "center", lineHeight: 1.35,
        color: dim ? "rgba(232,213,183,0.35)" : "rgba(232,213,183,0.65)",
        maxWidth: "80px",
      }}>
        {label}
      </div>
    </div>
  );
}

// ─── Main Help component ───────────────────────────────────────
export default function Help({ open, onClose }) {
  const [activeDemo, setActiveDemo] = useState(null);

  if (!open) return null;

  function go(demoId) { setActiveDemo(demoId); }
  function back()     { setActiveDemo(null);   }

  return (
    <div
      onClick={activeDemo ? undefined : onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 2000, padding: "16px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "relative",
          background: "linear-gradient(180deg,#1a0e00 0%,#0d0805 100%)",
          border: "1px solid rgba(245,166,35,0.25)",
          borderRadius: "16px",
          padding: "26px 24px 20px",
          boxShadow: "0 16px 48px rgba(0,0,0,0.6), 0 0 24px rgba(245,166,35,0.07)",
          width: "100%", maxWidth: "520px",
          maxHeight: "90vh", overflowY: "auto",
        }}
      >
        {/* close button */}
        <button
          type="button" onClick={onClose}
          style={{
            position: "absolute", top: "14px", right: "14px",
            background: "transparent", border: "none",
            color: "rgba(232,213,183,0.45)", fontSize: "16px",
            cursor: "pointer", lineHeight: 1,
            padding: "4px 6px", fontFamily: MONO,
          }}
          title="Close"
        >✕</button>

        {/* ─── DEMO router ─────────────────────────────────────── */}
        {activeDemo === "toggleYear"        ? <ToggleYearDemo        onBack={back} />
        : activeDemo === "pickDateRange"    ? <PickDateRangeDemo     onBack={back} />
        : activeDemo === "manualDateEntry"  ? <ManualDateEntryDemo   onBack={back} />
        : activeDemo === "daysMode"         ? <DaysModeDemo          onBack={back} />
        : activeDemo === "excludeWeekends"  ? <ExcludeWeekendsDemo   onBack={back} />
        : activeDemo === "customWorkingDays"? <CustomWorkingDaysDemo  onBack={back} />
        : activeDemo === "lockSwitch"       ? <LockSwitchDemo        onBack={back} />
        : activeDemo === "saveRange"        ? <SaveRangeDemo         onBack={back} />
        : activeDemo === "todoTasks"        ? <TodoTasksDemo         onBack={back} />
        : activeDemo === "colorSystem"      ? <ColorSystemDemo       onBack={back} />

        /* ─── MAIN GRID ─────────────────────────────────────── */
        : (
          <>
            {/* Heading */}
            <div style={{ marginBottom: "4px" }}>
              <div style={{
                fontFamily: SERIF, fontSize: "22px",
                color: "#e8d5b7", letterSpacing: "0.03em", marginBottom: "3px",
              }}>
                Using Klar<span style={{ color: "rgba(237,135,19,0.9)" }}>'</span>y
              </div>
              <div style={{
                fontFamily: MONO, fontSize: "10px", letterSpacing: "0.18em",
                textTransform: "uppercase", color: "rgba(245,166,35,0.45)",
                display: "flex", alignItems: "center", gap: "8px",
              }}>
                Demo &amp; Guide
                <span style={{
                  fontFamily: MONO, fontSize: "8.5px", letterSpacing: "0.08em",
                  color: "rgba(70,200,110,0.7)",
                  background: "rgba(70,200,110,0.08)",
                  border: "1px solid rgba(70,200,110,0.2)",
                  borderRadius: "5px", padding: "1px 6px",
                }}>● try it</span>
              </div>
            </div>

            {/* ── CATEGORY 1: Calendar & Dates ── */}
            <SectionHeader icon={Calendar} label="Calendar & Dates" />
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "7px",
            }}>
              <IconCard
                iconContent={
                  <span style={{ fontFamily: MONO, fontSize: "11px",
                    fontWeight: "700", letterSpacing: "0.05em", color: GOLD }}>
                    AD
                  </span>
                }
                label="Year Toggle"
                onClick={() => go("toggleYear")}
                hasTryIt
              />
              <IconCard
                iconContent={<MousePointerClick size={17} />}
                label="Pick Range"
                onClick={() => go("pickDateRange")}
                hasTryIt
              />
              <IconCard
                iconContent={
                  <span style={{ fontFamily: MONO, fontSize: "13px",
                    fontWeight: "700", color: GOLD }}>
                    6/7
                  </span>
                }
                label="Manual Entry"
                onClick={() => go("manualDateEntry")}
                hasTryIt
              />
              <IconCard
                iconContent={<CalendarRange size={17} />}
                label="Days Mode"
                onClick={() => go("daysMode")}
                hasTryIt
              />
            </div>

            {/* ── CATEGORY 2: Working Days ── */}
            <SectionHeader icon={Briefcase} label="Working Days" />
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "7px",
            }}>
              <IconCard
                iconContent={
                  <span style={{ fontFamily: MONO, fontSize: "12px",
                    fontWeight: "700", color: "rgba(70,200,110,0.85)" }}>
                    - 
                  </span>
                }
                label="Day Count"
                dim
              />
              <IconCard
                iconContent={<CalendarMinus size={17} />}
                label="No Weekends"
                onClick={() => go("excludeWeekends")}
                hasTryIt
              />
              <IconCard
                iconContent={<CalendarPlus size={17} />}
                label="Custom Days"
                onClick={() => go("customWorkingDays")}
                hasTryIt
              />
              <IconCard
                iconContent={<Palette size={17} />}
                label="Color Guide"
                onClick={() => go("colorSystem")}
                hasTryIt
              />
            </div>

            {/* ── CATEGORY 3: Saved Ranges & Tasks ── */}
            <SectionHeader icon={Bookmark} label="Saved Ranges & Tasks" />
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "7px",
            }}>
              <IconCard
                iconContent={<Lock size={17} />}
                label="Lock & Switch"
                onClick={() => go("lockSwitch")}
                hasTryIt
              />
              <IconCard
                iconContent={<Timer size={17} />}
                label="Save Range"
                onClick={() => go("saveRange")}
                hasTryIt
              />
              <IconCard
                iconContent={<ClipboardList size={17} />}
                label="To-Do Tasks"
                onClick={() => go("todoTasks")}
                hasTryIt
              />
            </div>

            {/* ── Color legend ── */}
            <div style={{
              marginTop: "20px",
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "12px",
              padding: "12px 14px",
            }}>
              <div style={{
                fontFamily: MONO, fontSize: "9px", letterSpacing: "0.22em",
                textTransform: "uppercase", color: "rgba(245,166,35,0.4)",
                marginBottom: "10px",
              }}>
                Color Guide
              </div>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr",
                gap: "6px 12px",
              }}>
                {[
                  { bg: "rgba(80,140,200,0.4)",  outline: "1px solid rgba(80,140,200,0.6)",  glow: "0 0 7px rgba(80,140,200,0.45)",  label: "Working day" },
                  { bg: "rgba(245,166,35,0.2)",  outline: "1px solid rgba(245,166,35,0.3)",  glow: "none",                           label: "Free / off day" },
                  { bg: "rgba(200,80,80,0.35)",  outline: "1px solid rgba(200,80,80,0.55)",  glow: "0 0 7px rgba(200,80,80,0.4)",    label: "Weekend / Wasted" },
                  { bg: "rgba(80,140,200,0.4)",  outline: "2px solid rgba(70,200,110,0.8)",  glow: "0 0 8px rgba(70,200,110,0.5)",   label: "Today – green border" },
                ].map(({ bg, outline, glow, label }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{
                      width: "16px", height: "16px", borderRadius: "50%", flexShrink: 0,
                      background: bg, outline, boxShadow: glow,
                    }} />
                    <span style={{
                      fontFamily: MONO, fontSize: "10.5px",
                      color: "rgba(232,213,183,0.65)", whiteSpace: "nowrap",
                    }}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* footer */}
            <div style={{
              textAlign: "center", marginTop: "14px",
              fontFamily: MONO, fontSize: "10px",
              letterSpacing: "0.12em",
              color: "rgba(232,213,183,0.18)",
            }}>
              · tap a card to see the demo · click outside to close ·
            </div>
          </>
        )}
      </div>
    </div>
  );
}
