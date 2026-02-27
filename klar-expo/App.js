import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import Toast from "react-native-toast-message";
import { WebView } from "react-native-webview";
import Svg, { Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useFonts } from "expo-font";
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import { DMMono_400Regular, DMMono_500Medium } from "@expo-google-fonts/dm-mono";
import {
  Bookmark,
  CalendarClock,
  CalendarMinus,
  CalendarPlus,
  CalendarRange,
  Circle,
  CircleCheck,
  Github,
  Heart,
  Instagram,
  Linkedin,
  Lock,
  LockOpen,
  Plus,
  RefreshCw,
  Trash2,
  Wifi,
  X,
  Youtube,
} from "lucide-react-native";

const STORAGE_SAVED_RANGES_KEY = "@klar_expo/saved_ranges/v1";
const STORAGE_TODO_KEY = "@klar_expo/todo_map/v1";

const AD_DEFAULT_YEAR = 2026;
const ONE_DAY_MS = 86400000;
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const toastStyle = { fontFamily: "DMMono_400Regular" };
function capitalize(s) {
  if (!s || typeof s !== "string") return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
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

const SOCIAL_LINKS = [
  { Icon: Instagram, href: "https://instagram.com/sandesb_", label: "Instagram" },
  { Icon: Youtube, href: "https://www.youtube.com/@SandeshBajracharya", label: "YouTube" },
  { Icon: Linkedin, href: "https://www.linkedin.com/in/sandesh-bajracharya-238104250/", label: "LinkedIn" },
  { Icon: Github, href: "https://github.com/sandesb", label: "GitHub" },
  { Icon: Wifi, href: "https://open.spotify.com/artist/6bjgnPHECLtzUfHVih7OaT?si=ju5toG1pQjyorcCYr17H7Q", label: "Spotify" },
];

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

const BULB_SIZE = 14; // px — the teardrop SVG rendered size

function KlaryBrand({ yearTitle, yearSubLabel }) {
  const [bulbLit, setBulbLit] = useState(true);
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!bulbLit) {
      glowAnim.stopAnimation();
      Animated.timing(glowAnim, { toValue: 0, duration: 400, useNativeDriver: false }).start();
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [bulbLit]);

  const shadowRadius = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [4, 14] });
  const shadowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.38, 0.75] });

  return (
    <View style={brandStyles.header}>
      {/* "Klar" + bulb + "y" on one line */}
      <View style={brandStyles.titleRow}>
        <Text style={brandStyles.brandText}>Klar</Text>
        <Pressable
          onPress={() => setBulbLit((v) => !v)}
          style={brandStyles.bulbWrap}
          accessibilityLabel={bulbLit ? "Turn off bulb" : "Turn on bulb"}
        >
          <Animated.View
            style={[
              brandStyles.bulbGlow,
              bulbLit
                ? { shadowColor: "#f5a623", shadowOffset: { width: 0, height: 0 }, shadowRadius, shadowOpacity, elevation: 6 }
                : null,
            ]}
          >
            <Svg
              viewBox="0 0 10 15"
              width={BULB_SIZE}
              height={BULB_SIZE * 1.5}
              style={{ overflow: "visible" }}
            >
              <Path
                d="M5 0.5 C2.2 0.5 0.5 2.4 0.5 4.8 C0.5 7.6 2.2 10.2 5 14 C7.8 10.2 9.5 7.6 9.5 4.8 C9.5 2.4 7.8 0.5 5 0.5 Z"
                fill={bulbLit ? "#f5a623" : "rgba(180,140,70,0.22)"}
              />
              {bulbLit ? (
                <Path
                  d="M3 2.2 Q2.2 3.5 2.6 5"
                  fill="none"
                  stroke="rgba(255,255,255,0.45)"
                  strokeWidth="0.9"
                  strokeLinecap="round"
                />
              ) : null}
            </Svg>
          </Animated.View>
        </Pressable>
        <Text style={brandStyles.brandText}>y</Text>
      </View>

      <Text style={brandStyles.subBrand}>· A Calendar App By Sandy ·</Text>
      <Text style={brandStyles.yearTitle}>{yearTitle}</Text>
      <Text style={brandStyles.yearSubLabel}>{yearSubLabel}</Text>
    </View>
  );
}

