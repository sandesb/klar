import { useState } from "react";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];
const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}
function sameDay(a, b) {
  return a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function formatDate(d) {
  if (!d) return "";
  return `${(d.getMonth()+1).toString().padStart(2,"0")}/${d.getDate().toString().padStart(2,"0")}`;
}
function formatLong(d) {
  if (!d) return "";
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
function parseMMDD(str, year = 2026) {
  if (!str) return null;
  const clean = str.replace(/[^\d]/g, "");
  if (clean.length === 4) {
    const m = parseInt(clean.slice(0,2), 10) - 1;
    const d = parseInt(clean.slice(2,4), 10);
    if (m >= 0 && m <= 11 && d >= 1 && d <= getDaysInMonth(year, m)) {
      return new Date(year, m, d);
    }
  }
  return null;
}

function MonthCalendar({ year, monthIdx, rangeStart, rangeEnd, hoverDate, onDayClick, onDayHover, selecting }) {
  const daysInMonth = getDaysInMonth(year, monthIdx);
  const firstDay = getFirstDayOfMonth(year, monthIdx);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const today = new Date();
  const effectiveEnd = rangeEnd || hoverDate;

  function inRange(date) {
    if (!rangeStart || !effectiveEnd) return false;
    const t = date.getTime();
    const s = Math.min(rangeStart.getTime(), effectiveEnd.getTime());
    const e = Math.max(rangeStart.getTime(), effectiveEnd.getTime());
    return t >= s && t <= e;
  }
  function isEdge(date, which) {
    if (!rangeStart) return false;
    if (!effectiveEnd) return which === "start" && sameDay(date, rangeStart);
    const s = rangeStart <= effectiveEnd ? rangeStart : effectiveEnd;
    const e = rangeStart <= effectiveEnd ? effectiveEnd : rangeStart;
    return which === "start" ? sameDay(date, s) : sameDay(date, e);
  }

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "16px",
      padding: "18px",
    }}>
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: "13px", letterSpacing: "0.1em",
        textTransform: "uppercase", color: "#e8d5b7",
        marginBottom: "14px", textAlign: "center",
      }}>
        {MONTHS[monthIdx]}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
        {DAYS.map(d => (
          <div key={d} style={{
            textAlign: "center", fontSize: "9px",
            fontFamily: "'DM Mono', monospace",
            color: "rgba(232,213,183,0.28)",
            letterSpacing: "0.04em", paddingBottom: "7px",
          }}>{d}</div>
        ))}

        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const date = new Date(year, monthIdx, day);
          const inR = inRange(date);
          const isS = isEdge(date, "start");
          const isE = isEdge(date, "end");
          const isEdgeDay = isS || isE;
          const isSolo = sameDay(date, rangeStart) && !rangeEnd && !hoverDate;
          const isToday = date.toDateString() === today.toDateString();
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const col = date.getDay();

          let borderRadius = "50%";
          if (inR && !isEdgeDay) {
            if (col === 0) borderRadius = "50% 0 0 50%";
            else if (col === 6) borderRadius = "0 50% 50% 0";
            else borderRadius = "0";
          }

          return (
            <div
              key={day}
              onClick={() => onDayClick(date)}
              onMouseEnter={() => onDayHover(date)}
              onMouseLeave={() => onDayHover(null)}
              style={{
                position: "relative",
                textAlign: "center",
                padding: "5px 0",
                cursor: "pointer",
                borderRadius,
                background: isEdgeDay || isSolo
                  ? "linear-gradient(135deg, #f5a623, #e8793a)"
                  : inR ? "rgba(245,166,35,0.2)" : "transparent",
                color: isEdgeDay || isSolo ? "#1a0e00"
                  : inR ? "#f5c870"
                  : isWeekend ? "rgba(232,213,183,0.4)" : "rgba(232,213,183,0.75)",
                fontSize: "11px",
                fontFamily: "'DM Mono', monospace",
                fontWeight: isEdgeDay || isSolo ? "700" : "400",
                boxShadow: isEdgeDay || isSolo ? "0 0 10px rgba(245,166,35,0.45)" : "none",
                outline: isToday && !inR && !isEdgeDay ? "1px solid rgba(245,166,35,0.35)" : "none",
                outlineOffset: "-2px",
                transition: "background 0.1s, color 0.1s",
                userSelect: "none",
                zIndex: isEdgeDay ? 1 : 0,
              }}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DateInput({ label, value, onChange, placeholder, active }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
      <label style={{
        fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase",
        color: active ? "rgba(245,166,35,0.8)" : "rgba(245,166,35,0.45)",
        fontFamily: "'DM Mono', monospace", transition: "color 0.2s",
      }}>{label}</label>
      <input
        type="text"
        inputMode="numeric"
        maxLength={5}
        value={value}
        onChange={e => {
          let v = e.target.value.replace(/[^\d/]/g, "").replace(/\//g, "");
          if (v.length > 2) v = v.slice(0,2) + "/" + v.slice(2,4);
          onChange(v);
        }}
        placeholder={placeholder}
        style={{
          background: active ? "rgba(245,166,35,0.1)" : "transparent",
          border: active ? "1px solid rgba(245,166,35,0.45)" : "none",
          borderRadius: "10px",
          padding: "12px 0",
          color: "#e8d5b7",
          fontFamily: "'DM Mono', monospace",
          fontSize: "20px",
          letterSpacing: "0.08em",
          outline: "none",
          width: "100%",
          boxSizing: "border-box",
          textAlign: "center",
          transition: "border 0.2s, background 0.2s",
          boxShadow: active ? "0 0 20px rgba(245,166,35,0.08)" : "none",
        }}
      />
    </div>
  );
}

export default function CalendarApp() {
  const YEAR = 2026;
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);
  const [selecting, setSelecting] = useState(false);

  function handleStartChange(v) {
    setStartInput(v);
    const d = parseMMDD(v, YEAR);
    if (d) { setRangeStart(d); setSelecting(true); setRangeEnd(null); setEndInput(""); }
    else if (!v) { setRangeStart(null); setSelecting(false); }
  }

  function handleEndChange(v) {
    setEndInput(v);
    const d = parseMMDD(v, YEAR);
    if (d) { setRangeEnd(d); setSelecting(false); }
    else if (!v) { setRangeEnd(null); }
  }

  function handleDayClick(date) {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(date);
      setRangeEnd(null);
      setStartInput(formatDate(date));
      setEndInput("");
      setSelecting(true);
    } else {
      setRangeEnd(date);
      setEndInput(formatDate(date));
      setSelecting(false);
    }
  }

  function handleDayHover(date) {
    if (selecting && rangeStart && !rangeEnd) setHoverDate(date);
    else setHoverDate(null);
  }

  function clearRange() {
    setRangeStart(null); setRangeEnd(null);
    setStartInput(""); setEndInput("");
    setSelecting(false); setHoverDate(null);
  }

  const hasRange = rangeStart && rangeEnd;
  let days = 0, displayStart = null, displayEnd = null;
  if (hasRange) {
    displayStart = rangeStart < rangeEnd ? rangeStart : rangeEnd;
    displayEnd   = rangeStart < rangeEnd ? rangeEnd   : rangeStart;
    days = Math.round((displayEnd - displayStart) / (1000*60*60*24)) + 1;
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0d0805 0%, #1a0e00 40%, #0a0d1a 100%)",
      fontFamily: "'DM Mono', monospace",
      padding: "36px 24px 60px",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <div style={{
          fontSize: "10px", letterSpacing: "0.3em",
          color: "rgba(245,166,35,0.5)", textTransform: "uppercase",
          marginBottom: "10px",
        }}>Year at a Glance</div>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(48px,8vw,90px)",
          color: "#e8d5b7", margin: 0,
          letterSpacing: "-0.02em", lineHeight: 1,
          textShadow: "0 0 60px rgba(245,166,35,0.15)",
        }}>Klar</h1>
           <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(42px,8vw,90px)",
          color: "#e8d5b7", margin: 0,
          letterSpacing: "-0.02em", lineHeight: 1,
          textShadow: "0 0 60px rgba(245,166,35,0.15)",
        }}>2026</h1>
      </div>

      {/* Controls */}
      <div style={{ maxWidth: "480px", margin: "0 auto 40px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
          <DateInput label="Start" value={startInput} onChange={handleStartChange} placeholder="MM/DD" active={!rangeStart} />
          <div style={{ color: "rgba(245,166,35,0.35)", fontSize: "22px", paddingBottom: "11px", flexShrink: 0 }}>→</div>
          <DateInput label="End" value={endInput} onChange={handleEndChange} placeholder="MM/DD" active={selecting && !!rangeStart && !rangeEnd} />
          {(rangeStart || startInput) && (
            <button onClick={clearRange} title="Clear" style={{
              background: "transparent",
              border: "none",
              borderRadius: "10px", padding: "12px 13px",
              color: "rgba(232,213,183,0.4)", fontSize: "15px",
              cursor: "pointer", flexShrink: 0, alignSelf: "flex-end",
              fontFamily: "inherit",
            }}>✕</button>
          )}
        </div>

        {/* Status */}
        <div style={{ minHeight: "30px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {hasRange ? (
            <div style={{
              display: "flex", alignItems: "center", gap: "10px",
              background: "rgba(245,166,35,0.09)", border: "1px solid rgba(245,166,35,0.2)",
              borderRadius: "20px", padding: "6px 18px",
              fontSize: "12px", color: "#f5a623", letterSpacing: "0.04em",
            }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#f5a623", boxShadow: "0 0 8px #f5a623", display: "inline-block" }} />
              {formatLong(displayStart)} → {formatLong(displayEnd)}
              <span style={{ color: "rgba(245,166,35,0.4)" }}>·</span>
              <span style={{ color: "rgba(232,213,183,0.55)" }}>{days} days</span>
            </div>
          ) : selecting && rangeStart ? (
            <div style={{ fontSize: "11px", color: "rgba(232,213,183,0.3)", letterSpacing: "0.05em", animation: "blink 1.6s ease-in-out infinite" }}>
              ↓ Click a date on the calendar to set the end date
            </div>
          ) : (
            <div style={{ fontSize: "11px", color: "rgba(232,213,183,0.18)", letterSpacing: "0.04em" }}>
              Enter MM/DD above or click any date on the calendar
            </div>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <div
        className="calendar-grid"
        style={{
          maxWidth: "1200px", margin: "0 auto",
          display: "grid", gap: "12px",
        }}
      >
        {MONTHS.map((_, i) => (
          <MonthCalendar
            key={i} year={YEAR} monthIdx={i}
            rangeStart={rangeStart} rangeEnd={rangeEnd}
            hoverDate={hoverDate} selecting={selecting}
            onDayClick={handleDayClick} onDayHover={handleDayHover}
          />
        ))}
      </div>

      {/* Legend */}
      <div style={{
        maxWidth: "1200px", margin: "26px auto 0",
        display: "flex", justifyContent: "center", gap: "22px",
        fontSize: "10px", color: "rgba(232,213,183,0.28)", letterSpacing: "0.05em",
      }}>
        {[
          { bg: "linear-gradient(135deg,#f5a623,#e8793a)", r: "50%", label: "Start / End" },
          { bg: "rgba(245,166,35,0.2)", r: "3px", label: "In Range" },
          { bg: "transparent", r: "50%", bdr: "1px solid rgba(245,166,35,0.4)", label: "Today" },
        ].map(({ bg, r, bdr, label }) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <span style={{ width: "13px", height: "13px", borderRadius: r, background: bg, border: bdr, display: "inline-block", flexShrink: 0 }} />
            {label}
          </span>
        ))}
      </div>

      <style>{`
        .calendar-grid { grid-template-columns: repeat(auto-fill, minmax(228px, 1fr)); }
        @media (max-width: 768px) {
          .calendar-grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); }
        }
        @keyframes blink { 0%,100%{opacity:.4} 50%{opacity:.9} }
        input::placeholder { color: rgba(232,213,183,0.18); }
        input:focus { border-color: rgba(245,166,35,0.5) !important; background: rgba(245,166,35,0.1) !important; }
      `}</style>
    </div>
  );
}
