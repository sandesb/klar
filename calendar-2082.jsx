import { useState } from "react";
import { CalendarRange, Lock, LockOpen } from "lucide-react";
import { MonthCalendar, DateInput } from "./calendar.jsx";

const BS_2082 = {
  year_bs: 2082,
  country: "Nepal",
  months: [
    { index: 1, name_en: "Baishakh / वैशाख", name_ne: "वैशाख", days: 31, starts_ad: "2025-04-14" },
    { index: 2, name_en: "Jestha / जेठ", name_ne: "जेठ", days: 31, starts_ad: "2025-05-15" },
    { index: 3, name_en: "Ashadh / असार", name_ne: "असार", days: 32, starts_ad: "2025-06-15" },
    { index: 4, name_en: "Shrawan / साउन", name_ne: "साउन", days: 32, starts_ad: "2025-07-17" },
    { index: 5, name_en: "Bhadra / भदौ", name_ne: "भदौ", days: 31, starts_ad: "2025-08-18" },
    { index: 6, name_en: "Ashwin / असोज", name_ne: "असोज", days: 30, starts_ad: "2025-09-18" },
    { index: 7, name_en: "Kartik / कात्तिक", name_ne: "कात्तिक", days: 30, starts_ad: "2025-10-18" },
    { index: 8, name_en: "Mangsir / मंसिर", name_ne: "मंसिर", days: 29, starts_ad: "2025-11-17" },
    { index: 9, name_en: "Poush / पुष", name_ne: "पुष", days: 29, starts_ad: "2025-12-16" },
    { index: 10, name_en: "Magh / माघ", name_ne: "माघ", days: 30, starts_ad: "2026-01-14" },
    { index: 11, name_en: "Falgun / फागुन", name_ne: "फागुन", days: 30, starts_ad: "2026-02-13" },
    { index: 12, name_en: "Chaitra / चैत", name_ne: "चैत", days: 30, starts_ad: "2026-03-15" },
  ],
};

const ONE_DAY_MS = 86400000;

/** Parse "MM/DD" as B.S. month (1–12) and day; return AD Date or null. */
function parseBSMMDD(str) {
  if (!str) return null;
  const clean = str.replace(/[^\d]/g, "");
  if (clean.length !== 4) return null;
  const monthNum = parseInt(clean.slice(0, 2), 10);
  const dayNum = parseInt(clean.slice(2, 4), 10);
  if (monthNum < 1 || monthNum > 12) return null;
  const month = BS_2082.months[monthNum - 1];
  if (dayNum < 1 || dayNum > month.days) return null;
  const startTs = new Date(month.starts_ad).getTime();
  return new Date(startTs + (dayNum - 1) * ONE_DAY_MS);
}

/** Given an AD Date, return B.S. "MM/DD" (month 01–12, day). */
function formatDateBS(date) {
  if (!date) return "";
  const ad = date.getTime();
  for (let i = 0; i < BS_2082.months.length; i++) {
    const m = BS_2082.months[i];
    const startTs = new Date(m.starts_ad).getTime();
    const endTs = startTs + (m.days - 1) * ONE_DAY_MS;
    if (ad >= startTs && ad <= endTs) {
      const day = Math.floor((ad - startTs) / ONE_DAY_MS) + 1;
      return `${(i + 1).toString().padStart(2, "0")}/${day.toString().padStart(2, "0")}`;
    }
  }
  return "";
}

/** Given an AD Date, return B.S. long label e.g. "Baishakh 1". */
function formatLongBS(date) {
  if (!date) return "";
  const ad = date.getTime();
  for (let i = 0; i < BS_2082.months.length; i++) {
    const m = BS_2082.months[i];
    const startTs = new Date(m.starts_ad).getTime();
    const endTs = startTs + (m.days - 1) * ONE_DAY_MS;
    if (ad >= startTs && ad <= endTs) {
      const day = Math.floor((ad - startTs) / ONE_DAY_MS) + 1;
      return `${m.name_en} ${day}`;
    }
  }
  return "";
}

function buildBSCells(month) {
  const startDate = new Date(month.starts_ad);
  const startTs = startDate.getTime();
  const firstDay = startDate.getDay();
  const days = month.days;
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= days; d++) {
    cells.push({
      date: new Date(startTs + (d - 1) * ONE_DAY_MS),
      dayNum: d,
    });
  }
  return cells;
}