const brandStyles = StyleSheet.create({
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  brandText: {
    fontSize: 68,
    color: "#e8d5b7",
    marginTop:30,
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: 2,
    lineHeight: 72,
  },
  bulbWrap: {
    marginTop: 36,
    marginHorizontal: 1,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  bulbGlow: {
    alignItems: "center",
    justifyContent: "center",
  },
  subBrand: {
    color: "rgba(245,166,35,0.5)",
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 12,
    fontFamily: "DMMono_400Regular",
  },
  yearTitle: {
    color: "#e8d5b7",
    fontSize: 80,
    marginTop: 8,
    fontFamily: "PlayfairDisplay_400Regular",
    letterSpacing: -1,
    lineHeight: 76,
  },
  yearSubLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    letterSpacing: 4,
    textTransform: "uppercase",
    color: "rgba(245,166,35,0.5)",
    marginTop: 6,
    marginBottom: 4,
  },
});

function ModalShell({ visible, title, onClose, children, footer }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose}>
              <X size={18} color="rgba(232,213,183,0.7)" />
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
        style={[
          styles.dateInput,
          !editable ? styles.inputDisabled : null,
          value ? styles.dateInputFilled : null,
        ]}
      />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold,
    DMMono_400Regular,
    DMMono_500Medium,
  });

  const scrollViewRef = useRef(null);
  const startMonthY = useRef(null);    // y of start-month card relative to monthGrid
  const monthGridY = useRef(0);        // y of monthGrid relative to ScrollView content
  const [scrollTrigger, setScrollTrigger] = useState(0); // incremented to trigger scroll

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
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpLoading, setHelpLoading] = useState(true);
  const [helpError, setHelpError] = useState(false);

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

  // Auto-scroll to the start-month card when a range is set, mode is switched, or layout is ready
  useEffect(() => {
    if (!effectiveStart) return;
    if (startMonthY.current === null) return;
    const timer = setTimeout(() => {
      if (scrollViewRef.current && startMonthY.current !== null) {
        const targetY = monthGridY.current + startMonthY.current - 16;
        scrollViewRef.current.scrollTo({ y: Math.max(0, targetY), animated: true });
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [effectiveStart, isBS, scrollTrigger]);
  const today = startOfDay(new Date());
  const todayInRange = hasEffectiveRange && today >= effectiveStart && today <= effectiveEnd;
  const heartStart = heartActive && todayInRange && today > effectiveStart ? today : effectiveStart;

  const [showTimeAware, setShowTimeAware] = useState(false);
  const [timeAwareFrozen, setTimeAwareFrozen] = useState(false);
  const [, setTimeTick] = useState(0);

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
    const d = ta.days, h = ta.hours;
    const dayStr = d === 1 ? "1 day" : `${d} days`;
    const hrStr = h === 1 ? "1 hr" : `${h} hrs`;
    if (d === 0 && h === 0) return "0 hrs";
    if (d === 0) return hrStr;
    if (h === 0) return dayStr;
    return `${dayStr} ${hrStr}`;
  }

  const timeAware = todayInRange ? getTimeAwareRemaining() : null;

  // Reset flip state when range changes
  useEffect(() => {
    setShowTimeAware(false);
    setTimeAwareFrozen(false);
  }, [effectiveStart?.getTime(), effectiveEnd?.getTime()]);

  // Flip between day count and time-aware every 1500ms; tick to refresh hours when frozen
  useEffect(() => {
    if (!todayInRange || !hasEffectiveRange) return;
    const id = setInterval(() => {
      if (!timeAwareFrozen) {
        setShowTimeAware((v) => !v);
      } else {
        setTimeTick((v) => v + 1);
      }
    }, 1500);
    return () => clearInterval(id);
  }, [todayInRange, timeAwareFrozen, hasEffectiveRange]);

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
    startMonthY.current = null; // reset so we re-measure after layout
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
    Toast.show({
      type: "success",
      text1: `Start: ${isBS ? formatLongBS(parsed) || formatLongAD(parsed) : formatLongAD(parsed)}`,
      text1Style: toastStyle,
    });
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
    if (rangeStart) {
      Toast.show({ type: "success", text1: "You can switch now", text1Style: toastStyle });
    }
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
      Toast.show({
        type: "success",
        text1: `Start: ${isBS ? formatLongBS(date) || formatLongAD(date) : formatLongAD(date)}`,
        text1Style: toastStyle,
      });
      return;
    }
    setRangeEnd(date);
    setEndInput(formatDateForMode(date, isBS));
    Toast.show({ type: "success", text1: "You can switch now", text1Style: toastStyle });
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
    Toast.show({ type: "success", text1: "You can switch now", text1Style: toastStyle });
  }

  function toggleRangeLock() {
    if (lockedRange) {
      setLockedRange(null);
      setSavedRangeId(null);
      setSavedRangeTitle(null);
      setLocalDeducted([]);
      setLocalAdded([]);
      Toast.show({ type: "success", text1: "Range unlocked", text1Style: toastStyle });
      return;
    }
    if (!hasEffectiveRange) return;
    setLockedRange({ start: new Date(effectiveStart), end: new Date(effectiveEnd) });
    Toast.show({ type: "success", text1: "Range locked", text1Style: toastStyle });
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
    Toast.show({ type: "success", text1: `${capitalize(title)} is saved`, text1Style: toastStyle });
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
    Toast.show({
      type: "success",
      text1: `Changes updated in '${savedRangeTitle || "saved range"}'`,
      text1Style: toastStyle,
    });
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
    Toast.show({
      type: "success",
      text1: `Range extended to ${isBS ? formatLongBS(newEnd) || formatLongAD(newEnd) : formatLongAD(newEnd)} · 1 working day added in '${savedRangeTitle}'`,
      text1Style: toastStyle,
    });
  }

  function openCustomWorkingDays() {
    setWorkingDaysInput(customWorkingDays ? String(customWorkingDays) : "");
    setShowWorkingDaysModal(true);
  }

  function applyCustomWorkingDays() {
    const value = Number(workingDaysInput);
    if (!Number.isInteger(value) || value < 1 || value > 7) return;
    const n = value;
    setCustomWorkingDays(value);
    setExcludeWeekends(false);
    setShowWorkingDaysModal(false);
    Toast.show({
      type: "success",
      text1: `Working days applied: first ${n} days (Sun–${DAY_NAMES[n - 1]})`,
      text1Style: toastStyle,
    });
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
    if (!task) return;
    if (!task.done) {
      Toast.show({ type: "info", text1: "Please finish the task first", text1Style: toastStyle });
      return;
    }
    const nextTasks = todoTasks.filter((t) => t.id !== taskId);
    const nextMap = { ...todoMap, [todoStorageKey]: nextTasks };
    await persistTodoMap(nextMap);
    Toast.show({ type: "success", text1: "Task deleted", text1Style: toastStyle });
  }

  if (!fontsLoaded) return null;

  return (
    <>
    <LinearGradient
      colors={["#0a0d1a", "#1a0e00", "#0d0805"]}
      locations={[0, 1, 1]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <Pressable
          style={[styles.helpButton, styles.helpButtonFloating]}
          onPress={() => {
            setHelpOpen(true);
            setHelpLoading(true);
            setHelpError(false);
          }}
          title="Using Klary (Help)"
        >
          <Text style={styles.helpButtonText}>?</Text>
        </Pressable>
        <ScrollView ref={scrollViewRef} contentContainerStyle={styles.page}>
          <KlaryBrand yearTitle={yearTitle} yearSubLabel="Year at a Glance" />

          <View style={styles.modeRow}>
            <View style={styles.modeToggleWrap}>
              <Pressable
                style={[styles.modeButton, styles.modeButtonLeft, !isBS ? styles.modeButtonActive : null]}
                onPress={() => switchMode(false)}
              >
                <Text style={[styles.modeButtonText, !isBS ? styles.modeButtonTextActive : null]}>A.D</Text>
              </Pressable>
              <Pressable
                style={[styles.modeButton, styles.modeButtonRight, isBS ? styles.modeButtonActive : null]}
                onPress={() => switchMode(true)}
              >
                <Text style={[styles.modeButtonText, isBS ? styles.modeButtonTextActive : null]}>B.S</Text>
              </Pressable>
            </View>
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
            {(rangeStart || rangeEnd) ? (
              <Pressable style={styles.iconButton} onPress={clearSelection}>
                <X size={16} color="rgba(232,213,183,0.65)" />
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.iconButton, styles.iconButtonMl, showDaysInput ? styles.iconButtonActive : null]}
              onPress={() => setShowDaysInput((prev) => !prev)}
              title="Set range by days"
            >
              <CalendarRange size={16} color={showDaysInput ? "#e8d5b7" : "rgba(232,213,183,0.4)"} />
            </Pressable>
            <Pressable
              style={[styles.iconButton, styles.iconButtonMl]}
              onPress={() => setShowSavedRangesModal(true)}
              title="Saved ranges"
            >
              <Bookmark size={16} color="rgba(232,213,183,0.4)" />
            </Pressable>
          </View>

          {showDaysInput ? (
            <View style={styles.daysModeRow}>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>Days</Text>
                <TextInput
                  style={styles.daysInput}
                  keyboardType="number-pad"
                  value={daysInput}
                  onChangeText={(text) => setDaysInput(text.replace(/\D/g, "").slice(0, 3))}
                  onSubmitEditing={applyDaysMode}
                  returnKeyType="done"
                  placeholder="50"
                  placeholderTextColor="rgba(232,213,183,0.25)"
                />
              </View>
            </View>
          ) : null}

          <View style={[styles.summaryBar, !hasEffectiveRange ? styles.summaryBarEmpty : null]}>
            {hasEffectiveRange ? (
              <>
                <Text style={styles.summaryLabel}>{rangeLabel}</Text>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryBottomRow}>
                  <Pressable
                    onPress={todayInRange
                      ? () => setTimeAwareFrozen((f) => !f)
                      : () => setHeartActive((prev) => !prev)}
                  >
                    <Text style={styles.summaryValue}>
                      {showTimeAware && timeAware
                        ? `${formatTimeAware(timeAware)}${heartActive ? " left" : ""}`
                        : `${displayCount} ${excludeWeekends || customWorkingDays != null ? "working days" : "days"}${heartActive ? " left" : ""}`
                      }
                    </Text>
                  </Pressable>
                  <View style={styles.summaryIcons}>
                    <Pressable
                      style={styles.summaryIconBtn}
                      onPress={() => {
                        const next = !excludeWeekends;
                        setExcludeWeekends(next);
                        if (next) setCustomWorkingDays(null);
                        Toast.show({
                          type: "success",
                          text1: next ? "Exclude weekends applied" : "Exclude weekends removed",
                          text1Style: toastStyle,
                        });
                      }}
                      title="Exclude weekends"
                    >
                      <CalendarMinus size={16} color={excludeWeekends ? "#f5a623" : "rgba(232,213,183,0.5)"} />
                    </Pressable>
                    <Pressable
                      style={styles.summaryIconBtn}
                      onPress={openCustomWorkingDays}
                      title="Custom working days"
                    >
                      <CalendarPlus size={16} color={customWorkingDays != null ? "#6ba3e8" : "rgba(232,213,183,0.5)"} />
                    </Pressable>
                    <Pressable
                      style={styles.summaryIconBtn}
                      onPress={() => setHeartActive((prev) => !prev)}
                      title="Remaining days from today"
                    >
                      <Heart size={16} color={heartActive ? "rgba(220,80,120,0.9)" : "rgba(232,213,183,0.5)"} />
                    </Pressable>
                    <Pressable
                      style={styles.summaryIconBtn}
                      onPress={toggleRangeLock}
                      title={lockedRange ? "Unlock range" : "Lock range"}
                    >
                      {lockedRange
                        ? <LockOpen size={16} color="#f5a623" />
                        : <Lock size={16} color="rgba(232,213,183,0.5)" />}
                    </Pressable>
                    <Pressable
                      style={styles.summaryIconBtn}
                      onPress={openSaveRange}
                      title="Save range"
                    >
                      <Bookmark size={16} color={savedRangeId ? "#f5a623" : "rgba(232,213,183,0.5)"} />
                    </Pressable>
                    {savedRangeId ? (
                      <>
                        <Pressable
                          style={styles.summaryIconBtn}
                          onPress={updateSavedRange}
                          title="Update saved range"
                        >
                          <RefreshCw size={16} color="rgba(232,213,183,0.5)" />
                        </Pressable>
                        <Pressable
                          style={styles.summaryIconBtn}
                          onPress={extendByOneWorkday}
                          title="+1 workday"
                        >
                          <CalendarClock size={16} color="rgba(80,160,220,0.8)" />
                        </Pressable>
                      </>
                    ) : null}
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.emptyHint}>Tap a day or enter MM/DD to set a range.</Text>
            )}
          </View>

          {savedRangeTitle ? (
            <Text style={styles.savedTitle} numberOfLines={1}>
              ● {savedRangeTitle}
            </Text>
          ) : null}

          <View
            style={styles.monthGrid}
            onLayout={(e) => { monthGridY.current = e.nativeEvent.layout.y; }}
          >
            {monthItems.map((month) => {
              const isStartMonth = effectiveStart
                ? month.cells.some((c) => c && sameDay(startOfDay(c.date), startOfDay(effectiveStart)))
                : false;
              return (
                <View
                  key={month.id}
                  style={styles.monthCardOuter}
                  onLayout={isStartMonth
                    ? (e) => {
                        startMonthY.current = e.nativeEvent.layout.y;
                        setScrollTrigger((n) => n + 1);
                      }
                    : undefined}
                >
                  <MonthCalendar
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
                </View>
              );
            })}
          </View>

          <View style={styles.legend}>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: "#f5a623" }]} />
              <Text style={styles.legendText}>Start / End</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendSquare, { backgroundColor: "rgba(245,166,35,0.2)" }]} />
              <Text style={styles.legendText}>In Range</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: "rgba(80,140,200,0.6)" }]} />
              <Text style={styles.legendText}>Working day</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: "rgba(200,80,80,0.55)" }]} />
              <Text style={styles.legendText}>Excluded / weekend</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, styles.legendDotGlow, { backgroundColor: "rgba(70,200,110,0.75)" }]} />
              <Text style={styles.legendText}>Today</Text>
            </View>
          </View>
          {isReviewMode ? (
            <Text style={styles.reviewHint}>Review mode: tap days to toggle + long-press a day for tasks.</Text>
          ) : null}

          <View style={styles.footerDivider} />
          <View style={styles.footerWrap}>
            <Text style={styles.footerBackstory}>
              {"· Little backstory as of Klar'y,\n\n· I love to visualize stuff. Numbers of days, weeks, months just pass by, and we call it a year. To track real progress, you have to be able to see how little time we have left here. Yet counting days feel like eternity. I felt this deep beneath my body whilst my time in Vipassana meditation, where each day felt like a year. 10 days = 10 years. But the hours I spent there, were very productive. So simple yet so difficult to just sit and let time pass on. What if we could make these days count and visually represent them? So here we are.\n\n· 'KLAR' means 'Clear' in German. I found clarity in my Vipassana experience. Hope Klary will help you in your journey too. Peace."}
            </Text>
            <Text style={styles.footerLabel}>Follow Me: @sandesb_</Text>
            <View style={styles.footerSocialRow}>
              {SOCIAL_LINKS.map(({ Icon, href, label }) => (
                <Pressable
                  key={href}
                  style={styles.footerSocialLink}
                  onPress={() => Linking.openURL(href)}
                >
                  <Icon size={18} color="rgba(232,213,183,0.5)" />
                  <Text style={styles.footerSocialText}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.footerCopy}>© {new Date().getFullYear()} Klary. All rights reserved.</Text>
          </View>
        </ScrollView>

        <ModalShell
          visible={helpOpen}
          title="Klary Help"
          onClose={() => setHelpOpen(false)}
        >
          <View style={styles.helpWebWrap}>
            {helpError ? (
              <View style={styles.helpErrorWrap}>
                <Text style={styles.helpErrorText}>
                  Please connect to the internet to view the help page.
                </Text>
              </View>
            ) : (
              <>
                {helpLoading && (
                  <View style={styles.helpLoadingOverlay}>
                    <ActivityIndicator size="small" color="#f5a623" />
                    <Text style={styles.helpLoadingText}>Loading help…</Text>
                  </View>
                )}
                <WebView
                  source={{ uri: "https://klary.live/help" }}
                  style={styles.helpWebView}
                  onLoadStart={() => {
                    setHelpLoading(true);
                    setHelpError(false);
                  }}
                  onLoadEnd={() => setHelpLoading(false)}
                  onError={() => {
                    setHelpLoading(false);
                    setHelpError(true);
                  }}
                />
              </>
            )}
          </View>
        </ModalShell>

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
                  Toast.show({ type: "success", text1: "Custom working days removed", text1Style: toastStyle });
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
                  <Pressable style={styles.savedInfo} onPress={() => loadSavedRange(entry)}>
                    <Text style={styles.savedRowTitle} numberOfLines={1}>
                      {entry.title}
                    </Text>
                    <Text style={styles.savedRowSub}>
                      {(entry.calendarMode === "BS" ? formatDateBS(start) || formatDate(start) : formatDate(start))} →{" "}
                      {(entry.calendarMode === "BS" ? formatDateBS(end) || formatDate(end) : formatDate(end))}
                    </Text>
                  </Pressable>
                  <Pressable
                      style={[styles.savedAction, styles.savedActionDanger]}
                      onPress={() => {
                        Alert.alert(
                          `Delete "${entry.title}"?`,
                          "This cannot be undone.",
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Delete",
                              style: "destructive",
                              onPress: () => {
                                const title = entry.title;
                                removeSavedRange(entry.id);
                                Toast.show({
                                  type: "success",
                                  text1: `'${capitalize(title)}' deleted successfully`,
                                  text1Style: toastStyle,
                                });
                              },
                            },
                          ]
                        );
                      }}
                    >
                    <Trash2 size={14} color="rgba(200,80,80,0.9)" />
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
                {task.done
                  ? <CircleCheck size={18} color="rgba(70,200,110,0.9)" />
                  : <Circle size={18} color="rgba(232,213,183,0.7)" />}
              </Pressable>
              <Text style={[styles.taskText, task.done ? styles.taskTextDone : null]} numberOfLines={2}>
                {task.text}
              </Text>
              <Pressable onPress={() => deleteTodoTask(task.id)} style={styles.taskDelete}>
                <Trash2 size={16} color="rgba(200,80,80,0.9)" />
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
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Plus size={14} color="#e8d5b7" />
                <Text style={styles.inlineButtonText}>Add</Text>
              </View>
            </Pressable>
          </View>
        </ModalShell>
      </SafeAreaView>
    </LinearGradient>
    <Toast />
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "transparent",
  },
  page: {
    paddingHorizontal: 16,
    paddingBottom: 44,
    paddingTop: 10,
  },
  modeRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  modeToggleWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  modeButton: {
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.45)",
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: "transparent",
  },
  modeButtonLeft: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
  },
  modeButtonRight: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  modeButtonActive: {
    backgroundColor: "rgba(245,166,35,0.2)",
    borderColor: "rgba(245,166,35,0.8)",
  },
  helpButton: {
    borderWidth: 1,
    borderColor: "rgba(70,200,110,0.55)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "transparent",
  },
  helpButtonFloating: {
    position: "absolute",
    top: 10,
    right: 16,
    zIndex: 20,
  },
  helpButtonText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    letterSpacing: 1.5,
    color: "rgba(70,200,110,0.9)",
  },
  modeButtonText: {
    color: "rgba(245,166,35,0.7)",
    fontWeight: "600",
    letterSpacing: 1.5,
    fontFamily: "DMMono_400Regular",
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
    color: "rgba(245,166,35,0.45)",
    textTransform: "uppercase",
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 6,
    fontFamily: "DMMono_400Regular",
  },
  dateInput: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    color: "#e8d5b7",
    fontSize: 20,
    textAlign: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontFamily: "DMMono_400Regular",
  },
  inputDisabled: {
    opacity: 0.6,
  },
  dateInputFilled: {
    fontFamily: "PlayfairDisplay_400Regular",
  },
  arrow: {
    color: "rgba(245,166,35,0.65)",
    fontSize: 20,
    marginHorizontal: 8,
    marginBottom: 12,
    fontFamily: "DMMono_400Regular",
  },
  iconButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
  },
  iconButtonMl: {
    marginLeft: 6,
  },
  iconButtonActive: {
    backgroundColor: "rgba(245,166,35,0.15)",
    borderColor: "rgba(245,166,35,0.7)",
  },
  daysModeRow: {
    marginBottom: 10,
  },
  daysInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.3)",
    backgroundColor: "rgba(255,255,255,0.03)",
    color: "#e8d5b7",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "DMMono_400Regular",
    fontSize: 20,
    textAlign: "center",
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
  summaryBarEmpty: {
    borderColor: "transparent",
    backgroundColor: "transparent",
  },
  summaryLabel: {
    color: "rgba(245,166,35,0.9)",
    fontSize: 12,
    marginBottom: 7,
    fontFamily: "DMMono_400Regular",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "rgba(245,166,35,0.16)",
    marginBottom: 7,
  },
  summaryBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  summaryValue: {
    color: "#e8d5b7",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "DMMono_400Regular",
  },
  summaryIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  summaryIconBtn: {
    padding: 6,
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
    fontFamily: "DMMono_400Regular",
  },
  emptyHint: {
    color: "rgba(232,213,183,0.56)",
    fontSize: 12,
    fontFamily: "DMMono_400Regular",
    textAlign: "center",
  },
  savedTitle: {
    color: "rgba(245,166,35,0.95)",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
    fontFamily: "DMMono_400Regular",
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  monthCardOuter: {
    width: "48%",
    minWidth: 165,
    marginBottom: 10,
  },
  monthCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.35)",
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.025)",
    padding: 10,
  },
  monthTitle: {
    color: "#e8d5b7",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 1.3,
    fontSize: 11,
    marginBottom: 8,
    fontFamily: "DMMono_400Regular",
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
    fontFamily: "DMMono_400Regular",
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
    fontFamily: "DMMono_400Regular",
  },
  legend: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(245,166,35,0.2)",
    paddingTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendDotGlow: {
    shadowColor: "rgba(70,200,110,0.8)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  legendSquare: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    color: "rgba(232,213,183,0.55)",
    fontSize: 11,
    fontFamily: "DMMono_400Regular",
  },
  reviewHint: {
    color: "rgba(70,200,110,0.85)",
    marginTop: 6,
    fontSize: 11,
    fontFamily: "DMMono_400Regular",
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
    fontFamily: "DMMono_400Regular",
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
    fontFamily: "DMMono_400Regular",
  },
  modalHint: {
    color: "rgba(232,213,183,0.7)",
    marginBottom: 8,
    fontSize: 12,
    fontFamily: "DMMono_400Regular",
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
    fontFamily: "DMMono_400Regular",
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
    fontFamily: "DMMono_400Regular",
  },
  savedRowSub: {
    color: "rgba(232,213,183,0.62)",
    fontSize: 11,
    fontFamily: "DMMono_400Regular",
  },
  savedAction: {
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.5)",
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginLeft: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  savedActionDanger: {
    borderColor: "rgba(200,80,80,0.55)",
  },
  savedActionText: {
    color: "#e8d5b7",
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "DMMono_400Regular",
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
  taskText: {
    flex: 1,
    color: "#e8d5b7",
    fontSize: 13,
    fontFamily: "DMMono_400Regular",
  },
  taskTextDone: {
    textDecorationLine: "line-through",
    color: "rgba(232,213,183,0.45)",
  },
  taskDelete: {
    width: 38,
    alignItems: "center",
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
  footerDivider: {
    height: 1,
    backgroundColor: "rgba(232,213,183,0.1)",
    marginHorizontal: "10%",
    marginVertical: 16,
  },
  footerWrap: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  footerBackstory: {
    fontSize: 12,
    color: "rgba(245,166,35,0.5)",
    lineHeight: 20,
    textAlign: "justify",
    fontFamily: "DMMono_400Regular",
    marginBottom: 16,
  },
  footerLabel: {
    color: "rgba(232,213,183,0.4)",
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
    marginBottom: 8,
  },
  footerSocialRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    marginBottom: 8,
  },
  footerSocialLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerSocialText: {
    color: "rgba(232,213,183,0.5)",
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
  },
  footerCopy: {
    color: "rgba(232,213,183,0.4)",
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
    marginTop: 8,
  },
  helpWebWrap: {
    height: 420,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#050509",
  },
  helpWebView: {
    flex: 1,
  },
  helpLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(13,8,5,0.95)",
    padding: 16,
  },
  helpLoadingText: {
    marginTop: 8,
    color: "rgba(245,166,35,0.8)",
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
    letterSpacing: 1.5,
  },
  helpErrorWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "rgba(13,8,5,0.98)",
  },
  helpErrorText: {
    color: "rgba(232,213,183,0.9)",
    fontFamily: "DMMono_400Regular",
    fontSize: 13,
    textAlign: "center",
  },
});
