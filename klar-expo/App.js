import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const STORAGE_SAVED_RANGES_KEY = "@klar_expo/saved_ranges/v1";
const STORAGE_TODO_KEY = "@klar_expo/todo_map/v1";

const AD_DEFAULT_YEAR = 2026;
const ONE_DAY_MS = 86400000;
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS_AD = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const BS_2082 = {
  year_bs: 2082,
  months: [
    { index: 1, name_en: "Baishakh / वैशाख", days: 31, starts_ad: "2025-04-14" },
    { index: 2, name_en: "Jestha / जेठ", days: 31, starts_ad: "2025-05-15" },
    { index: 3, name_en: "Ashadh / असार", days: 32, starts_ad: "2025-06-15" },
    { index: 4, name_en: "Shrawan / साउन", days: 31, starts_ad: "2025-07-17" },
    { index: 5, name_en: "Bhadra / भदौ", days: 31, starts_ad: "2025-08-17" },
    { index: 6, name_en: "Ashwin / असोज", days: 31, starts_ad: "2025-09-17" },
    { index: 7, name_en: "Kartik / कात्तिक", days: 30, starts_ad: "2025-10-18" },
    { index: 8, name_en: "Mangsir / मंसिर", days: 29, starts_ad: "2025-11-17" },
    { index: 9, name_en: "Poush / पुष", days: 30, starts_ad: "2025-12-16" },
    { index: 10, name_en: "Magh / माघ", days: 29, starts_ad: "2026-01-15" },
    { index: 11, name_en: "Falgun / फागुन", days: 30, starts_ad: "2026-02-13" },
    { index: 12, name_en: "Chaitra / चैत", days: 30, starts_ad: "2026-03-15" },
  ],
};

const BS_2083 = {
  year_bs: 2083,
  months: [
    { index: 1, name_en: "Baishakh / वैशाख", days: 31, starts_ad: "2026-04-14" },
    { index: 2, name_en: "Jestha / जेठ", days: 31, starts_ad: "2026-05-15" },
    { index: 3, name_en: "Ashadh / असार", days: 31, starts_ad: "2026-06-15" },
    { index: 4, name_en: "Shrawan / साउन", days: 31, starts_ad: "2026-07-16" },
    { index: 5, name_en: "Bhadra / भदौ", days: 31, starts_ad: "2026-08-16" },
    { index: 6, name_en: "Ashwin / असोज", days: 31, starts_ad: "2026-09-16" },
    { index: 7, name_en: "Kartik / कात्तिक", days: 30, starts_ad: "2026-10-17" },
    { index: 8, name_en: "Mangsir / मंसिर", days: 30, starts_ad: "2026-11-16" },
    { index: 9, name_en: "Poush / पुष", days: 29, starts_ad: "2026-12-16" },
    { index: 10, name_en: "Magh / माघ", days: 29, starts_ad: "2027-01-14" },
    { index: 11, name_en: "Falgun / फागुन", days: 30, starts_ad: "2027-02-12" },
    { index: 12, name_en: "Chaitra / चैत", days: 30, starts_ad: "2027-03-14" },
  ],
};

