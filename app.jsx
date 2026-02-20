import "./main.css";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import Calendar2026 from "./calendar-2026.jsx";
import Calendar2082 from "./calendar-2082.jsx";

function CalendarToggle({ isBS, onSwitch }) {
  return (
    <div
      style={{
        paddingTop: "16px",
        paddingBottom: "8px",
        display: "flex",
        justifyContent: "center",
        gap: "0",
      }}
    >
      <button
        type="button"
        onClick={() => onSwitch(false)}
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "11px",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: !isBS ? "#e8d5b7" : "rgba(232,213,183,0.4)",
          background: !isBS ? "rgba(245,166,35,0.15)" : "transparent",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRight: "none",
          padding: "8px 16px",
          borderRadius: "8px 0 0 8px",
          cursor: "pointer",
          outline: "none",
        }}
      >
        A.D
      </button>
      <button
        type="button"
        onClick={() => onSwitch(true)}
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "11px",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: isBS ? "#e8d5b7" : "rgba(232,213,183,0.4)",
          background: isBS ? "rgba(245,166,35,0.15)" : "transparent",
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "8px 16px",
          borderRadius: "0 8px 8px 0",
          cursor: "pointer",
          outline: "none",
        }}
      >
        B.S
      </button>
    </div>
  );
}

function App() {
  const [isBS, setIsBS] = useState(false);
  const [lockedRange, setLockedRange] = useState(null); // { start: Date, end: Date } when locked
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(0deg, #0d0805 0%, #1a0e00 40%, #0a0d1a 100%)" }}>
      <CalendarToggle isBS={isBS} onSwitch={setIsBS} />
      {isBS ? (
        <Calendar2082 lockedRange={lockedRange} onLockRange={setLockedRange} />
      ) : (
        <Calendar2026 lockedRange={lockedRange} onLockRange={setLockedRange} />
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
