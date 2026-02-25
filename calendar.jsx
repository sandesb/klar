import { useRef } from "react";

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

/** Local date key YYYY-MM-DD for override lookups */
export function toDateKey(d) {
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
 * excludeWeekends: Mon–Fri working, Sat/Sun red
 * customWorkingDays: first N days of week (0..N-1) are working (blue); rest + Sat always red
 * deducted/added: date keys (YYYY-MM-DD) for review-mode overrides (red/blue)
 * isReviewMode: dates in range are clickable to toggle blue/yellow/red (Saturdays locked yellow)
 * onDayLongPress: (date) => {} when user long-presses a day in review mode (saved range)
 */
const LONG_PRESS_MS = 500;

export function MonthCalendar({ monthLabel, cells, rangeStart, rangeEnd, hoverDate, onDayClick, onDayHover, excludeWeekends, customWorkingDays, deducted = [], added = [], isReviewMode = false, onDayToggle = () => {}, onDayLongPress }) {
  const today = new Date();
  const effectiveEnd = rangeEnd || hoverDate;
  const longPressTimerRef = useRef(null);
  const longPressFiredRef = useRef(false);

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
      border: "1px solid rgba(245,166,35,0.45)",
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
          const todayInRange = isToday && (inR || isEdgeDay || isSolo);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const col = date.getDay();
          const isSaturday = col === 6;
          const dateKey = toDateKey(date);
          const isDeducted = isReviewMode && inR && deducted.includes(dateKey);
          const isAdded = isReviewMode && inR && added.includes(dateKey);
          const saturdayLockedRed = isReviewMode && inR && isSaturday;

          let isExcludedWeekend = excludeWeekends && inR && isWeekend;
          let isCustomWorking = customWorkingDays != null && inR && col < customWorkingDays && col !== 6;
          let isCustomExcluded = customWorkingDays != null && inR && col === 6;
          if (isReviewMode && inR) {
            if (saturdayLockedRed) {
              isCustomExcluded = true;
              isCustomWorking = false;
              isExcludedWeekend = false;
            } else if (isDeducted) {
              isCustomWorking = false;
              isCustomExcluded = true;
              isExcludedWeekend = false;
            } else if (isAdded) {
              isCustomExcluded = false;
              isCustomWorking = true;
              isExcludedWeekend = false;
            }
          }

          let borderRadius = "25px";
          if (inR && !isEdgeDay) {
            if (col === 0) borderRadius = "50% 0 0 50%";
            else if (col === 6) borderRadius = "0 50% 50% 0";
            else borderRadius = "0";
          }

          function clearLongPress() {
            if (longPressTimerRef.current) {
              clearTimeout(longPressTimerRef.current);
              longPressTimerRef.current = null;
              console.log("[Todo long-press] timer cleared (mouse up/leave or touch end)");
            }
          }

          function startLongPress() {
            if (!isReviewMode || !inR || !onDayLongPress) {
              if (isReviewMode && inR) console.log("[Todo long-press] start skipped: onDayLongPress?", !!onDayLongPress);
              return;
            }
            console.log("[Todo long-press] timer started", date.toDateString());
            longPressTimerRef.current = setTimeout(() => {
              longPressTimerRef.current = null;
              longPressFiredRef.current = true;
              console.log("[Todo long-press] FIRED → opening todo dialog for", date.toDateString());
              onDayLongPress(date);
            }, LONG_PRESS_MS);
          }

          function handleDayInteraction(e) {
            if (e.type === "touchend") e.preventDefault();
            if (isReviewMode && longPressFiredRef.current) {
              longPressFiredRef.current = false;
              return;
            }
            if (isReviewMode) {
              if (inR && !isSaturday) onDayToggle(date);
            } else {
              onDayClick(date);
            }
          }

          return (
            <div
              key={`${i}-${dayNum}`}
              onClick={handleDayInteraction}
              onMouseDown={startLongPress}
              onMouseUp={clearLongPress}
              onMouseLeave={() => { clearLongPress(); onDayHover(null); }}
              onTouchStart={startLongPress}
              onTouchEnd={(e) => { clearLongPress(); handleDayInteraction(e); }}
              onTouchCancel={clearLongPress}
              onMouseEnter={() => onDayHover(date)}
              style={{
                position: "relative",
                textAlign: "center",
                padding: "5px 0",
                cursor: "pointer",
                borderRadius,
                background: isToday && !todayInRange
                  ? "rgba(70, 200, 110, 0.5)"
                  : isCustomExcluded
                  ? "rgba(200, 80, 80, 0.35)"
                  : isCustomWorking
                    ? "rgba(80, 140, 200, 0.4)"
                    : isExcludedWeekend
                      ? "rgba(200, 80, 80, 0.35)"
                      : isEdgeDay || isSolo
                        ? "linear-gradient(135deg, #f5a623, #e8793a)"
                        : inR ? "rgba(245,166,35,0.2)" : "transparent",
                color: isToday && !todayInRange
                  ? "rgba(220, 255, 220, 0.98)"
                  : isCustomExcluded
                  ? "rgba(255,200,200,0.9)"
                  : isCustomWorking
                    ? "rgba(200, 220, 255, 0.95)"
                    : isExcludedWeekend ? "rgba(255,200,200,0.9)"
                    : isEdgeDay || isSolo ? "#1a0e00"
                    : inR ? "#f5c870"
                    : isWeekend ? "rgba(232,213,183,0.4)" : "rgba(232,213,183,0.75)",
                fontSize: "11px",
                fontFamily: "'DM Mono', monospace",
                fontWeight: isToday || isEdgeDay || isSolo ? "700" : "400",
                boxShadow: isToday ? "0 0 10px rgba(70,200,110,0.55)" : isCustomExcluded ? "0 0 8px rgba(200,80,80,0.5)" : isCustomWorking ? "0 0 8px rgba(80,140,200,0.5)" : isExcludedWeekend ? "0 0 8px rgba(200,80,80,0.5)" : isEdgeDay || isSolo ? "0 0 10px rgba(245,166,35,0.45)" : "none",
                outline: isToday ? "1px solid rgba(70,200,110,0.75)" : isCustomExcluded ? "1px solid rgba(200,80,80,0.6)" : isCustomWorking ? "1px solid rgba(80,140,200,0.6)" : isExcludedWeekend ? "1px solid rgba(200,80,80,0.6)" : "none",
                transition: "background 0.35s ease, color 0.35s ease, box-shadow 0.35s ease, outline 0.35s ease",
                userSelect: "none",
                zIndex: isEdgeDay || isToday ? 1 : 0,
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

export function DateInput({ label, value, onChange, placeholder, active, disabled, persistBorder }) {
  const showBorder = active || persistBorder;
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
        disabled={disabled}
        onChange={e => {
          let v = e.target.value.replace(/[^\d/]/g, "").replace(/\//g, "");
          if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2, 4);
          onChange(v);
        }}
        placeholder={placeholder}
        style={{
          background: active ? "rgba(245,166,35,0.1)" : "transparent",
          border: showBorder ? "1px solid rgba(245,166,35,0.45)" : "none",
          borderRadius: "10px",
          padding: "12px 0",
          color: "#e8d5b7",
          fontFamily: value ? "'Playfair Display', serif" : "'DM Mono', monospace",
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