const BS_YEARS = [BS_2082, BS_2083];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sameDay(a, b) {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toDateKey(date) {
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function fromDateKey(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isDateInRange(date, start, end) {
  if (!date || !start || !end) return false;
  const t = date.getTime();
  const s = Math.min(start.getTime(), end.getTime());
  const e = Math.max(start.getTime(), end.getTime());
  return t >= s && t <= e;
}

function normalizeDateInput(raw) {
  let value = (raw ?? "").replace(/[^\d/]/g, "").replace(/\//g, "");
  if (value.length > 2) value = `${value.slice(0, 2)}/${value.slice(2, 4)}`;
  return value.slice(0, 5);
}

function parseMMDD(value, year) {
  if (!value) return null;
  const digits = value.replace(/[^\d]/g, "");
  if (digits.length !== 4) return null;
  const month = Number(digits.slice(0, 2));
  const day = Number(digits.slice(2, 4));
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > getDaysInMonth(year, month - 1)) return null;
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  if (!date) return "";
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

function formatLongAD(date) {
  if (!date) return "";
  return `${MONTHS_AD[date.getMonth()]} ${date.getDate()}`;
}

function countWeekdays(start, end) {
  if (!start || !end) return 0;
  const cursor = startOfDay(start);
  const finish = startOfDay(end).getTime();
  let count = 0;
  while (cursor.getTime() <= finish) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function countCustomWorkingDays(start, end, workingDaysCount) {
  if (!start || !end || workingDaysCount == null) return 0;
  const cursor = startOfDay(start);
  const finish = startOfDay(end).getTime();
  let count = 0;
  while (cursor.getTime() <= finish) {
    const day = cursor.getDay();
    if (day < workingDaysCount && day !== 6) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function addDaysToDateKey(dateKey, n) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + n);
  return toDateKey(date);
}

function getMonthEndKey(startsAd, days) {
  return addDaysToDateKey(startsAd, days - 1);
}

function getBSYearForDate(date) {
  if (!date) return null;
  const key = toDateKey(date);
  for (const bsYear of BS_YEARS) {
    for (const month of bsYear.months) {
      const end = getMonthEndKey(month.starts_ad, month.days);
      if (key >= month.starts_ad && key <= end) return bsYear.year_bs;
    }
  }
  return null;
}

function getBSData(yearBS) {
  return yearBS === 2083 ? BS_2083 : BS_2082;
}

function parseBSMMDD(value, bsYearData) {
  if (!value) return null;
  const digits = value.replace(/[^\d]/g, "");
  if (digits.length !== 4) return null;
  const monthNum = Number(digits.slice(0, 2));
  const dayNum = Number(digits.slice(2, 4));
  if (monthNum < 1 || monthNum > 12) return null;
  const month = bsYearData.months[monthNum - 1];
  if (!month || dayNum < 1 || dayNum > month.days) return null;
  const [year, monthIndex, day] = month.starts_ad.split("-").map(Number);
  return new Date(year, monthIndex - 1, day + dayNum - 1);
}

function getBSDayFromKey(key, startsAd) {
  const start = new Date(`${startsAd}T12:00:00`);
  const current = new Date(`${key}T12:00:00`);
  return Math.round((current.getTime() - start.getTime()) / ONE_DAY_MS) + 1;
}

function formatDateBS(date) {
  if (!date) return "";
  const key = toDateKey(date);
  for (const bsYear of BS_YEARS) {
    for (let index = 0; index < bsYear.months.length; index += 1) {
      const month = bsYear.months[index];
      const end = getMonthEndKey(month.starts_ad, month.days);
      if (key >= month.starts_ad && key <= end) {
        const day = getBSDayFromKey(key, month.starts_ad);
        return `${String(index + 1).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
      }
    }
  }
  return "";
}

function formatLongBS(date) {
  if (!date) return "";
  const key = toDateKey(date);
  for (const bsYear of BS_YEARS) {
    for (const month of bsYear.months) {
      const end = getMonthEndKey(month.starts_ad, month.days);
      if (key >= month.starts_ad && key <= end) {
        const day = getBSDayFromKey(key, month.starts_ad);
        return `${month.name_en} ${day}`;
      }
    }
  }
  return "";
}

function buildADCells(year, monthIndex) {
  const daysInMonth = getDaysInMonth(year, monthIndex);
  const firstDay = getFirstDayOfMonth(year, monthIndex);
  const cells = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push({ date: new Date(year, monthIndex, d), dayNum: d });
  }
  return cells;
}

function buildBSCells(month) {
  const [year, monthIndex, day] = month.starts_ad.split("-").map(Number);
  const firstDay = new Date(year, monthIndex - 1, day).getDay();
  const cells = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let d = 1; d <= month.days; d += 1) {
    cells.push({ date: new Date(year, monthIndex - 1, day + d - 1), dayNum: d });
  }
  return cells;
}

function createId() {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function countInRange(dateKeys, start, end) {
  if (!start || !end) return 0;
  return dateKeys.filter((key) => {
    const dt = fromDateKey(key);
    return dt >= start && dt <= end;
  }).length;
}

function getNextWorkingDay(afterDate, customWorkingDays, excludeWeekends) {
  const cursor = startOfDay(afterDate);
  cursor.setDate(cursor.getDate() + 1);
  for (;;) {
    const day = cursor.getDay();
    if (customWorkingDays != null) {
      if (day < customWorkingDays && day !== 6) return new Date(cursor);
    } else if (excludeWeekends) {
      if (day >= 1 && day <= 5) return new Date(cursor);
    } else {
      return new Date(cursor);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
}

async function loadJsonStorage(key, fallbackValue) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallbackValue;
    const parsed = JSON.parse(raw);
    return parsed ?? fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function ModalShell({ visible, title, onClose, children, footer }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>
          <View style={styles.modalBody}>{children}</View>
          {footer ? <View style={styles.modalFooter}>{footer}</View> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MonthCalendar({
  monthLabel,
  cells,
  rangeStart,
  rangeEnd,
  excludeWeekends,
  customWorkingDays,
  deducted,
  added,
  isReviewMode,
  onDayPress,
  onDayLongPress,
}) {
  const today = startOfDay(new Date());

  return (
    <View style={styles.monthCard}>
      <Text style={styles.monthTitle}>{monthLabel}</Text>
      <View style={styles.daysHeaderRow}>
        {DAYS.map((d) => (
          <Text key={d} style={styles.daysHeaderCell}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.daysGrid}>
        {cells.map((cell, index) => {
          if (!cell) return <View key={`empty-${monthLabel}-${index}`} style={styles.dayCellEmpty} />;

          const date = startOfDay(cell.date);
          const inRange = isDateInRange(date, rangeStart, rangeEnd);
          const isStart = sameDay(date, rangeStart);
          const isEnd = sameDay(date, rangeEnd);
          const isEdge = isStart || isEnd;
          const isToday = sameDay(date, today);
          const dayCol = date.getDay();
          const isSaturday = dayCol === 6;
          const isWeekend = dayCol === 0 || dayCol === 6;
          const key = toDateKey(date);
          const isDeducted = isReviewMode && inRange && deducted.includes(key);
          const isAdded = isReviewMode && inRange && added.includes(key);

          let isExcludedWeekend = excludeWeekends && inRange && isWeekend;
          let isCustomWorking = customWorkingDays != null && inRange && dayCol < customWorkingDays && dayCol !== 6;
          let isCustomExcluded = customWorkingDays != null && inRange && (dayCol >= customWorkingDays || dayCol === 6);

          if (isReviewMode && inRange) {
            if (isSaturday) {
              isCustomExcluded = true;
              isCustomWorking = false;
              isExcludedWeekend = false;
            } else if (isDeducted) {
              isCustomExcluded = true;
              isCustomWorking = false;
              isExcludedWeekend = false;
            } else if (isAdded) {
              isCustomExcluded = false;
              isCustomWorking = true;
              isExcludedWeekend = false;
            }
          }

          let backgroundColor = "transparent";
          let textColor = dayCol === 0 || dayCol === 6 ? "rgba(232,213,183,0.45)" : "rgba(232,213,183,0.8)";
          let borderColor = "transparent";

          if (isToday && !inRange && !isEdge) {
            backgroundColor = "rgba(70,200,110,0.5)";
            textColor = "rgba(220,255,220,0.95)";
            borderColor = "rgba(70,200,110,0.75)";
          } else if (isCustomExcluded || isExcludedWeekend) {
            backgroundColor = "rgba(200,80,80,0.35)";
            textColor = "rgba(255,210,210,0.95)";
            borderColor = "rgba(200,80,80,0.55)";
          } else if (isCustomWorking) {
            backgroundColor = "rgba(80,140,200,0.45)";
            textColor = "rgba(210,230,255,0.98)";
            borderColor = "rgba(80,140,200,0.6)";
          } else if (isEdge) {
            backgroundColor = "#f5a623";
            textColor = "#1a0e00";
            borderColor = "rgba(245,166,35,0.8)";
          } else if (inRange) {
            backgroundColor = "rgba(245,166,35,0.2)";
            textColor = "#f5c870";
          }

          const handlePress = () => {
            onDayPress(date, { inRange, isSaturday });
          };
          const handleLongPress = () => {
            if (onDayLongPress) onDayLongPress(date, { inRange, isSaturday });
          };

          return (
            <Pressable
              key={`${monthLabel}-${index}-${cell.dayNum}`}
              style={[
                styles.dayCell,
                {
                  backgroundColor,
                  borderColor,
                  opacity: isReviewMode && isSaturday && inRange ? 0.8 : 1,
                },
              ]}
              onPress={handlePress}
              onLongPress={handleLongPress}
              delayLongPress={420}
            >
              <Text style={[styles.dayCellText, { color: textColor, fontWeight: isEdge || isToday ? "700" : "400" }]}>
                {cell.dayNum}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function DateField({ label, value, onChangeText, editable, placeholder }) {
  return (
    <View style={styles.dateField}>
      <Text style={styles.dateLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(text) => onChangeText(normalizeDateInput(text))}
        editable={editable}
        placeholder={placeholder}
        placeholderTextColor="rgba(232,213,183,0.25)"
        keyboardType="number-pad"
        style={[styles.dateInput, !editable ? styles.inputDisabled : null]}
      />
    </View>
  );
}

export default function App() {
  const [isBS, setIsBS] = useState(false);
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [lockedRange, setLockedRange] = useState(null);
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [showDaysInput, setShowDaysInput] = useState(false);
  const [daysInput, setDaysInput] = useState("");
  const [excludeWeekends, setExcludeWeekends] = useState(false);
  const [customWorkingDays, setCustomWorkingDays] = useState(null);
  const [heartActive, setHeartActive] = useState(false);
  const [showWorkingDaysModal, setShowWorkingDaysModal] = useState(false);
  const [workingDaysInput, setWorkingDaysInput] = useState("");

  const [savedRanges, setSavedRanges] = useState([]);
  const [showSaveRangeModal, setShowSaveRangeModal] = useState(false);
  const [showSavedRangesModal, setShowSavedRangesModal] = useState(false);
  const [saveRangeTitle, setSaveRangeTitle] = useState("");
  const [savedRangeId, setSavedRangeId] = useState(null);
  const [savedRangeTitle, setSavedRangeTitle] = useState(null);
  const [localDeducted, setLocalDeducted] = useState([]);
  const [localAdded, setLocalAdded] = useState([]);

  const [todoMap, setTodoMap] = useState({});
  const [todoDialogOpen, setTodoDialogOpen] = useState(false);
  const [todoDialogDate, setTodoDialogDate] = useState(null);
  const [newTaskText, setNewTaskText] = useState("");

  useEffect(() => {
    async function loadInitialData() {
      const ranges = await loadJsonStorage(STORAGE_SAVED_RANGES_KEY, []);
      const todos = await loadJsonStorage(STORAGE_TODO_KEY, {});
      setSavedRanges(Array.isArray(ranges) ? ranges : []);
      setTodoMap(todos && typeof todos === "object" ? todos : {});
    }
    loadInitialData();
  }, []);

  const normalizedRange = useMemo(() => {
    if (!rangeStart || !rangeEnd) return null;
    return rangeStart <= rangeEnd
      ? { start: startOfDay(rangeStart), end: startOfDay(rangeEnd) }
      : { start: startOfDay(rangeEnd), end: startOfDay(rangeStart) };
  }, [rangeStart, rangeEnd]);

  const effectiveRange = lockedRange ?? normalizedRange;
  const effectiveStart = effectiveRange?.start ?? null;
  const effectiveEnd = effectiveRange?.end ?? null;
  const hasEffectiveRange = !!(effectiveStart && effectiveEnd);
  const isReviewMode = !!(lockedRange && savedRangeId);
  const today = startOfDay(new Date());
  const todayInRange = hasEffectiveRange && today >= effectiveStart && today <= effectiveEnd;
  const heartStart = heartActive && todayInRange && today > effectiveStart ? today : effectiveStart;

  const displayBSYear =
    getBSYearForDate(effectiveStart) ??
    getBSYearForDate(effectiveEnd) ??
    getBSYearForDate(rangeStart) ??
    getBSYearForDate(rangeEnd) ??
    2082;
  const currentBSData = getBSData(displayBSYear);
  const inputYearAD = effectiveStart?.getFullYear() ?? rangeStart?.getFullYear() ?? AD_DEFAULT_YEAR;

  const monthItems = useMemo(() => {
    if (isBS) {
      const startYear = getBSYearForDate(effectiveStart);
      const endYear = getBSYearForDate(effectiveEnd);
      const needsBoth = startYear && endYear && startYear !== endYear;
      const yearsToShow = needsBoth
        ? [BS_2082, BS_2083]
        : [getBSData(startYear ?? endYear ?? displayBSYear)];
      return yearsToShow.flatMap((bsData) =>
        bsData.months.map((month) => ({
          id: `${bsData.year_bs}-${month.index}`,
          monthLabel: needsBoth ? `${month.name_en} (${bsData.year_bs})` : month.name_en,
          cells: buildBSCells(month),
        }))
      );
    }

    const startYear = effectiveStart?.getFullYear();
    const endYear = effectiveEnd?.getFullYear();
    if (startYear && endYear && startYear !== endYear) {
      const years = [];
      const min = Math.min(startYear, endYear);
      const max = Math.max(startYear, endYear);
      for (let year = min; year <= max; year += 1) years.push(year);
      return years.flatMap((year) =>
        MONTHS_AD.map((label, monthIndex) => ({
          id: `${year}-${monthIndex}`,
          monthLabel: `${label} (${year})`,
          cells: buildADCells(year, monthIndex),
        }))
      );
    }

    const year = startYear ?? endYear ?? AD_DEFAULT_YEAR;
    return MONTHS_AD.map((label, monthIndex) => ({
      id: `${year}-${monthIndex}`,
      monthLabel: label,
      cells: buildADCells(year, monthIndex),
    }));
  }, [isBS, effectiveStart, effectiveEnd, displayBSYear]);

  const yearTitle = useMemo(() => {
    if (isBS) {
      const startYear = getBSYearForDate(effectiveStart);
      const endYear = getBSYearForDate(effectiveEnd);
      if (startYear && endYear && startYear !== endYear) return `${startYear} - ${endYear}`;
      return String(startYear ?? endYear ?? displayBSYear);
    }
    const startYear = effectiveStart?.getFullYear();
    const endYear = effectiveEnd?.getFullYear();
    if (startYear && endYear && startYear !== endYear) return `${startYear} - ${endYear}`;
    return String(startYear ?? endYear ?? AD_DEFAULT_YEAR);
  }, [isBS, effectiveStart, effectiveEnd, displayBSYear]);

  function getBaseWorkingCount(rangeStartDate, rangeEndDate) {
    if (!rangeStartDate || !rangeEndDate) return 0;
    const totalDays = Math.round((rangeEndDate - rangeStartDate) / ONE_DAY_MS) + 1;
    if (customWorkingDays != null) {
      return countCustomWorkingDays(rangeStartDate, rangeEndDate, customWorkingDays);
    }
    if (excludeWeekends) return countWeekdays(rangeStartDate, rangeEndDate);
    return totalDays;
  }

  const baseCount = hasEffectiveRange ? getBaseWorkingCount(heartStart, effectiveEnd) : 0;
  const adjustedCount = hasEffectiveRange
    ? baseCount - countInRange(localDeducted, heartStart, effectiveEnd) + countInRange(localAdded, heartStart, effectiveEnd)
    : 0;
  const displayCount = isReviewMode ? adjustedCount : baseCount;

  const rangeLabel = hasEffectiveRange
    ? `${isBS ? formatLongBS(heartStart) || formatLongAD(heartStart) : formatLongAD(heartStart)} → ${
        isBS ? formatLongBS(effectiveEnd) || formatLongAD(effectiveEnd) : formatLongAD(effectiveEnd)
      }`
    : "";

  async function persistSavedRanges(nextRanges) {
    setSavedRanges(nextRanges);
    await AsyncStorage.setItem(STORAGE_SAVED_RANGES_KEY, JSON.stringify(nextRanges));
  }

  async function persistTodoMap(nextMap) {
    setTodoMap(nextMap);
    await AsyncStorage.setItem(STORAGE_TODO_KEY, JSON.stringify(nextMap));
  }

  function formatDateForMode(date, nextIsBS) {
    return nextIsBS ? formatDateBS(date) || formatDate(date) : formatDate(date);
  }

  function clearSelection() {
    setRangeStart(null);
    setRangeEnd(null);
    setStartInput("");
    setEndInput("");
    setLockedRange(null);
    setSavedRangeId(null);
    setSavedRangeTitle(null);
    setLocalDeducted([]);
    setLocalAdded([]);
    setHeartActive(false);
  }

  function switchMode(nextIsBS) {
    setIsBS(nextIsBS);
    const start = lockedRange?.start ?? rangeStart;
    const end = lockedRange?.end ?? rangeEnd;
    setStartInput(start ? formatDateForMode(start, nextIsBS) : "");
    setEndInput(end ? formatDateForMode(end, nextIsBS) : "");
  }

  function handleStartInputChange(value) {
    if (lockedRange) return;
    setStartInput(value);
    const parsed = isBS ? parseBSMMDD(value, currentBSData) : parseMMDD(value, inputYearAD);
    if (!parsed) {
      if (!value) {
        setRangeStart(null);
        setRangeEnd(null);
        setEndInput("");
      }
      return;
    }
    setRangeStart(parsed);
    setRangeEnd(null);
    setEndInput("");
  }

  function handleEndInputChange(value) {
    if (lockedRange) return;
    setEndInput(value);
    const parsed = isBS ? parseBSMMDD(value, currentBSData) : parseMMDD(value, inputYearAD);
    if (!parsed) {
      if (!value) setRangeEnd(null);
      return;
    }
    setRangeEnd(parsed);
  }

  function handleDayPress(date, info) {
    if (isReviewMode) {
      if (!effectiveStart || !effectiveEnd || !info.inRange || info.isSaturday) return;
      const key = toDateKey(date);
      if (localDeducted.includes(key)) {
        setLocalDeducted((prev) => prev.filter((item) => item !== key));
        return;
      }
      if (localAdded.includes(key)) {
        setLocalAdded((prev) => prev.filter((item) => item !== key));
        return;
      }

      const col = date.getDay();
      const baseWorking =
        customWorkingDays != null
          ? col < customWorkingDays && col !== 6
          : excludeWeekends
            ? col !== 0 && col !== 6
            : false;
      const baseYellow =
        customWorkingDays != null
          ? col >= customWorkingDays || col === 6
          : excludeWeekends
            ? col === 0 || col === 6
            : false;

      if (baseWorking) setLocalDeducted((prev) => [...prev, key]);
      else if (baseYellow) setLocalAdded((prev) => [...prev, key]);
      return;
    }

    if (lockedRange) return;
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(date);
      setRangeEnd(null);
      setStartInput(formatDateForMode(date, isBS));
      setEndInput("");
      return;
    }
    setRangeEnd(date);
    setEndInput(formatDateForMode(date, isBS));
  }

  function handleDayLongPress(date, info) {
    if (!isReviewMode || !info.inRange) return;
    setTodoDialogDate(date);
    setTodoDialogOpen(true);
    setNewTaskText("");
  }

  function applyDaysMode() {
    const num = Number(daysInput);
    if (!Number.isInteger(num) || num < 1 || num > 999) return;
    const start = startOfDay(new Date());
    const end = startOfDay(new Date());
    end.setDate(end.getDate() + num - 1);
    setRangeStart(start);
    setRangeEnd(end);
    setStartInput(formatDateForMode(start, isBS));
    setEndInput(formatDateForMode(end, isBS));
    setShowDaysInput(false);
    setDaysInput("");
  }

  function toggleRangeLock() {
    if (lockedRange) {
      setLockedRange(null);
      setSavedRangeId(null);
      setSavedRangeTitle(null);
      setLocalDeducted([]);
      setLocalAdded([]);
      return;
    }
    if (!hasEffectiveRange) return;
    setLockedRange({ start: new Date(effectiveStart), end: new Date(effectiveEnd) });
  }

  function openSaveRange() {
    if (!hasEffectiveRange) return;
    setSaveRangeTitle(savedRangeTitle ?? "");
    setShowSaveRangeModal(true);
  }

  async function saveCurrentRange() {
    if (!hasEffectiveRange) return;
    const title =
      saveRangeTitle.trim() ||
      `${isBS ? formatLongBS(effectiveStart) || formatLongAD(effectiveStart) : formatLongAD(effectiveStart)} → ${
        isBS ? formatLongBS(effectiveEnd) || formatLongAD(effectiveEnd) : formatLongAD(effectiveEnd)
      }`;
    const entry = {
      id: createId(),
      title,
      start: effectiveStart.toISOString(),
      end: effectiveEnd.toISOString(),
      plusDays: customWorkingDays,
      deducted: localDeducted,
      added: localAdded,
      calendarMode: isBS ? "BS" : "AD",
      updatedAt: new Date().toISOString(),
    };
    const nextRanges = [entry, ...savedRanges];
    await persistSavedRanges(nextRanges);
    setSavedRangeId(entry.id);
    setSavedRangeTitle(title);
    setLockedRange({ start: new Date(effectiveStart), end: new Date(effectiveEnd) });
    setShowSaveRangeModal(false);
  }

  async function updateSavedRange() {
    if (!savedRangeId || !hasEffectiveRange) return;
    const nextRanges = savedRanges.map((entry) =>
      entry.id === savedRangeId
        ? {
            ...entry,
            start: effectiveStart.toISOString(),
            end: effectiveEnd.toISOString(),
            plusDays: customWorkingDays,
            deducted: localDeducted,
            added: localAdded,
            updatedAt: new Date().toISOString(),
          }
        : entry
    );
    await persistSavedRanges(nextRanges);
  }

  async function loadSavedRange(entry) {
    const start = startOfDay(new Date(entry.start));
    const end = startOfDay(new Date(entry.end));
    const entryModeIsBS = entry.calendarMode === "BS";
    setIsBS(entryModeIsBS);
    setRangeStart(start);
    setRangeEnd(end);
    setLockedRange({ start, end });
    setStartInput(formatDateForMode(start, entryModeIsBS));
    setEndInput(formatDateForMode(end, entryModeIsBS));
    setCustomWorkingDays(entry.plusDays >= 1 && entry.plusDays <= 7 ? entry.plusDays : null);
    setExcludeWeekends(false);
    setSavedRangeId(entry.id);
    setSavedRangeTitle(entry.title);
    setLocalDeducted(Array.isArray(entry.deducted) ? entry.deducted : []);
    setLocalAdded(Array.isArray(entry.added) ? entry.added : []);
    setShowSavedRangesModal(false);
  }

  async function removeSavedRange(id) {
    const nextRanges = savedRanges.filter((entry) => entry.id !== id);
    await persistSavedRanges(nextRanges);
    if (savedRangeId === id) {
      setSavedRangeId(null);
      setSavedRangeTitle(null);
      setLocalDeducted([]);
      setLocalAdded([]);
    }
  }

  async function extendByOneWorkday() {
    if (!savedRangeId || !hasEffectiveRange) return;
    const newEnd = getNextWorkingDay(effectiveEnd, customWorkingDays, excludeWeekends);
    const nextRange = { start: new Date(effectiveStart), end: newEnd };
    setLockedRange(nextRange);
    setRangeStart(nextRange.start);
    setRangeEnd(nextRange.end);
    setStartInput(formatDateForMode(nextRange.start, isBS));
    setEndInput(formatDateForMode(nextRange.end, isBS));

    const nextRanges = savedRanges.map((entry) =>
      entry.id === savedRangeId
        ? { ...entry, end: newEnd.toISOString(), updatedAt: new Date().toISOString() }
        : entry
    );
    await persistSavedRanges(nextRanges);
  }

  function openCustomWorkingDays() {
    setWorkingDaysInput(customWorkingDays ? String(customWorkingDays) : "");
    setShowWorkingDaysModal(true);
  }

  function applyCustomWorkingDays() {
    const value = Number(workingDaysInput);
    if (!Number.isInteger(value) || value < 1 || value > 7) return;
    setCustomWorkingDays(value);
    setExcludeWeekends(false);
    setShowWorkingDaysModal(false);
  }

  const todoStorageKey = savedRangeId && todoDialogDate ? `${savedRangeId}:${toDateKey(todoDialogDate)}` : null;
  const todoTasks = todoStorageKey ? todoMap[todoStorageKey] || [] : [];

  async function addTodoTask() {
    if (!todoStorageKey) return;
    const text = newTaskText.trim();
    if (!text) return;
    const nextTasks = [...todoTasks, { id: createId(), text, done: false }];
    const nextMap = { ...todoMap, [todoStorageKey]: nextTasks };
    await persistTodoMap(nextMap);
    setNewTaskText("");
  }

  async function toggleTodoTask(taskId) {
    if (!todoStorageKey) return;
    const nextTasks = todoTasks.map((task) =>
      task.id === taskId ? { ...task, done: !task.done } : task
    );
    const nextMap = { ...todoMap, [todoStorageKey]: nextTasks };
    await persistTodoMap(nextMap);
  }

  async function deleteTodoTask(taskId) {
    if (!todoStorageKey) return;
    const task = todoTasks.find((t) => t.id === taskId);
    if (!task || !task.done) return;
    const nextTasks = todoTasks.filter((t) => t.id !== taskId);
    const nextMap = { ...todoMap, [todoStorageKey]: nextTasks };
    await persistTodoMap(nextMap);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Klar Native</Text>
          <Text style={styles.subBrand}>Expo + React Native rewrite</Text>
          <Text style={styles.yearTitle}>{yearTitle}</Text>
        </View>

        <View style={styles.modeRow}>
          <Pressable
            style={[styles.modeButton, !isBS ? styles.modeButtonActive : null]}
            onPress={() => switchMode(false)}
          >
            <Text style={[styles.modeButtonText, !isBS ? styles.modeButtonTextActive : null]}>A.D</Text>
          </Pressable>
          <Pressable
            style={[styles.modeButton, isBS ? styles.modeButtonActive : null]}
            onPress={() => switchMode(true)}
          >
            <Text style={[styles.modeButtonText, isBS ? styles.modeButtonTextActive : null]}>B.S</Text>
          </Pressable>
        </View>

        <View style={styles.inputsWrap}>
          <DateField
            label="Start"
            value={startInput}
            onChangeText={handleStartInputChange}
            editable={!lockedRange}
            placeholder="MM/DD"
          />
          <Text style={styles.arrow}>→</Text>
          <DateField
            label="End"
            value={endInput}
            onChangeText={handleEndInputChange}
            editable={!lockedRange}
            placeholder="MM/DD"
          />
          <Pressable style={styles.iconButton} onPress={clearSelection}>
            <Text style={styles.iconButtonText}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.quickActions}>
          <Pressable
            style={[styles.actionChip, showDaysInput ? styles.actionChipActive : null]}
            onPress={() => setShowDaysInput((prev) => !prev)}
          >
            <Text style={styles.actionChipText}>Days mode</Text>
          </Pressable>
          <Pressable style={styles.actionChip} onPress={() => setShowSavedRangesModal(true)}>
            <Text style={styles.actionChipText}>Saved</Text>
          </Pressable>
          <Pressable
            style={[styles.actionChip, excludeWeekends ? styles.actionChipActive : null]}
            onPress={() => {
              const next = !excludeWeekends;
              setExcludeWeekends(next);
              if (next) setCustomWorkingDays(null);
            }}
          >
            <Text style={styles.actionChipText}>No weekends</Text>
          </Pressable>
          <Pressable
            style={[styles.actionChip, customWorkingDays != null ? styles.actionChipBlue : null]}
            onPress={openCustomWorkingDays}
          >
            <Text style={styles.actionChipText}>
              {customWorkingDays != null ? `Custom: ${customWorkingDays}` : "Custom days"}
            </Text>
          </Pressable>
        </View>

        {showDaysInput ? (
          <View style={styles.daysModeRow}>
            <TextInput
              style={styles.daysInput}
              keyboardType="number-pad"
              value={daysInput}
              onChangeText={(text) => setDaysInput(text.replace(/\D/g, "").slice(0, 3))}
              placeholder="Set range by N days"
              placeholderTextColor="rgba(232,213,183,0.25)"
            />
            <Pressable style={styles.inlineButton} onPress={applyDaysMode}>
              <Text style={styles.inlineButtonText}>Apply</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.summaryBar}>
          {hasEffectiveRange ? (
            <>
              <Text style={styles.summaryLabel}>{rangeLabel}</Text>
              <View style={styles.summaryDivider} />
              <Pressable onPress={() => setHeartActive((prev) => !prev)}>
                <Text style={styles.summaryValue}>
                  {displayCount} {excludeWeekends || customWorkingDays != null ? "working days" : "days"}
                  {heartActive ? " left" : ""}
                </Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.emptyHint}>Tap a day or enter MM/DD to set a range.</Text>
          )}
        </View>

        <View style={styles.controlRow}>
          <Pressable style={[styles.actionChip, lockedRange ? styles.actionChipActive : null]} onPress={toggleRangeLock}>
            <Text style={styles.actionChipText}>{lockedRange ? "Unlock" : "Lock"}</Text>
          </Pressable>
          <Pressable style={styles.actionChip} onPress={openSaveRange}>
            <Text style={styles.actionChipText}>Save range</Text>
          </Pressable>
          {savedRangeId ? (
            <>
              <Pressable style={styles.actionChip} onPress={updateSavedRange}>
                <Text style={styles.actionChipText}>Update saved</Text>
              </Pressable>
              <Pressable style={styles.actionChip} onPress={extendByOneWorkday}>
                <Text style={styles.actionChipText}>+1 workday</Text>
              </Pressable>
            </>
          ) : null}
        </View>

        {savedRangeTitle ? (
          <Text style={styles.savedTitle} numberOfLines={1}>
            Saved range: {savedRangeTitle}
          </Text>
        ) : null}

        <View style={styles.monthGrid}>
          {monthItems.map((month) => (
            <MonthCalendar
              key={month.id}
              monthLabel={month.monthLabel}
              cells={month.cells}
              rangeStart={heartStart}
              rangeEnd={effectiveEnd}
              excludeWeekends={excludeWeekends && customWorkingDays == null}
              customWorkingDays={customWorkingDays}
              deducted={localDeducted}
              added={localAdded}
              isReviewMode={isReviewMode}
              onDayPress={handleDayPress}
              onDayLongPress={handleDayLongPress}
            />
          ))}
        </View>

        <View style={styles.legend}>
          <Text style={styles.legendText}>● Orange: range</Text>
          <Text style={styles.legendText}>● Blue: working day</Text>
          <Text style={styles.legendText}>● Red: excluded/weekend</Text>
          <Text style={styles.legendText}>● Green: today</Text>
        </View>
        {isReviewMode ? (
          <Text style={styles.reviewHint}>Review mode: tap days to toggle + long-press a day for tasks.</Text>
        ) : null}
      </ScrollView>

      <ModalShell
        visible={showWorkingDaysModal}
        title="Custom Working Days"
        onClose={() => setShowWorkingDaysModal(false)}
        footer={
          <>
            <Pressable style={styles.modalFooterButton} onPress={applyCustomWorkingDays}>
              <Text style={styles.modalFooterButtonText}>Apply</Text>
            </Pressable>
            <Pressable
              style={[styles.modalFooterButton, styles.modalFooterButtonMuted]}
              onPress={() => {
                setCustomWorkingDays(null);
                setWorkingDaysInput("");
                setShowWorkingDaysModal(false);
              }}
            >
              <Text style={styles.modalFooterButtonText}>Reset</Text>
            </Pressable>
          </>
        }
      >
        <Text style={styles.modalHint}>Pick first N weekdays (1-7). Saturday remains non-working.</Text>
        <TextInput
          style={styles.modalInput}
          keyboardType="number-pad"
          value={workingDaysInput}
          onChangeText={(text) => setWorkingDaysInput(text.replace(/\D/g, "").slice(0, 1))}
          placeholder="e.g. 5"
          placeholderTextColor="rgba(232,213,183,0.25)"
        />
      </ModalShell>

      <ModalShell
        visible={showSaveRangeModal}
        title="Save Current Range"
        onClose={() => setShowSaveRangeModal(false)}
        footer={
          <Pressable style={styles.modalFooterButton} onPress={saveCurrentRange}>
            <Text style={styles.modalFooterButtonText}>Save</Text>
          </Pressable>
        }
      >
        <Text style={styles.modalHint}>Name this range:</Text>
        <TextInput
          style={styles.modalInput}
          value={saveRangeTitle}
          onChangeText={setSaveRangeTitle}
          placeholder="Focus Sprint / Quarter Goal"
          placeholderTextColor="rgba(232,213,183,0.25)"
        />
      </ModalShell>

      <ModalShell visible={showSavedRangesModal} title="Saved Ranges" onClose={() => setShowSavedRangesModal(false)}>
        {savedRanges.length ? (
          savedRanges.map((entry) => {
            const start = new Date(entry.start);
            const end = new Date(entry.end);
            return (
              <View key={entry.id} style={styles.savedRow}>
                <View style={styles.savedInfo}>
                  <Text style={styles.savedRowTitle} numberOfLines={1}>
                    {entry.title}
                  </Text>
                  <Text style={styles.savedRowSub}>
                    {(entry.calendarMode === "BS" ? formatDateBS(start) || formatDate(start) : formatDate(start))} →{" "}
                    {(entry.calendarMode === "BS" ? formatDateBS(end) || formatDate(end) : formatDate(end))}
                  </Text>
                </View>
                <Pressable style={styles.savedAction} onPress={() => loadSavedRange(entry)}>
                  <Text style={styles.savedActionText}>Load</Text>
                </Pressable>
                <Pressable style={[styles.savedAction, styles.savedActionDanger]} onPress={() => removeSavedRange(entry.id)}>
                  <Text style={styles.savedActionText}>Del</Text>
                </Pressable>
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyHint}>No saved ranges yet.</Text>
        )}
      </ModalShell>

      <ModalShell
        visible={todoDialogOpen}
        title={todoDialogDate ? `Tasks · ${isBS ? formatLongBS(todoDialogDate) || formatLongAD(todoDialogDate) : formatLongAD(todoDialogDate)}` : "Tasks"}
        onClose={() => setTodoDialogOpen(false)}
      >
        {todoTasks.map((task) => (
          <View key={task.id} style={styles.taskRow}>
            <Pressable onPress={() => toggleTodoTask(task.id)} style={styles.taskToggle}>
              <Text style={styles.taskToggleText}>{task.done ? "✓" : "○"}</Text>
            </Pressable>
            <Text style={[styles.taskText, task.done ? styles.taskTextDone : null]} numberOfLines={2}>
              {task.text}
            </Text>
            <Pressable onPress={() => deleteTodoTask(task.id)} style={styles.taskDelete}>
              <Text style={styles.taskDeleteText}>Del</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.newTaskRow}>
          <TextInput
            style={[styles.modalInput, styles.newTaskInput]}
            value={newTaskText}
            onChangeText={setNewTaskText}
            placeholder="New task..."
            placeholderTextColor="rgba(232,213,183,0.25)"
          />
          <Pressable style={styles.inlineButton} onPress={addTodoTask}>
            <Text style={styles.inlineButtonText}>Add</Text>
          </Pressable>
        </View>
      </ModalShell>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0d0805",
  },
  page: {
    paddingHorizontal: 16,
    paddingBottom: 44,
    paddingTop: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  brand: {
    fontSize: 44,
    color: "#e8d5b7",
    fontWeight: "700",
    letterSpacing: 1,
  },
  subBrand: {
    color: "rgba(245,166,35,0.62)",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 3,
  },
  yearTitle: {
    color: "#e8d5b7",
    fontSize: 30,
    marginTop: 6,
    fontWeight: "600",
  },
  modeRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 14,
  },
  modeButton: {
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.45)",
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: "transparent",
  },
  modeButtonActive: {
    backgroundColor: "rgba(245,166,35,0.2)",
    borderColor: "rgba(245,166,35,0.8)",
  },
  modeButtonText: {
    color: "rgba(245,166,35,0.72)",
    fontWeight: "600",
    letterSpacing: 1.5,
  },
  modeButtonTextActive: {
    color: "#e8d5b7",
  },
  inputsWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  dateField: {
    flex: 1,
  },
  dateLabel: {
    color: "rgba(245,166,35,0.55)",
    textTransform: "uppercase",
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 6,
  },
  dateInput: {
    backgroundColor: "rgba(245,166,35,0.08)",
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.35)",
    borderRadius: 10,
    color: "#e8d5b7",
    fontSize: 20,
    textAlign: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  arrow: {
    color: "rgba(245,166,35,0.65)",
    fontSize: 20,
    marginHorizontal: 8,
    marginBottom: 12,
  },
  iconButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.22)",
  },
  iconButtonText: {
    color: "rgba(232,213,183,0.65)",
    fontSize: 14,
    fontWeight: "700",
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  controlRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  actionChip: {
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.4)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  actionChipActive: {
    backgroundColor: "rgba(245,166,35,0.2)",
    borderColor: "rgba(245,166,35,0.8)",
  },
  actionChipBlue: {
    backgroundColor: "rgba(80,140,200,0.25)",
    borderColor: "rgba(80,140,200,0.7)",
  },
  actionChipText: {
    color: "#e8d5b7",
    fontSize: 12,
    fontWeight: "600",
  },
  daysModeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  daysInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.3)",
    backgroundColor: "rgba(255,255,255,0.03)",
    color: "#e8d5b7",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
  },
  inlineButton: {
    backgroundColor: "rgba(245,166,35,0.2)",
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.65)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inlineButtonText: {
    color: "#e8d5b7",
    fontWeight: "700",
    fontSize: 12,
  },
  summaryBar: {
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.24)",
    borderRadius: 14,
    backgroundColor: "rgba(245,166,35,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  summaryLabel: {
    color: "#f5c870",
    fontSize: 12,
    marginBottom: 7,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "rgba(245,166,35,0.16)",
    marginBottom: 7,
  },
  summaryValue: {
    color: "#e8d5b7",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyHint: {
    color: "rgba(232,213,183,0.56)",
    fontSize: 12,
  },
  savedTitle: {
    color: "rgba(245,166,35,0.95)",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  monthCard: {
    width: "48%",
    minWidth: 165,
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.35)",
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.025)",
    padding: 10,
    marginBottom: 10,
  },
  monthTitle: {
    color: "#e8d5b7",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 1.3,
    fontSize: 11,
    marginBottom: 8,
  },
  daysHeaderRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  daysHeaderCell: {
    width: "14.2857%",
    textAlign: "center",
    color: "rgba(232,213,183,0.36)",
    fontSize: 10,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCellEmpty: {
    width: "14.2857%",
    minHeight: 25,
  },
  dayCell: {
    width: "14.2857%",
    minHeight: 25,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 3,
    marginBottom: 2,
  },
  dayCellText: {
    fontSize: 11,
  },
  legend: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(245,166,35,0.2)",
    paddingTop: 10,
  },
  legendText: {
    color: "rgba(232,213,183,0.55)",
    fontSize: 11,
    marginBottom: 4,
  },
  reviewHint: {
    color: "rgba(70,200,110,0.85)",
    marginTop: 6,
    fontSize: 11,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 540,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.28)",
    backgroundColor: "#1a0e00",
    padding: 14,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modalTitle: {
    color: "#e8d5b7",
    fontSize: 17,
    fontWeight: "700",
  },
  modalClose: {
    color: "rgba(232,213,183,0.7)",
    fontSize: 18,
  },
  modalBody: {
    maxHeight: 430,
  },
  modalFooter: {
    flexDirection: "row",
    marginTop: 12,
  },
  modalFooterButton: {
    backgroundColor: "rgba(245,166,35,0.24)",
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.68)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 8,
  },
  modalFooterButtonMuted: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.22)",
  },
  modalFooterButtonText: {
    color: "#e8d5b7",
    fontWeight: "700",
  },
  modalHint: {
    color: "rgba(232,213,183,0.7)",
    marginBottom: 8,
    fontSize: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.34)",
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    color: "#e8d5b7",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.03)",
    marginBottom: 8,
    padding: 8,
  },
  savedInfo: {
    flex: 1,
    marginRight: 8,
  },
  savedRowTitle: {
    color: "#e8d5b7",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  savedRowSub: {
    color: "rgba(232,213,183,0.62)",
    fontSize: 11,
  },
  savedAction: {
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.5)",
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginLeft: 6,
  },
  savedActionDanger: {
    borderColor: "rgba(200,80,80,0.55)",
  },
  savedActionText: {
    color: "#e8d5b7",
    fontSize: 11,
    fontWeight: "700",
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  taskToggle: {
    width: 32,
    alignItems: "center",
  },
  taskToggleText: {
    color: "rgba(70,200,110,0.9)",
    fontSize: 16,
    fontWeight: "700",
  },
  taskText: {
    flex: 1,
    color: "#e8d5b7",
    fontSize: 13,
  },
  taskTextDone: {
    textDecorationLine: "line-through",
    color: "rgba(232,213,183,0.45)",
  },
  taskDelete: {
    width: 38,
    alignItems: "center",
  },
  taskDeleteText: {
    color: "rgba(200,80,80,0.95)",
    fontSize: 11,
    fontWeight: "700",
  },
  newTaskRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  newTaskInput: {
    flex: 1,
    marginRight: 8,
  },
});
