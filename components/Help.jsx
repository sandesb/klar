import { useState } from "react";
import {
  CalendarRange,
  CalendarMinus,
  CalendarPlus,
  Lock,
  LockOpen,
  MousePointerClick,
  Timer,
  ClipboardList,
  ChevronRight,
} from "lucide-react";
import ToggleYearDemo from "./ToggleYearDemo.jsx";

const GOLD = "rgba(245,166,35,0.9)";
const DIM = "rgba(232,213,183,0.65)";
const MONO = "'DM Mono', monospace";
const SERIF = "'Playfair Display', serif";

function IconChip({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        background: "rgba(245,166,35,0.1)",
        border: "1px solid rgba(245,166,35,0.25)",
        borderRadius: "8px",
        padding: "3px 8px",
        color: GOLD,
        fontFamily: MONO,
        fontSize: "11px",
        verticalAlign: "middle",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Row({ icon: Icon, iconColor = GOLD, label, desc, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => onClick && setHovered(true)}
      onMouseLeave={() => onClick && setHovered(false)}
      style={{
        display: "flex",
        gap: "14px",
        alignItems: "flex-start",
        padding: "12px 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        cursor: onClick ? "pointer" : "default",
        background: hovered ? "rgba(245,166,35,0.04)" : "transparent",
        borderRadius: onClick ? "8px" : "0",
        transition: "background 0.15s ease",
        margin: onClick ? "0 -6px" : "0",
        paddingLeft: onClick ? "6px" : "0",
        paddingRight: onClick ? "6px" : "0",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: "34px",
          height: "34px",
          borderRadius: "10px",
          background: "rgba(245,166,35,0.08)",
          border: "1px solid rgba(245,166,35,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: iconColor,
        }}
      >
        {Icon && <Icon size={17} />}
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: "11px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: GOLD,
            marginBottom: "3px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {label}
          {onClick && (
            <>
              <span
                style={{
                  marginLeft: "8px",
                  display: "inline-flex",
                  alignItems: "center",
                  background: "rgba(70,200,110,0.12)",
                  border: "1px solid rgba(70,200,110,0.4)",
                  borderRadius: "6px",
                  padding: "2px 8px",
                  fontSize: "9px",
                  letterSpacing: "0.12em",
                  color: "rgba(70,200,110,0.9)",
                  fontFamily: MONO,
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Try it
              </span>
              <ChevronRight size={12} style={{ color: "rgba(245,166,35,0.5)", marginLeft: "auto" }} />
            </>
          )}
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: "11.5px",
            color: DIM,
            lineHeight: 1.6,
          }}
        >
          {desc}
        </div>
      </div>
    </div>
  );
}

export default function Help({ open, onClose }) {
  const [activeDemo, setActiveDemo] = useState(null);

  if (!open) return null;

  return (
    <div
      onClick={activeDemo ? undefined : onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          background: "linear-gradient(180deg, #1a0e00 0%, #0d0805 100%)",
          border: "1px solid rgba(245,166,35,0.25)",
          borderRadius: "16px",
          padding: "28px 28px 20px",
          boxShadow: "0 16px 48px rgba(0,0,0,0.6), 0 0 24px rgba(245,166,35,0.07)",
          width: "100%",
          maxWidth: "520px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* close */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            background: "transparent",
            border: "none",
            color: "rgba(232,213,183,0.45)",
            fontSize: "16px",
            cursor: "pointer",
            lineHeight: 1,
            padding: "4px 6px",
            fontFamily: MONO,
          }}
          title="Close"
        >
          ✕
        </button>

        {activeDemo === "toggleYear" ? (
          <ToggleYearDemo onBack={() => setActiveDemo(null)} />
        ) : (
          <>
          {/* heading */}
          <div style={{ marginBottom: "20px" }}>
            <div
              style={{
                fontFamily: SERIF,
                fontSize: "22px",
                color: "#e8d5b7",
                letterSpacing: "0.03em",
                marginBottom: "4px",
              }}
            >
              Using Klar<span style={{ color: "rgba(237, 135, 19, 0.9)" }}>'</span>y (Demo/Tutorial)
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: "10px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(245,166,35,0.5)",
              }}
            >
              Quick Guide
            </div>
          </div>

          {/* rows */}
          <Row
            icon={() => (
              <span style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "0.1em", color: GOLD }}>
                A.D
              </span>
            )}
            label="Toggle Year System"
            desc={
              <>
                Switch between <IconChip>A.D</IconChip> (English) and{" "}
                <IconChip>B.S</IconChip> (Nepali / Bikram Sambat) calendar views.
              </>
            }
            onClick={() => setActiveDemo("toggleYear")}
          />

        <Row
          icon={MousePointerClick}
          label="Pick a Date Range"
          desc="Click any date on the calendar to set the Start date, then click another to set the End date. The range and working days appear instantly."
        />

        <Row
          icon={() => (
            <span style={{ fontFamily: MONO, fontSize: "13px", color: GOLD }}>6/7</span>
          )}
          label="Manual Date Entry"
          desc={
            <>
              Type directly into the <IconChip>Start</IconChip> or{" "}
              <IconChip>End</IconChip> input fields (format: MM/DD) to set the range without clicking the calendar.
            </>
          }
        />

        <Row
          icon={CalendarRange}
          label="Days Mode"
          desc={
            <>
              Click the <IconChip><CalendarRange size={11} /> Calendar</IconChip> icon to enter a number of days (e.g. 150). The range is automatically counted forward from today. <strong style={{ color: "#e8d5b7" }}>Long-press</strong> the same icon to view your saved date ranges.
            </>
          }
        />

        <Row
          icon={() => (
            <span style={{ fontFamily: MONO, fontSize: "11px", color: "rgba(70,200,110,0.9)" }}>
              Days
            </span>
          )}
          iconColor="rgba(70,200,110,0.9)"
          label="Working Days"
          desc="After setting a range, the total working days (Mon–Fri by default) are shown in the middle of the range bar."
        />

        <Row
          icon={CalendarMinus}
          label="Exclude Weekends"
          desc={
            <>
              Click <IconChip><CalendarMinus size={11} /> Calendar−</IconChip> to mark weekends in <span style={{ color: "rgba(255,120,120,0.9)" }}>red</span> and exclude them. Working day count updates automatically.
            </>
          }
        />

        <Row
          icon={CalendarPlus}
          label="Custom Working Days"
          desc={
            <>
              Click <IconChip><CalendarPlus size={11} /> Calendar+</IconChip> to enter 1–6 working days per week (e.g. 5 = Mon–Fri). Active working days show in <span style={{ color: "rgba(100,180,255,0.9)" }}>blue</span>.
            </>
          }
        />

        <Row
          icon={Lock}
          label="Lock & Switch View"
          desc={
            <>
              Click the <IconChip><LockOpen size={11} /> Lock</IconChip> icon to lock your range, then freely toggle A.D / B.S to see the same range in both calendar systems.
            </>
          }
        />

        <Row
          icon={() => <Timer size={17} color={GOLD} />}
          label="Save a Range"
          desc={
            <>
              <strong style={{ color: "#e8d5b7" }}>Long-press</strong> the <IconChip><Lock size={11} /> Lock</IconChip> icon to save the current range with a custom name for future reference.
            </>
          }
        />

        <Row
          icon={ClipboardList}
          label="To-Do Tasks on a Day"
          desc={
            <>
              When a saved range is loaded, <strong style={{ color: "#e8d5b7" }}>long-press any date</strong> in the range to open a task list for that day. Add tasks, mark them done, and delete completed ones.
            </>
          }
        />

        <div
          style={{
            textAlign: "center",
            marginTop: "18px",
            fontFamily: MONO,
            fontSize: "10px",
            letterSpacing: "0.12em",
            color: "rgba(232,213,183,0.2)",
          }}
        >
          · click anywhere outside to close ·
        </div>
        </>
        )}
      </div>
    </div>
  );
}
