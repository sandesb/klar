export const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export const MONTHS_AD = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export function sameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatDate(d) {
  if (!d) return "";
  return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`;
}

export function formatLong(d, monthNames = MONTHS_AD) {
  if (!d) return "";
  return `${monthNames[d.getMonth()]} ${d.getDate()}`;
}

export function parseMMDD(str, year = 2026) {
  if (!str) return null;
  const clean = str.replace(/[^\d]/g, "");
  if (clean.length === 4) {
    const m = parseInt(clean.slice(0, 2), 10) - 1;
    const d = parseInt(clean.slice(2, 4), 10);
    if (m >= 0 && m <= 11 && d >= 1 && d <= getDaysInMonth(year, m)) {
      return new Date(year, m, d);
    }
  }
  return null;
}

/**
 * cells: array of null (empty cell) or { date: Date, dayNum: number }
 */
export function MonthCalendar({ monthLabel, cells, rangeStart, rangeEnd, hoverDate, onDayClick, onDayHover }) {
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
        {monthLabel}
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

        {cells.map((cell, i) => {
          if (!cell) return <div key={`e-${i}`} />;
          const { date, dayNum } = cell;
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
              key={`${i}-${dayNum}`}
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
              {dayNum}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DateInput({ label, value, onChange, placeholder, active }) {
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
          if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2, 4);
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
