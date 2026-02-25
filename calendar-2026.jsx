import { useState, useRef, useEffect } from "react";
import { CalendarRange,CalendarArrowDown,  Lock, LockOpen, CalendarMinus, CalendarPlus, CalendarHeart, RefreshCw } from "lucide-react";

import WorkingDaysDialog from "./components/WorkingDaysDialog.jsx";
import SaveRangeDialog from "./components/SaveRangeDialog.jsx";
import SavedRangesDialog from "./components/SavedRangesDialog.jsx";
import TodoDialog from "./components/TodoDialog.jsx";
import toast from "react-hot-toast";
import { loadSavedRanges, saveSavedRange, deleteSavedRange, updateSavedRange } from "./savedRangesStorage.js";
import {
  MonthCalendar,
  DateInput,
  formatDate,
  formatLong,
  parseMMDD,
  getDaysInMonth,
  getFirstDayOfMonth,
  MONTHS_AD,
  toDateKey,
} from "./calendar.jsx";

const YEAR = 2026;

function buildADCells(year, monthIdx) {
  const daysInMonth = getDaysInMonth(year, monthIdx);
  const firstDay = getFirstDayOfMonth(year, monthIdx);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: new Date(year, monthIdx, d),
      dayNum: d,
    });
  }
  return cells;
}