export default function Calendar2082({ lockedRange, onLockRange }) {
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);
  const [selecting, setSelecting] = useState(false);
  const [showDaysInput, setShowDaysInput] = useState(false);
  const [daysInput, setDaysInput] = useState("");

  function handleStartChange(v) {
    setStartInput(v);
    const d = parseBSMMDD(v);
    if (d) {
      setRangeStart(d);
      setSelecting(true);
      setRangeEnd(null);
      setEndInput("");
    } else if (!v) {
      setRangeStart(null);
      setSelecting(false);
    }
  }

  function handleEndChange(v) {
    setEndInput(v);
    const d = parseBSMMDD(v);
    if (d) setRangeEnd(d);
    else if (!v) setRangeEnd(null);
    if (d) setSelecting(false);
  }

  function handleDayClick(date) {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(date);
      setRangeEnd(null);
      setStartInput(formatDateBS(date));
      setEndInput("");
      setSelecting(true);
    } else {
      setRangeEnd(date);
      setEndInput(formatDateBS(date));
      setSelecting(false);
    }
  }

  function handleDayHover(date) {
    if (selecting && rangeStart && !rangeEnd) setHoverDate(date);
    else setHoverDate(null);
  }

  function clearRange() {
    setRangeStart(null);
    setRangeEnd(null);
    setStartInput("");
    setEndInput("");
    setSelecting(false);
    setHoverDate(null);
  }

  function applyDaysRange() {
    const n = parseInt(daysInput, 10);
    if (!Number.isInteger(n) || n < 1 || n > 999) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + n - 1);
    setRangeStart(today);
    setRangeEnd(endDate);
    setStartInput(formatDateBS(today));
    setEndInput(formatDateBS(endDate));
    setSelecting(false);
    setShowDaysInput(false);
    setDaysInput("");
  }

  const hasRange = rangeStart && rangeEnd;
  let days = 0,
    displayStart = null,
    displayEnd = null;
  if (hasRange) {
    displayStart = rangeStart < rangeEnd ? rangeStart : rangeEnd;
    displayEnd = rangeStart < rangeEnd ? rangeEnd : rangeStart;
    days = Math.round((displayEnd - displayStart) / ONE_DAY_MS) + 1;
  }

  const effectiveRange = lockedRange
    ? { start: lockedRange.start, end: lockedRange.end }
    : hasRange
      ? { start: displayStart, end: displayEnd }
      : null;
  const effectiveStart = effectiveRange?.start ?? null;
  const effectiveEnd = effectiveRange?.end ?? null;
  const effectiveDays = effectiveRange
    ? Math.round((effectiveEnd - effectiveStart) / ONE_DAY_MS) + 1
    : 0;

  return (
    <div
      style={{
        fontFamily: "'DM Mono', monospace",
        padding: "36px 24px 60px",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Mono:wght@300;400;500&display=swap"
        rel="stylesheet"
      />

      <div style={{ textAlign: "center", marginBottom: "32px" }}>
      <h1
          className="brand-title"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(48px,8vw,90px)",
            color: "#e8d5b7",
            margin: 0,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            textShadow: "0 10px 60px rgba(115, 114, 117, 0.73)",
          }}
        >
          Klar<span style={{ color: "rgba(245, 165, 35, 0.8)" }}>'</span>y
        </h1>
        <div
          style={{
            fontSize: "10px",
            letterSpacing: "0.3em",
            color: "rgba(245,166,35,0.5)",
            textTransform: "uppercase",
            marginTop: "20px",
          }}
        >
          · A Calendar App By Sandy ·
        </div>
        <h1
                  className="brand-title"

          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(42px,8vw,90px)",
            color: "#e8d5b7",
            margin: 0,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            textShadow: "0 -80px 120px rgba(187, 187, 187, 0.37)",
          }}
        >
          {BS_2082.year_bs}
        </h1>
        <div
          style={{
            fontSize: "10px",
            letterSpacing: "0.3em",
            color: "rgba(245,166,35,0.5)",
            textTransform: "uppercase",
            marginBottom: "10px",
          }}
        >
          Year at a Glance
        </div>
      </div>

      <div
        style={{
          maxWidth: "480px",
          margin: "0 auto 40px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
          <DateInput
            label="Start"
            value={lockedRange ? formatDateBS(effectiveStart) : startInput}
            onChange={handleStartChange}
            placeholder="MM/DD"
            active={!lockedRange && !rangeStart}
            disabled={!!lockedRange}
          />
          <div
            style={{
              color: "rgba(245,166,35,0.35)",
              fontSize: "22px",
              paddingBottom: "11px",
              flexShrink: 0,
            }}
          >
            →
          </div>
          <DateInput
            label="End"
            value={lockedRange ? formatDateBS(effectiveEnd) : endInput}
            onChange={handleEndChange}
            placeholder="MM/DD"
            active={!lockedRange && selecting && !!rangeStart && !rangeEnd}
            disabled={!!lockedRange}
          />
          {(rangeStart || startInput) && (
            <button
              onClick={clearRange}
              title="Clear"
              style={{
                background: "transparent",
                border: "none",
                borderRadius: "10px",
                padding: "12px 13px",
                color: "rgba(232,213,183,0.4)",
                fontSize: "15px",
                cursor: "pointer",
                flexShrink: 0,
                alignSelf: "flex-end",
                fontFamily: "inherit",
              }}
            >
              ✕
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowDaysInput((v) => !v)}
            title="Set range by days"
            style={{
              background: showDaysInput ? "rgba(245,166,35,0.15)" : "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              padding: "12px 13px",
              color: showDaysInput ? "#e8d5b7" : "rgba(232,213,183,0.4)",
              cursor: "pointer",
              flexShrink: 0,
              alignSelf: "flex-end",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CalendarRange size={18} />
          </button>
          {showDaysInput && (
            <div className="days-input-wrap" style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "0 0 auto", minWidth: "80px" }}>
              <label
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "rgba(245,166,35,0.45)",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                Days
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={daysInput}
                onChange={(e) => setDaysInput(e.target.value.replace(/\D/g, "").slice(0, 3))}
                onBlur={applyDaysRange}
                onKeyDown={(e) => e.key === "Enter" && applyDaysRange()}
                placeholder="50"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
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
                }}
              />
            </div>
          )}
        </div>

        <div
          style={{
            minHeight: "30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {effectiveRange ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: "rgba(245,166,35,0.09)",
                border: "1px solid rgba(245,166,35,0.2)",
                borderRadius: "20px",
                padding: "6px 18px",
                fontSize: "12px",
                color: "#f5a623",
                letterSpacing: "0.04em",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#f5a623",
                  boxShadow: "0 0 8px #f5a623",
                  display: "inline-block",
                }}
              />
              {formatLongBS(effectiveStart)} → {formatLongBS(effectiveEnd)}
              <span style={{ color: "rgba(245,166,35,0.4)" }}>·</span>
              <span style={{ color: "rgba(232,213,183,0.55)" }}>{effectiveDays} days</span>
              <button
                type="button"
                onClick={() => (lockedRange ? onLockRange(null) : onLockRange({ start: effectiveStart, end: effectiveEnd }))}
                title={lockedRange ? "Unlock range" : "Lock range to view in A.D / B.S"}
                style={{
                  marginLeft: "4px",
                  background: "transparent",
                  border: "none",
                  padding: "4px",
                  cursor: "pointer",
                  color: lockedRange ? "#f5a623" : "rgba(232,213,183,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {lockedRange ? <Lock size={16} /> : <LockOpen size={16} />}
              </button>
            </div>
          ) : selecting && rangeStart ? (
            <div
              style={{
                fontSize: "11px",
                color: "rgba(232,213,183,0.3)",
                letterSpacing: "0.05em",
                animation: "blink 1.6s ease-in-out infinite",
              }}
            >
              ↓ Click a date on the calendar to set the end date
            </div>
          ) : (
            <div
              style={{
                fontSize: "11px",
                color: "rgba(232,213,183,0.18)",
                letterSpacing: "0.04em",
              }}
            >
              Enter B.S. MM/DD above or click any date on the calendar
            </div>
          )}
        </div>
      </div>

      <div
        className="calendar-grid"
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "grid",
          gap: "12px",
        }}
      >
        {BS_2082.months.map((month, i) => (
          <MonthCalendar
            key={month.index}
            monthLabel={month.name_en}
            cells={buildBSCells(month)}
            rangeStart={effectiveStart}
            rangeEnd={effectiveEnd}
            hoverDate={hoverDate}
            onDayClick={handleDayClick}
            onDayHover={handleDayHover}
          />
        ))}
      </div>

      <div
        style={{
          maxWidth: "1200px",
          margin: "26px auto 0",
          display: "flex",
          justifyContent: "center",
          gap: "22px",
          fontSize: "10px",
          color: "rgba(232,213,183,0.28)",
          letterSpacing: "0.05em",
        }}
      >
        {[
          {
            bg: "linear-gradient(135deg,#f5a623,#e8793a)",
            r: "50%",
            label: "Start / End",
          },
          { bg: "rgba(245,166,35,0.2)", r: "3px", label: "In Range" },
          {
            bg: "transparent",
            r: "50%",
            bdr: "1px solid rgba(245,166,35,0.4)",
            label: "Today",
          },
        ].map(({ bg, r, bdr, label }) => (
          <span
            key={label}
            style={{ display: "flex", alignItems: "center", gap: "7px" }}
          >
            <span
              style={{
                width: "13px",
                height: "13px",
                borderRadius: r,
                background: bg,
                border: bdr,
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            {label}
          </span>
        ))}
      </div>

      <style>{`
        .calendar-grid { grid-template-columns: repeat(auto-fill, minmax(228px, 1fr)); }
        @media (max-width: 768px) {
          .calendar-grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); }
          .days-input-wrap { max-width: 80px; width: 80px; }
          .brand-title { font-size: clamp(56px, 18vw, 80px) !important; }
        }
        @keyframes blink { 0%,100%{opacity:.4} 50%{opacity:.9} }
        input::placeholder { color: rgba(232,213,183,0.18); }
        input:focus { border-color: rgba(245,166,35,0.5) !important; background: rgba(245,166,35,0.1) !important; }
      `}</style>
    </div>
  );
}