export default function Calendar2026({ lockedRange, onLockRange }) {
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);
  const [selecting, setSelecting] = useState(false);
  const [showDaysInput, setShowDaysInput] = useState(false);
  const [daysInput, setDaysInput] = useState("");
  const [excludeWeekends, setExcludeWeekends] = useState(false);
  const [customWorkingDays, setCustomWorkingDays] = useState(null);
  const [showPlusDialog, setShowPlusDialog] = useState(false);
  const [plusInput, setPlusInput] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savedRanges, setSavedRanges] = useState(() => loadSavedRanges());
  const [showSavedRangesDialog, setShowSavedRangesDialog] = useState(false);
  const [savedRangeTitle, setSavedRangeTitle] = useState(null);
  const [savedRangeId, setSavedRangeId] = useState(null);
  const [localDeducted, setLocalDeducted] = useState([]);
  const [localAdded, setLocalAdded] = useState([]);
  const [todoDialogOpen, setTodoDialogOpen] = useState(false);
  const [heartActive, setHeartActive] = useState(false);
  const [bulbLit, setBulbLit] = useState(true);
  const [excludeBadgeKey, setExcludeBadgeKey]     = useState(0);
  const [excludeBadgeDelta, setExcludeBadgeDelta] = useState(0);
  const [excludeBadgeShow, setExcludeBadgeShow]   = useState(false);
  const excludeBadgeTimer = useRef(null);
  const [todoDialogDate, setTodoDialogDate] = useState(null);
  const lockLongPressTimer = useRef(null);
  const lockLongPressFired = useRef(false);
  const lockLongPressJustFired = useRef(false);
  const daysLongPressTimer = useRef(null);
  const daysLongPressFired = useRef(false);
  const daysLongPressJustFired = useRef(false);
  const startMonthRefAD = useRef(null);
  const [showTimeAware, setShowTimeAware] = useState(false);
  const [timeAwareFrozen, setTimeAwareFrozen] = useState(false);
  const [, setTimeTick] = useState(0);

  function countWeekdays(start, end) {
    let count = 0;
    const d = new Date(start);
    d.setHours(0, 0, 0, 0);
    const endTs = end.getTime();
    while (d.getTime() <= endTs) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) count++;
      d.setDate(d.getDate() + 1);
    }
    return count;
  }

  function countCustomWorkingDays(start, end, n) {
    let count = 0;
    const d = new Date(start);
    d.setHours(0, 0, 0, 0);
    const endTs = end.getTime();
    while (d.getTime() <= endTs) {
      const day = d.getDay();
      if (day < n && day !== 6) count++;
      d.setDate(d.getDate() + 1);
    }
    return count;
  }

  function applyPlusDays() {
    const n = parseInt(plusInput, 10);
    if (!Number.isInteger(n) || n < 1 || n > 7) return;
    setCustomWorkingDays(n);
    setExcludeWeekends(false);
    setShowPlusDialog(false);
    setPlusInput("");
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    toast.success(`Working days applied: first ${n} days (Sun–${dayNames[n - 1]})`, { style: { fontFamily: "'DM Mono', monospace" } });
  }

  function startLockLongPress() {
    if (lockLongPressJustFired.current) return;
    lockLongPressFired.current = false;
    lockLongPressTimer.current = setTimeout(() => {
      lockLongPressFired.current = true;
      lockLongPressJustFired.current = true;
      setShowSaveDialog(true);
    }, 600);
  }

  function clearLockLongPress() {
    if (lockLongPressTimer.current) {
      clearTimeout(lockLongPressTimer.current);
      lockLongPressTimer.current = null;
    }
  }

  function startDaysLongPress() {
    if (daysLongPressJustFired.current) return;
    daysLongPressFired.current = false;
    daysLongPressTimer.current = setTimeout(() => {
      daysLongPressFired.current = true;
      daysLongPressJustFired.current = true;
      setShowSavedRangesDialog(true);
    }, 600);
  }

  function clearDaysLongPress() {
    if (daysLongPressTimer.current) {
      clearTimeout(daysLongPressTimer.current);
      daysLongPressTimer.current = null;
    }
  }

  function handleSaveRangeProceed(title) {
    if (!effectiveStart || !effectiveEnd) return;
    const entry = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      title,
      start: effectiveStart.toISOString(),
      end: effectiveEnd.toISOString(),
      plusDays: customWorkingDays != null ? customWorkingDays : null,
    };
    saveSavedRange(entry);
    setSavedRanges(loadSavedRanges());
    setShowSaveDialog(false);
    setShowSavedRangesDialog(true);
  }

  function handleLoadSavedRange(entry) {
    const start = new Date(entry.start);
    const end = new Date(entry.end);
    setRangeStart(start);
    setRangeEnd(end);
    setStartInput(formatDate(start));
    setEndInput(formatDate(end));
    setSelecting(false);
    setHoverDate(null);
    setCustomWorkingDays(entry.plusDays >= 1 && entry.plusDays <= 7 ? entry.plusDays : null);
    setExcludeWeekends(false);
    onLockRange({ start, end });
    setSavedRangeTitle(entry.title);
    setSavedRangeId(entry.id);
    setLocalDeducted(Array.isArray(entry.deducted) ? entry.deducted : []);
    setLocalAdded(Array.isArray(entry.added) ? entry.added : []);
    setShowSavedRangesDialog(false);
  }

  function handleStartChange(v) {
    setStartInput(v);
    const d = parseMMDD(v, YEAR);
    if (d) {
      setRangeStart(d);
      setSelecting(true);
      setRangeEnd(null);
      setEndInput("");
      toast.success(`Start: ${formatLong(d)}`, { style: { fontFamily: "'DM Mono', monospace" } });
    } else if (!v) {
      setRangeStart(null);
      setSelecting(false);
    }
  }

  function handleEndChange(v) {
    setEndInput(v);
    const d = parseMMDD(v, YEAR);
    if (d) {
      setRangeEnd(d);
      if (rangeStart) {
        const s = rangeStart < d ? rangeStart : d;
        const e = rangeStart < d ? d : rangeStart;
        onLockRange({ start: s, end: e });
        toast.success("You can switch now", { style: { fontFamily: "'DM Mono', monospace" } });
      }
    } else if (!v) setRangeEnd(null);
    if (d) setSelecting(false);
  }

  function handleDayClick(date) {
    if (lockedRange) return;
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(date);
      setRangeEnd(null);
      setStartInput(formatDate(date));
      setEndInput("");
      setSelecting(true);
      toast.success(`Start: ${formatLong(date)}`, { style: { fontFamily: "'DM Mono', monospace" } });
    } else {
      setRangeEnd(date);
      setEndInput(formatDate(date));
      setSelecting(false);
      const s = rangeStart < date ? rangeStart : date;
      const e = rangeStart < date ? date : rangeStart;
      onLockRange({ start: s, end: e });
      toast.success("You can switch now", { style: { fontFamily: "'DM Mono', monospace" } });
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
    setSavedRangeTitle(null);
    setSavedRangeId(null);
    setLocalDeducted([]);
    setLocalAdded([]);
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
    setStartInput(formatDate(today));
    setEndInput(formatDate(endDate));
    setSelecting(false);
    setShowDaysInput(false);
    setDaysInput("");
    onLockRange({ start: today, end: endDate });
    toast.success("You can switch now", { style: { fontFamily: "'DM Mono', monospace" } });
  }

  const hasRange = rangeStart && rangeEnd;
  let days = 0,
    displayStart = null,
    displayEnd = null;
  if (hasRange) {
    displayStart = rangeStart < rangeEnd ? rangeStart : rangeEnd;
    displayEnd = rangeStart < rangeEnd ? rangeEnd : rangeStart;
    days = Math.round((displayEnd - displayStart) / (1000 * 60 * 60 * 24)) + 1;
  }

  const effectiveRange = lockedRange
    ? { start: lockedRange.start, end: lockedRange.end }
    : hasRange
      ? { start: displayStart, end: displayEnd }
      : null;
  const effectiveStart = effectiveRange?.start ?? null;
  const effectiveEnd = effectiveRange?.end ?? null;

  const startADYear = effectiveStart?.getFullYear() ?? null;
  const endADYear = effectiveEnd?.getFullYear() ?? null;
  const spanTwoYearsAD = !!(
    effectiveStart &&
    effectiveEnd &&
    startADYear != null &&
    endADYear != null &&
    startADYear !== endADYear
  );

  const displayYearAD =
    effectiveStart?.getFullYear() ??
    effectiveEnd?.getFullYear() ??
    rangeStart?.getFullYear() ??
    rangeEnd?.getFullYear() ??
    YEAR;

  const calendarItemsAD = spanTwoYearsAD
    ? [
        ...MONTHS_AD.map((monthLabel, monthIndex) => ({ year: 2025, monthIndex, monthLabel })),
        { isYearDivider: true, year: 2026 },
        ...MONTHS_AD.map((monthLabel, monthIndex) => ({ year: 2026, monthIndex, monthLabel })),
      ]
    : MONTHS_AD.map((monthLabel, monthIndex) => ({ year: displayYearAD, monthIndex, monthLabel }));

  const yearTitleAD = spanTwoYearsAD ? "2025 – 2026" : String(displayYearAD);

  useEffect(() => {
    if (!effectiveStart) return;
    const el = startMonthRefAD.current;
    if (el) {
      const t = setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
      return () => clearTimeout(t);
    }
  }, [effectiveStart]);

  const totalDays = effectiveRange
    ? Math.round((effectiveEnd - effectiveStart) / (1000 * 60 * 60 * 24)) + 1
    : 0;
  const effectiveDays = effectiveRange && customWorkingDays != null
    ? countCustomWorkingDays(effectiveStart, effectiveEnd, customWorkingDays)
    : effectiveRange && excludeWeekends
      ? countWeekdays(effectiveStart, effectiveEnd)
      : totalDays;

  function dateInRange(dateKey) {
    if (!effectiveStart || !effectiveEnd) return false;
    const [y, m, d] = dateKey.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt >= effectiveStart && dt <= effectiveEnd;
  }
  const deductedInRange = localDeducted.filter(dateInRange).length;
  const addedInRange = localAdded.filter(dateInRange).length;
  const adjustedWorkingDays = effectiveRange
    ? effectiveDays - deductedInRange + addedInRange
    : effectiveDays;

  function isBaseWorkingDay(date) {
    if (!effectiveStart || !effectiveEnd || !date) return false;
    const t = date.getTime();
    if (t < effectiveStart.getTime() || t > effectiveEnd.getTime()) return false;
    const col = date.getDay();
    if (customWorkingDays != null) return col < customWorkingDays && col !== 6;
    if (excludeWeekends) return col !== 0 && col !== 6;
    return false;
  }

  function isBaseYellowDay(date) {
    if (!effectiveStart || !effectiveEnd || !date) return false;
    const t = date.getTime();
    if (t < effectiveStart.getTime() || t > effectiveEnd.getTime()) return false;
    const col = date.getDay();
    if (customWorkingDays != null) return col >= customWorkingDays || col === 6;
    if (excludeWeekends) return col === 0 || col === 6;
    return false;
  }

  function handleDayToggle(date) {
    if (!savedRangeId || !effectiveStart || !effectiveEnd) return;
    if (date.getDay() === 6) return;
    const key = toDateKey(date);
    if (localDeducted.includes(key)) {
      setLocalDeducted((prev) => prev.filter((k) => k !== key));
      return;
    }
    if (localAdded.includes(key)) {
      setLocalAdded((prev) => prev.filter((k) => k !== key));
      return;
    }
    if (isBaseWorkingDay(date)) {
      setLocalDeducted((prev) => [...prev, key]);
    } else if (isBaseYellowDay(date)) {
      setLocalAdded((prev) => [...prev, key]);
    }
  }

  function handleUpdateRange() {
    if (!savedRangeId) return;
    updateSavedRange(savedRangeId, { deducted: localDeducted, added: localAdded });
    setSavedRanges(loadSavedRanges());
    const title = savedRangeTitle || "saved range";
    toast.success(`Changes updated in '${title}'`, { style: { fontFamily: "'DM Mono', monospace" } });
  }

  /** Returns the next calendar day that counts as a working day (blue). Skips Saturdays; with plus days, uses first N days of week. */
  function getNextWorkingDay(afterDate) {
    const d = new Date(afterDate);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    for (;;) {
      const col = d.getDay();
      if (customWorkingDays != null) {
        if (col < customWorkingDays && col !== 6) return new Date(d);
      } else if (excludeWeekends) {
        if (col >= 1 && col <= 5) return new Date(d);
      } else {
        return new Date(d);
      }
      d.setDate(d.getDate() + 1);
    }
  }

  function handleExtendRangeByOneWorkingDay() {
    if (!savedRangeId || !effectiveStart || !effectiveEnd || !lockedRange) return;
    const newEnd = getNextWorkingDay(effectiveEnd);
    onLockRange({ start: effectiveStart, end: newEnd });
    setRangeEnd(newEnd);
    setEndInput(formatDate(newEnd));
    updateSavedRange(savedRangeId, {
      end: newEnd.toISOString(),
      deducted: localDeducted,
      added: localAdded,
    });
    setSavedRanges(loadSavedRanges());
    const title = savedRangeTitle || "saved range";
    toast.success(`Range extended to ${formatLong(newEnd)} · 1 working day added in '${title}'`, {
      style: { fontFamily: "'DM Mono', monospace" },
    });
  }

  const isReviewMode = !!(lockedRange && savedRangeId);

  // ── CalendarHeart: remaining days from today ──────────────
  // Reset toggle whenever the range itself changes
  useEffect(() => { setHeartActive(false); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveStart?.getTime(), effectiveEnd?.getTime()]
  );

  const todayMidnight = (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();
  // heartStart = today only when heart is on AND today is strictly inside the range
  const heartStart = (heartActive && effectiveStart && effectiveEnd &&
    todayMidnight > effectiveStart && todayMidnight <= effectiveEnd)
    ? todayMidnight
    : effectiveStart;

  const heartTotalDays = heartStart && effectiveEnd
    ? Math.max(0, Math.round((effectiveEnd - heartStart) / (1000 * 60 * 60 * 24)) + 1)
    : 0;
  const heartEffectiveDays = heartStart && effectiveEnd && customWorkingDays != null
    ? countCustomWorkingDays(heartStart, effectiveEnd, customWorkingDays)
    : heartStart && effectiveEnd && excludeWeekends
      ? countWeekdays(heartStart, effectiveEnd)
      : heartTotalDays;
  const heartDeductedInRange = localDeducted.filter(key => {
    const [y,m,d] = key.split("-").map(Number);
    const dt = new Date(y,m-1,d);
    return heartStart && effectiveEnd && dt >= heartStart && dt <= effectiveEnd;
  }).length;
  const heartAddedInRange = localAdded.filter(key => {
    const [y,m,d] = key.split("-").map(Number);
    const dt = new Date(y,m-1,d);
    return heartStart && effectiveEnd && dt >= heartStart && dt <= effectiveEnd;
  }).length;
  const heartAdjustedDays = Math.max(0, heartEffectiveDays - heartDeductedInRange + heartAddedInRange);

  const displayWorkingDays = heartActive
    ? (isReviewMode ? heartAdjustedDays : heartEffectiveDays)
    : (isReviewMode ? adjustedWorkingDays : effectiveDays);

  const todayIsInRange = !!(effectiveStart && effectiveEnd &&
    todayMidnight >= effectiveStart && todayMidnight <= effectiveEnd);

  function getTimeAwareRemaining() {
    if (!effectiveEnd) return null;
    const now = new Date();
    const endOfRange = new Date(effectiveEnd.getFullYear(), effectiveEnd.getMonth(), effectiveEnd.getDate() + 1);
    const diffMs = endOfRange.getTime() - now.getTime();
    if (diffMs <= 0) return { days: 0, hours: 0 };
    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    return { days: Math.floor(totalHours / 24), hours: totalHours % 24 };
  }

  function formatTimeAware(ta) {
    if (!ta) return "";
    if (ta.days === 0 && ta.hours === 0) return "0 hrs";
    if (ta.days === 0) return `${ta.hours} hrs`;
    if (ta.hours === 0) return `${ta.days} days`;
    return `${ta.days} days ${ta.hours} hrs`;
  }

  const timeAware = todayIsInRange ? getTimeAwareRemaining() : null;

  useEffect(() => {
    setShowTimeAware(false);
    setTimeAwareFrozen(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveStart?.getTime(), effectiveEnd?.getTime()]);

  useEffect(() => {
    if (!todayIsInRange || !effectiveRange) return;
    const id = setInterval(() => {
      if (!timeAwareFrozen) {
        setShowTimeAware(v => !v);
      } else {
        setTimeTick(v => v + 1);
      }
    }, 1500);
    return () => clearInterval(id);
  }, [todayIsInRange, timeAwareFrozen, !!effectiveRange]);

  function handleDaysLabelClick() {
    setTimeAwareFrozen(f => !f);
  }

  return (
    <div
      className="calendar-page"
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
            letterSpacing: "0.04em",
            lineHeight: 1,
            textShadow: "0 10px 60px rgba(115, 114, 117, 0.73)",
          }}
        >
          Klar
          <span
            onClick={() => setBulbLit(v => !v)}
            title={bulbLit ? "Click to turn off" : "Click to turn on"}
            style={{ cursor: "pointer", display: "inline-block", verticalAlign: "top",
              lineHeight: 0, margin: "0.04em 0.04em 0" }}
          >
            <svg
              viewBox="0 0 10 15"
              width="0.2em" height="0.3em"
              xmlns="http://www.w3.org/2000/svg"
              className={bulbLit ? "klary-bulb-on" : "klary-bulb-off"}
              style={{ overflow: "visible", display: "block", transition: "filter 0.6s ease" }}
              aria-hidden="true"
            >
              {/* Apostrophe teardrop: fat round top, tapers to a curved point at bottom */}
              <path
                d="M5 0.5 C2.2 0.5 0.5 2.4 0.5 4.8 C0.5 7.6 2.2 10.2 5 14 C7.8 10.2 9.5 7.6 9.5 4.8 C9.5 2.4 7.8 0.5 5 0.5 Z"
                fill={bulbLit ? "#f5a623" : "rgba(180,140,70,0.22)"}
                style={{ transition: "fill 0.5s ease" }}
              />
              {/* Specular highlight: small arc upper-left, like a lit bulb */}
              {bulbLit && (
                <path d="M3 2.2 Q2.2 3.5 2.6 5"
                  fill="none" stroke="rgba(255,255,255,0.45)"
                  strokeWidth="0.9" strokeLinecap="round"
                />
              )}
            </svg>
          </span>
          y
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
          {yearTitleAD}
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
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", fontFamily: "Playfair Display" }}>
          <DateInput
            label="Start"
            value={lockedRange ? formatDate(effectiveStart) : startInput}
            onChange={handleStartChange}
            placeholder="MM/DD"
            active={!lockedRange && !rangeStart}
            disabled={!!lockedRange}
          />
          <div
            style={{
              color: "rgba(245,166,35,0.35)",
              fontSize: "22px",
              fontFamily: "Playfair Display",
              paddingBottom: "11px",
              flexShrink: 0,
            }}
          >
            →
          </div>
          <DateInput
            label="End"
            value={lockedRange ? formatDate(effectiveEnd) : endInput}
            onChange={handleEndChange}
            placeholder="MM/DD"
            active={!lockedRange && selecting && !!rangeStart && !rangeEnd}
            disabled={!!lockedRange}
            persistBorder
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
            onMouseDown={startDaysLongPress}
            onMouseUp={clearDaysLongPress}
            onMouseLeave={clearDaysLongPress}
            onTouchStart={startDaysLongPress}
            onTouchEnd={clearDaysLongPress}
            onTouchCancel={clearDaysLongPress}
            onClick={() => {
              if (daysLongPressFired.current) {
                daysLongPressFired.current = false;
                daysLongPressJustFired.current = false;
                return;
              }
              setShowDaysInput((v) => !v);
            }}
            title="Set range by days (long-press to view saved)"
            style={{
              background: showDaysInput ? "rgba(245,166,35,0.15)" : "transparent",
              border: "1px solid rgba(245,166,35,0.45)",
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
              {formatLong(heartStart)} → {formatLong(effectiveEnd)}
              <span style={{ color: "rgba(245,166,35,0.4)" }}>·</span>
              <span
                onClick={todayIsInRange ? handleDaysLabelClick : undefined}
                title={todayIsInRange ? (timeAwareFrozen ? "Click to resume switching" : "Click to freeze") : undefined}
                style={{
                  color: "rgba(232,213,183,0.55)",
                  cursor: todayIsInRange ? "pointer" : "default",
                  userSelect: "none",
                }}
              >
                <span
                  key={showTimeAware && timeAware ? "ta" : "cd"}
                  className={todayIsInRange ? "days-label-anim" : ""}
                  style={{ display: "inline-block" }}
                >
                  {showTimeAware && timeAware
                    ? <>{formatTimeAware(timeAware)}{heartActive ? " left" : ""}</>
                    : <><span className="count-tick" style={{ display: "inline-block", minWidth: "18px", textAlign: "right" }}>{displayWorkingDays}</span>{" "}{excludeWeekends || customWorkingDays != null ? "working days" : "days"}{heartActive ? " left" : ""}</>
                  }
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = !excludeWeekends;
                  setExcludeWeekends(next);
                  if (next) setCustomWorkingDays(null);
                  if (effectiveStart && effectiveEnd) {
                    let wknd = 0;
                    const d = new Date(effectiveStart);
                    while (d <= effectiveEnd) {
                      const dow = d.getDay();
                      if (dow === 0 || dow === 6) wknd++;
                      d.setDate(d.getDate() + 1);
                    }
                    setExcludeBadgeDelta(next ? -wknd : +wknd);
                    setExcludeBadgeKey(k => k + 1);
                    setExcludeBadgeShow(true);
                    if (excludeBadgeTimer.current) clearTimeout(excludeBadgeTimer.current);
                    excludeBadgeTimer.current = setTimeout(() => setExcludeBadgeShow(false), 2300);
                  }
                  toast.success(next ? "Exclude weekends applied" : "Exclude weekends removed", { style: { fontFamily: "'DM Mono', monospace" } });
                }}
                title={excludeWeekends ? "Show all days" : "Exclude weekends (working days)"}
                style={{
                  marginLeft: "2px",
                  background: "transparent",
                  border: "none",
                  padding: "4px",
                  cursor: "pointer",
                  color: excludeWeekends ? "#f5a623" : "rgba(232,213,183,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CalendarMinus size={16} />
              </button>
              <button
                type="button"
                onClick={() => setShowPlusDialog(true)}
                title={customWorkingDays ? `First ${customWorkingDays} days (Sun–${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][customWorkingDays-1]})` : "Set custom working days"}
                style={{
                  marginLeft: "2px",
                  background: "transparent",
                  border: "none",
                  padding: "4px",
                  cursor: "pointer",
                  color: customWorkingDays ? "#6ba3e8" : "rgba(232,213,183,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CalendarPlus size={16} />
              </button>
              <button
                type="button"
                onClick={() => setHeartActive(v => !v)}
                title="Remaining days from today"
                style={{
                  marginLeft: "2px",
                  background: "transparent",
                  border: "none",
                  padding: "4px",
                  cursor: "pointer",
                  color: heartActive ? "rgba(220,80,120,0.9)" : "rgba(232,213,183,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CalendarHeart size={16} />
              </button>
              <button
                type="button"
                onMouseDown={startLockLongPress}
                onMouseUp={clearLockLongPress}
                onMouseLeave={clearLockLongPress}
                onTouchStart={startLockLongPress}
                onTouchEnd={clearLockLongPress}
                onTouchCancel={clearLockLongPress}
                onClick={() => {
                  if (lockLongPressFired.current) {
                    lockLongPressFired.current = false;
                    lockLongPressJustFired.current = false;
                    return;
                  }
                  if (lockedRange) {
                    onLockRange(null);
                    setSavedRangeTitle(null);
                    setSavedRangeId(null);
                    setLocalDeducted([]);
                    setLocalAdded([]);
                    toast.success("Range unlocked", { style: { fontFamily: "'DM Mono', monospace" } });
                  } else {
                    onLockRange({ start: effectiveStart, end: effectiveEnd });
                    toast.success("Range locked", { style: { fontFamily: "'DM Mono', monospace" } });
                  }
                }}
                title={lockedRange ? "Unlock range (long-press to save)" : "Lock range (long-press to save)"}
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
              Enter MM/DD above or click any date on the calendar
            </div>
          )}
        </div>
      </div>

      {/* Exclude-weekends delta badge */}
      {excludeBadgeShow && (
        <div
          key={excludeBadgeKey}
          className="exclude-badge"
          style={{
            display: "flex", justifyContent: "center", marginTop: "4px",
            fontFamily: "'DM Mono', monospace",
            fontSize: "11px",
            letterSpacing: "0.08em",
          }}
        >
          <span style={{
            color: excludeBadgeDelta < 0 ? "rgba(220,90,90,0.95)" : "rgba(70,200,110,0.9)",
            background: excludeBadgeDelta < 0 ? "rgba(200,80,80,0.12)" : "rgba(70,200,110,0.1)",
            border: `1px solid ${excludeBadgeDelta < 0 ? "rgba(200,80,80,0.35)" : "rgba(70,200,110,0.3)"}`,
            borderRadius: "12px",
            padding: "3px 14px",
            pointerEvents: "none",
          }}>
            {excludeBadgeDelta > 0 ? "+" : ""}{excludeBadgeDelta} weekend days {excludeBadgeDelta < 0 ? "excluded" : "restored"}
          </span>
        </div>
      )}

      {savedRangeTitle && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            marginTop: "4px",
            marginBottom: "12px",
            fontFamily: "'DM Mono', monospace",
            fontSize: "18px",
            color: "rgba(245,166,35,0.9)",
            letterSpacing: "0.04em",
          }}
        >
            <button
              type="button"
              onClick={handleExtendRangeByOneWorkingDay}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleExtendRangeByOneWorkingDay();
              }}
              title="Extend range by 1 working day (saved automatically)"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(245,166,35,0.35)",
                borderRadius: "10px",
                padding: "8px 10px",
                color: "rgba(245,166,35,0.95)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <CalendarArrowDown size={18} /> <span> &nbsp; </span>+1 Day
            </button>
        
          <span style={{ textAlign: "center" }}>{savedRangeTitle}</span>
          {savedRangeId && (
            <button
              type="button"
              onClick={handleUpdateRange}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleUpdateRange();
              }}
              title="Update saved range with current changes"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: localDeducted.length || localAdded.length ? "rgba(245,166,35,0.2)" : "rgba(255,255,255,0.06)",
                border: "1px solid rgba(245,166,35,0.35)",
                borderRadius: "10px",
                padding: "8px 10px",
                color: "rgba(245,166,35,0.95)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <RefreshCw size={18} /> <span> &nbsp; </span>Update
            </button>
          )}
        </div>
      )}

      <div
        className="calendar-grid"
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "grid",
          gap: "12px",
        }}
      >
        {calendarItemsAD.map((item) => {
          if (item.isYearDivider) {
            return (
              <div
                key={`divider-${item.year}`}
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  padding: "12px 0 4px",
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(28px, 4vw, 42px)",
                  color: "rgba(245,166,35,0.85)",
                  letterSpacing: "0.02em",
                  borderTop: "1px solid rgba(245,166,35,0.2)",
                  marginTop: "8px",
                }}
              >
                {item.year}
              </div>
            );
          }
          const isStartMonth =
            effectiveStart &&
            item.year === effectiveStart.getFullYear() &&
            item.monthIndex === effectiveStart.getMonth();
          return (
            <div
              key={`${item.year}-${item.monthIndex}`}
              ref={isStartMonth ? startMonthRefAD : undefined}
            >
          <MonthCalendar
                monthLabel={spanTwoYearsAD && item.year === 2026 ? `${item.monthLabel} (2026)` : item.monthLabel}
                cells={buildADCells(item.year, item.monthIndex)}
                rangeStart={heartStart}
                rangeEnd={effectiveEnd}
                hoverDate={hoverDate}
                excludeWeekends={excludeWeekends && !customWorkingDays}
                customWorkingDays={customWorkingDays}
                deducted={localDeducted}
                added={localAdded}
                isReviewMode={isReviewMode}
                onDayClick={handleDayClick}
                onDayHover={handleDayHover}
                onDayToggle={handleDayToggle}
                onDayLongPress={isReviewMode ? (date) => { setTodoDialogDate(date); setTodoDialogOpen(true); } : undefined}
              />
            </div>
          );
        })}
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
            bg: "rgba(70,200,110,0.5)",
            r: "50%",
            bdr: "1px solid rgba(70,200,110,0.75)",
            bsh: "0 0 8px rgba(70,200,110,0.45)",
            label: "Today",
          },
        ].map(({ bg, r, bdr, bsh, label }) => (
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
                boxShadow: bsh,
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            {label}
          </span>
        ))}
      </div>

      <WorkingDaysDialog
        open={showPlusDialog}
        onClose={() => setShowPlusDialog(false)}
        value={plusInput}
        onChange={setPlusInput}
        onProceed={applyPlusDays}
        onReset={() => {
          setCustomWorkingDays(null);
          setPlusInput("");
          toast.success("Custom working days removed", { style: { fontFamily: "'DM Mono', monospace" } });
        }}
      />
      <SaveRangeDialog
        open={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onProceed={handleSaveRangeProceed}
      />
      <SavedRangesDialog
        open={showSavedRangesDialog}
        onClose={() => setShowSavedRangesDialog(false)}
        ranges={savedRanges}
        onSelectRange={handleLoadSavedRange}
        onDelete={(id) => {
          deleteSavedRange(id);
          setSavedRanges(loadSavedRanges());
        }}
      />
      <TodoDialog
        open={todoDialogOpen}
        onClose={() => setTodoDialogOpen(false)}
        rangeId={savedRangeId ?? undefined}
        dateKey={todoDialogDate ? toDateKey(todoDialogDate) : undefined}
        dateLabel={todoDialogDate ? formatLong(todoDialogDate) : undefined}
      />

      <style>{`
        .calendar-grid { grid-template-columns: repeat(auto-fill, minmax(228px, 1fr)); }
        @media (max-width: 768px) {
          .calendar-page { padding-left: 20px !important; padding-right: 20px !important; }
          .calendar-grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); }
          .days-input-wrap { max-width: 80px; width: 80px; }
          .brand-title { font-size: clamp(56px, 18vw, 80px) !important; }
        }
        @keyframes blink { 0%,100%{opacity:.4} 50%{opacity:.9} }
        @keyframes daysLabelFade {
          0% { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .days-label-anim { animation: daysLabelFade 0.4s ease; }
        @keyframes klary-bulb-pulse {
          0%,100% { filter: drop-shadow(0 0 4px rgba(245,165,35,0.38))
                            drop-shadow(0 0 10px rgba(245,165,35,0.14)); }
          50%     { filter: drop-shadow(0 0 8px rgba(252,200,100,0.6))
                            drop-shadow(0 0 20px rgba(245,165,35,0.28))
                            drop-shadow(0 0 36px rgba(245,165,35,0.1)); }
        }
        .klary-bulb-on  { animation: klary-bulb-pulse 3s ease-in-out infinite; }
        .klary-bulb-off { filter: none; }
        input::placeholder { color: rgba(232,213,183,0.18); }
        input:focus { border-color: rgba(245,166,35,0.5) !important; background: rgba(245,166,35,0.1) !important; }
      `}</style>
    </div>
  );
}
