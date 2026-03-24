import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, BookOpen, Calendar, PenLine, Check, Clock, Plus, X, Sparkles, Loader2, MessageSquare, Send, Mic, Square, Volume2, VolumeX, Camera, Settings, ImageIcon, Trash2, Target, Circle, CircleCheck, CheckCircle2, XCircle, MinusCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import toast from "react-hot-toast";
import { fetchHighlightsStream } from "../utils/groqHighlights.js";
import { fetchNoteRows, saveNoteText, saveHighlights as saveHighlightsToDb } from "../utils/notesStorage.js";
import { fetchChatCompletion } from "../utils/groqChat.js";
import { fetchAllPrompts, upsertPrompt, uploadNoteImage, deleteNoteImage, NOTE_IMG_BASE, createChatThread, fetchLatestChatThread, fetchChatThreadsList, fetchChatThreadById, upsertChatThreadMessages, deleteChatThreadById } from "../supabaseClient.js";
import { loadGoalsForDay, saveGoalsForDay, createGoalId, loadWeeklyGoals, saveWeeklyGoals } from "../utils/goalsStorage.js";
import { transcribeAudio } from "../utils/groqTranscribe.js";
import { speak, stopSpeaking, unlockAudio } from "../utils/groqTts.js";
const FONT_MONO = "'DM Mono', monospace";
const FONT_SERIF = "'Playfair Display', serif";

const DAY_NAMES  = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT  = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAILY_GOALS_AUTOCHECK_INSTRUCTION = [
  "You are verifying which daily goals were completed based only on the journal note.",
  "Return ONLY valid JSON (no markdown, no backticks).",
  "Schema:",
  "{",
  '  "results": [',
  '    { "id": string, "completed": boolean, "evidence": string|null }',
  "  ]",
  "}",
  "Rules:",
  "- Use each goal id exactly as provided.",
  "- completed=true only if the note explicitly indicates completion.",
  "- If unclear, ambiguous, or only planned, set completed=false.",
  "- Keep evidence concise; null when no evidence.",
].join("\n");
const DAILY_SPECIAL_INCIDENTS_INSTRUCTION = [
  "For special_incidents sentiment classification, learn this personal preference strictly.",
  "Expected schema for checks.special_incidents:",
  '[ { "text": string, "sentiment": "positive"|"negative"|"neutral" } ]',
  "",
  "These are POSITIVE/CONSTRUCTIVE examples:",
  "- Had a healthy lunch with dal bhaat, paneer, and potatoes, followed by cookies for brunch.",
  "- Bicycled for about 30 minutes in the Sankhamul area on my father's bike.",
  "- Took grandmother to a Japanese restaurant for lunch, which made her happy.",
  "- Went to a nursery and bought her favorite flower pots.",
  "",
  "Classification rules:",
  "- sentiment=positive for healthy routines, exercise, family care, meaningful outings, kindness, and uplifting activities.",
  "- sentiment=negative for injuries, accidents, failures/rejections, serious setbacks, conflicts.",
  "- sentiment=neutral only for notable observations with no clear positive or negative personal impact.",
  "- If unsure between positive and neutral, prefer positive when the action reflects self-care, family-care, or progress.",
].join("\n");
const WEEKLY_HIGHLIGHTS_INSTRUCTION = [
  "You are generating WEEKLY highlights from 7 daily journal notes.",
  "Return ONLY valid JSON (no markdown, no backticks).",
  "Focus on weekly aggregates, counts, and significant events.",
  "Schema:",
  "{",
  '  "literal_bullets": string[],',
  '  "checks": {',
  '    "cold_shower": { "done": boolean, "count": number, "evidence": string|null },',
  '    "morning_meditation": { "done": boolean, "count": number, "minutes_total": number|null, "evidence": string|null },',
  '    "gym": { "done": boolean, "count": number, "minutes_total": number|null, "body_parts": string[], "evidence": string|null },',
  '    "evening_meditation": { "done": boolean, "count": number, "minutes_total": number|null, "evidence": string|null },',
  '    "reading": { "done": boolean, "count": number, "minutes_total": number|null, "evidence": string|null },',
  '    "special_incidents": [',
  '      { "text": string, "sentiment": "positive"|"negative"|"neutral" }',
  '    ]',
  "  }",
  "}",
  "Rules:",
  "- For literal_bullets: summarize weekly trends e.g. 'Cold showers 7/7 days', 'Gym 4 times (chest, arms)', 'Meditation 30 min avg', 'Read 1 hr/day'.",
  "- For special_incidents: extract all notable events that stand out from the person's routine.",
  "",
  "Classification — learn from these real labeled examples:",
  "  positive: 'Received a personalized message from indie artist Janisht Joshi.'",
  "  positive: 'Secret concert of Nepali artist attended on Wednesday.'",
  "  positive: 'Visited cat cafe with mom on Saturday.'",
  "  positive: 'Had a healthy lunch with dal bhaat, paneer, and potatoes, followed by cookies for brunch.'",
  "  positive: 'Bicycled for about 30 minutes in the Sankhamul area on my father's bike.'",
  "  positive: 'Took grandmother to a Japanese restaurant for lunch, which made her happy.'",
  "  positive: 'Went to a nursery and bought her favorite flower pots.'",
  "  negative: 'Rainy storm and scooter slip accident with knee wound on Monday.'",
  "  negative: 'Visa not granted at German Embassy on Tuesday.'",
  "  neutral:  'Heavy storm hit on Sunday morning.'",
  "",
  "Classification rules (in priority order):",
  "  - sentiment=positive: meaningful personal experience, emotional joy, rare cultural event, social or family win,",
  "      achievement, human connection, recognition from someone admired, pleasant surprise.",
  "  - sentiment=negative: physical harm or injury, official rejection with life consequence (visa, job, exam),",
  "      financial loss, personal setback, health issue, accident, serious conflict or argument.",
  "  - sentiment=neutral: environmental or external event that the person merely observed with no direct personal",
  "      consequence to their body, goals, or emotions (e.g. a storm they saw but weren't hurt by, a news item).",
  "  - CRITICAL: the same type of event can be different sentiments depending on personal consequence.",
  "      Example: 'heavy storm' alone = neutral. 'storm caused a scooter accident' = negative.",
  "  - If unsure between positive and neutral, prefer positive if it involved a personal experience.",
  "  - If unsure between negative and neutral, prefer negative if there was harm or a concrete failure.",
].join("\n");

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - d.getDay()); // Sunday = 0
  return d;
}

function getWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function formatWeekLabel(weekStart) {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const s = weekStart, e = end;
  if (s.getMonth() === e.getMonth()) {
    return `${MONTH_NAMES[s.getMonth()]} ${s.getDate()} – ${e.getDate()}, ${s.getFullYear()}`;
  }
  return `${MONTH_NAMES[s.getMonth()]} ${s.getDate()} – ${MONTH_NAMES[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
}

function tryParseHighlightsJson(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const trimmed = String(raw).trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function getIncidentSentimentMeta(sentiment) {
  const key = typeof sentiment === "string" ? sentiment.toLowerCase() : "neutral";
  if (key === "positive") {
    return {
      label: "Constructive",
      bg: "rgba(34,130,80,0.22)",
      border: "rgba(50,200,110,0.45)",
      iconBg: "rgba(50,200,110,0.85)",
      textColor: "rgba(180,255,210,0.92)",
      subColor: "rgba(140,220,170,0.75)",
      Icon: CheckCircle2,
    };
  }
  if (key === "negative") {
    return {
      label: "Destructive",
      bg: "rgba(130,30,30,0.25)",
      border: "rgba(220,70,70,0.45)",
      iconBg: "rgba(210,60,60,0.85)",
      textColor: "rgba(255,190,190,0.95)",
      subColor: "rgba(220,150,150,0.75)",
      Icon: XCircle,
    };
  }
  return {
    label: "Neutral",
    bg: "rgba(40,80,160,0.2)",
    border: "rgba(80,130,220,0.4)",
    iconBg: "rgba(70,120,210,0.85)",
    textColor: "rgba(190,210,255,0.92)",
    subColor: "rgba(160,185,240,0.7)",
    Icon: MinusCircle,
  };
}

function useDebounce(fn, delay) {
  const timerRef = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

function DayCard({ date, isToday, isActive, onClick, initialNote, initialHighlights, onNoteChange }) {
  const key = toDateKey(date);
  const [text, setText] = useState(initialNote ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const [panel, setPanel] = useState("goals"); // 'note' | 'highlights' | 'goals'
  const [goals, setGoals] = useState([]);
  const [goalAdding, setGoalAdding] = useState(false);
  const [newGoalText, setNewGoalText] = useState("");
  const [goalsSyncLoading, setGoalsSyncLoading] = useState(false);
  const [goalsSyncErr, setGoalsSyncErr] = useState("");
  const [dailyIncidentsOpen, setDailyIncidentsOpen] = useState(false);
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  const [highlightsRaw, setHighlightsRaw] = useState("");
  const [highlightsData, setHighlightsData] = useState(initialHighlights ?? null);
  const [highlightsErr, setHighlightsErr] = useState("");
  const abortRef = useRef(null);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef(null);
  const hasNote = text.trim().length > 0;

  // ── Voice recording ──
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const options = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? { mimeType: "audio/webm;codecs=opus" }
        : MediaRecorder.isTypeSupported("audio/webm")
          ? { mimeType: "audio/webm" }
          : {};

      const mr = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        const mimeType = mr.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        setTranscribing(true);
        try {
          const transcribed = await transcribeAudio(blob);
          if (transcribed) {
            setText((prev) => {
              const joined = prev.trim() ? `${prev.trimEnd()}\n${transcribed}` : transcribed;
              debouncedSave(key, joined);
              return joined;
            });
            toast("Voice transcribed ✦", {
              style: {
                background: "#1a0e00",
                color: "#e8d5b7",
                border: "1px solid rgba(245,166,35,0.35)",
                fontFamily: "'DM Mono', monospace",
                fontSize: "12px",
                letterSpacing: "0.05em",
              },
            });
          }
        } catch (err) {
          if (err?.status === 429 || /429|rate limit/i.test(err?.message)) {
            toast.error("Rate limit exceeded — try again in a minute.");
          } else {
            toast.error("Transcription failed. Check your Groq key.");
          }
        } finally {
          setTranscribing(false);
        }
      };

      mr.start(250); // collect chunks every 250 ms
      setRecording(true);
    } catch (err) {
      toast.error("Microphone access denied.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRecording(false);
  }

  // Clean up on unmount / card collapse
  useEffect(() => {
    if (!isActive && recording) stopRecording();
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Note image upload ──────────────────────────────────────────
  const [imageUploading, setImageUploading] = useState(false);
  const noteImgInputRef = useRef(null);
  const [confirmDeleteImg, setConfirmDeleteImg] = useState(null); // filename | null
  const [lightboxIdx, setLightboxIdx] = useState(null); // null = closed, number = index into noteImages

  // Collect ordered list of image filenames present in the note text
  const noteImages = [...text.matchAll(/!\[\]\(([\w.\-]+)\)/g)].map(m => m[1]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIdx === null) return;
    function onKey(e) {
      if (e.key === "Escape") { setLightboxIdx(null); return; }
      if (e.key === "ArrowRight" || e.key === "ArrowDown")
        setLightboxIdx(idx => (idx + 1) % noteImages.length);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp")
        setLightboxIdx(idx => (idx - 1 + noteImages.length) % noteImages.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, noteImages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  async function uploadAndInsert(file) {
    if (!file || !file.type.startsWith("image/")) return;
    setImageUploading(true);
    try {
      const filename = await uploadNoteImage(file); // now returns just the filename
      const marker = `![](${filename})`;
      const ta = textareaRef.current;
      if (ta) {
        const start = ta.selectionStart ?? text.length;
        const end = ta.selectionEnd ?? text.length;
        const before = text.slice(0, start);
        const after = text.slice(end);
        const prefix = before.length > 0 && !before.endsWith("\n") ? " " : "";
        const suffix = after.length > 0 && !after.startsWith("\n") ? " " : "";
        const newText = `${before}${prefix}${marker}${suffix}${after}`;
        setText(newText);
        debouncedSave(key, newText);
        const newPos = start + prefix.length + marker.length + suffix.length;
        setTimeout(() => {
          ta.focus();
          ta.setSelectionRange(newPos, newPos);
        }, 0);
      } else {
        const newText = text ? `${text}\n${marker}` : marker;
        setText(newText);
        debouncedSave(key, newText);
      }
      toast("Image inserted ✦", {
        style: {
          background: "#1a0e00", color: "#e8d5b7",
          border: "1px solid rgba(245,166,35,0.35)",
          fontFamily: "'DM Mono', monospace", fontSize: "12px", letterSpacing: "0.05em",
        },
      });
    } catch {
      toast.error("Image upload failed. Check Supabase bucket.");
    } finally {
      setImageUploading(false);
    }
  }

  async function removeImage(filename) {
    // Remove all occurrences of ![](filename) (with optional surrounding spaces)
    const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const newText = text.replace(new RegExp(` ?!\\[\\]\\(${escaped}\\) ?`, "g"), " ").trimEnd();
    const cleaned = newText === text.trim() ? text : newText;
    setText(cleaned);
    debouncedSave(key, cleaned);
    try {
      await deleteNoteImage(filename);
    } catch {
      toast.error("Could not delete image from bucket.");
    }
  }

  function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        e.preventDefault();
        uploadAndInsert(item.getAsFile());
        return;
      }
    }
  }

  function handleDrop(e) {
    const files = e.dataTransfer?.files;
    if (!files?.length) return;
    for (const file of files) {
      if (file.type.startsWith("image/")) {
        e.preventDefault();
        uploadAndInsert(file);
        return;
      }
    }
  }

  // Sync when initial data changes (e.g. week navigation)
  useEffect(() => {
    setText(initialNote ?? "");
  }, [initialNote]);

  useEffect(() => {
    setHighlightsData(initialHighlights ?? null);
  }, [initialHighlights]);

  useEffect(() => {
    let cancelled = false;
    loadGoalsForDay(key).then((g) => {
      if (!cancelled) setGoals(g);
    }).catch(() => {});
    setGoalAdding(false);
    setNewGoalText("");
    setGoalsSyncLoading(false);
    setGoalsSyncErr("");
    setDailyIncidentsOpen(false);
    return () => { cancelled = true; };
  }, [key]);

  const debouncedSave = useDebounce(async (k, t) => {
    try {
      await saveNoteText(k, t);
      onNoteChange?.(k, t);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      console.error("Save note error:", e);
    }
  }, 800);

  // Exit edit mode when card collapses
  useEffect(() => {
    if (!isActive) {
      setIsEditing(false);
      setPanel("goals");
      setGoalsSyncLoading(false);
      setGoalsSyncErr("");
      setDailyIncidentsOpen(false);
      setHighlightsLoading(false);
      setHighlightsErr("");
      abortRef.current?.abort?.();
      abortRef.current = null;
    }
  }, [isActive]);

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
        const len = textareaRef.current?.value.length ?? 0;
        textareaRef.current?.setSelectionRange(len, len);
      }, 60);
    }
  }, [isEditing]);

  function handleChange(e) {
    const val = e.target.value;
    setText(val);
    debouncedSave(key, val);
  }

  function persistGoals(next) {
    setGoals(next);
    saveGoalsForDay(key, next).catch(() => {});
  }

  async function handleSaveNewGoal() {
    const text = newGoalText.trim();
    if (!text) return;
    const next = [...goals, { id: createGoalId(), text, done: false }];
    persistGoals(next);
    setNewGoalText("");
    setGoalAdding(false);
  }

  function handleToggleGoal(goalId) {
    const next = goals.map((g) => (g.id === goalId ? { ...g, done: !g.done } : g));
    persistGoals(next);
  }

  function handleDeleteGoal(goal) {
    if (!goal.done) {
      toast("Mark the goal done first", { style: { fontFamily: "'DM Mono', monospace" } });
      return;
    }
    persistGoals(goals.filter((g) => g.id !== goal.id));
    toast.success("Goal removed", { style: { fontFamily: "'DM Mono', monospace" } });
  }

  async function runGoalsAutoCheck() {
    setPanel("goals");
    setGoalsSyncErr("");
    if (!hasNote) {
      toast("Write a note first to auto-check goals.", { style: { fontFamily: "'DM Mono', monospace" } });
      return;
    }
    if (!Array.isArray(goals) || goals.length === 0) {
      toast("No goals to check for this day.", { style: { fontFamily: "'DM Mono', monospace" } });
      return;
    }

    setGoalsSyncLoading(true);
    try {
      const goalsList = goals.map((g) => ({ id: g.id, text: g.text }));
      const promptText = [
        "Daily note:",
        text,
        "",
        "Goals to verify:",
        ...goalsList.map((g) => `- [${g.id}] ${g.text}`),
      ].join("\n");

      const raw = await fetchHighlightsStream({
        text: promptText,
        instruction: DAILY_GOALS_AUTOCHECK_INSTRUCTION,
      });
      const parsed = tryParseHighlightsJson(raw);
      const results = Array.isArray(parsed?.results) ? parsed.results : [];

      const byId = new Map();
      const byText = new Map();
      for (const r of results) {
        if (typeof r?.id === "string") byId.set(r.id, !!r.completed);
        if (typeof r?.text === "string") byText.set(r.text.trim().toLowerCase(), !!r.completed);
      }

      let changed = 0;
      const next = goals.map((g) => {
        const idDecision = byId.get(g.id);
        const textDecision = byText.get((g.text || "").trim().toLowerCase());
        const completed = typeof idDecision === "boolean" ? idDecision : textDecision;
        if (completed === true && !g.done) {
          changed += 1;
          return { ...g, done: true };
        }
        return g;
      });

      setGoals(next);
      await saveGoalsForDay(key, next);

      if (changed > 0) {
        toast(`Auto-checked ${changed} goal${changed !== 1 ? "s" : ""} ✦`, {
          style: {
            background: "#1a0e00",
            color: "#e8d5b7",
            border: "1px solid rgba(245,166,35,0.35)",
            fontFamily: "'DM Mono', monospace",
            fontSize: "12px",
            letterSpacing: "0.05em",
          },
        });
      } else {
        toast("No completed goals were confidently found in the note.", {
          style: { fontFamily: "'DM Mono', monospace" },
        });
      }
    } catch {
      setGoalsSyncErr("Could not auto-check goals right now.");
      toast.error("Auto-check failed.");
    } finally {
      setGoalsSyncLoading(false);
    }
  }

  async function runHighlights(force = false) {
    if (!hasNote) return;
    if (!isActive) onClick();
    setIsEditing(false);
    setPanel("highlights");
    setHighlightsErr("");
    setHighlightsRaw("");

    // Use cached highlights unless force-refresh was requested
    if (highlightsData && !force) {
      return;
    }

    if (force && highlightsData) {
      setHighlightsData(null); // clear stale data so UI shows fresh loading state
      toast("Refreshing highlights…", {
        style: {
          background: "#1a0e00",
          color: "#e8d5b7",
          border: "1px solid rgba(245,166,35,0.25)",
          fontFamily: "'DM Mono', monospace",
          fontSize: "12px",
          letterSpacing: "0.05em",
        },
      });
    }

    abortRef.current?.abort?.();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setHighlightsLoading(true);
    try {
      let assembled = "";
      const full = await fetchHighlightsStream({
        text,
        instruction: DAILY_SPECIAL_INCIDENTS_INSTRUCTION,
        signal: ctrl.signal,
        onDelta: (delta) => {
          assembled += delta;
          setHighlightsRaw((prev) => prev + delta);
        },
      });

      // Try parse JSON; fallback to raw display
      let parsed = null;
      try {
        parsed = JSON.parse(full);
      } catch {
        const trimmed = (assembled || full || "").trim();
        const start = trimmed.indexOf("{");
        const end = trimmed.lastIndexOf("}");
        if (start !== -1 && end !== -1 && end > start) {
          parsed = JSON.parse(trimmed.slice(start, end + 1));
        }
      }

      if (parsed) {
        setHighlightsData(parsed);
        // Save to Supabase
        await saveHighlightsToDb(key, parsed);
        toast("Highlights ready", {
          style: {
            background: "#1a0e00",
            color: "#e8d5b7",
            border: "1px solid rgba(245,166,35,0.35)",
            fontFamily: "'DM Mono', monospace",
            fontSize: "12px",
            letterSpacing: "0.05em",
          },
        });
      } else {
        setHighlightsErr("Could not parse highlights. Showing raw output.");
      }
    } catch (e) {
      if (e?.name === "AbortError") return;
      setHighlightsErr("Failed to generate highlights. Is the Groq key set in .env?");
    } finally {
      setHighlightsLoading(false);
    }
  }

  const wordCount = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;

  const borderColor = isEditing
    ? "rgba(245,166,35,0.75)"
    : isActive
      ? "rgba(245,166,35,0.42)"
      : isToday
        ? "rgba(70,200,110,0.45)"
        : hasNote
          ? "rgba(245,166,35,0.22)"
          : "rgba(255,255,255,0.07)";

  const bgColor = isEditing
    ? "rgba(245,166,35,0.07)"
    : isActive
      ? "rgba(245,166,35,0.04)"
      : isToday
        ? "rgba(70,200,110,0.04)"
        : "rgba(255,255,255,0.025)";

  return (
    <div style={{
      borderRadius: 16,
      border: `1px solid ${borderColor}`,
      background: bgColor,
      transition: "border-color 0.2s ease, background 0.2s ease",
      overflow: "hidden",
    }}>

      {/* ── Header row (click = toggle expand) ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={e => e.key === "Enter" && onClick()}
        style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "16px 20px", cursor: "pointer",
        }}
      >
        {/* Date circle */}
        <div style={{
          width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: isToday ? "rgba(70,200,110,0.18)" : isActive ? "rgba(245,166,35,0.15)" : "rgba(255,255,255,0.04)",
          border: isToday ? "1.5px solid rgba(70,200,110,0.6)" : isActive ? "1.5px solid rgba(245,166,35,0.5)" : "1px solid rgba(255,255,255,0.08)",
        }}>
          <span style={{
            fontFamily: FONT_MONO, fontSize: 16, fontWeight: 700, lineHeight: 1,
            color: isToday ? "rgba(70,200,110,0.95)" : isActive ? "#f5a623" : "#e8d5b7",
          }}>
            {date.getDate()}
          </span>
          <span style={{
            fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: "0.1em", textTransform: "uppercase",
            color: isToday ? "rgba(70,200,110,0.7)" : "rgba(232,213,183,0.4)", marginTop: 1,
          }}>
            {MONTH_NAMES[date.getMonth()]}
          </span>
        </div>

        {/* Day label + preview */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{
              fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase",
              color: isToday ? "rgba(70,200,110,0.85)" : isActive ? "rgba(245,166,35,0.9)" : "rgba(232,213,183,0.55)",
            }}>
              {DAY_NAMES[date.getDay()]}
            </span>
            {isToday && (
              <span style={{
                fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: "0.12em", textTransform: "uppercase",
                color: "rgba(70,200,110,0.8)", background: "rgba(70,200,110,0.1)",
                border: "1px solid rgba(70,200,110,0.25)", borderRadius: 5, padding: "1px 7px",
              }}>
                Today
              </span>
            )}
            {isEditing && (
              <span style={{
                fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: "0.12em", textTransform: "uppercase",
                color: "rgba(245,166,35,0.7)", background: "rgba(245,166,35,0.1)",
                border: "1px solid rgba(245,166,35,0.25)", borderRadius: 5, padding: "1px 7px",
              }}>
                Editing
              </span>
            )}
          </div>
          {/* One-line preview when collapsed */}
          {!isActive && (
            <div style={{
              fontFamily: FONT_MONO, fontSize: 11.5,
              color: hasNote ? "rgba(232,213,183,0.5)" : "rgba(232,213,183,0.2)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {hasNote ? text.replace(/\n/g, " · ") : "Click to read or add a note…"}
            </div>
          )}
        </div>

        {/* Right: word count + pen icon */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}
          onClick={e => e.stopPropagation()}
        >
          {hasNote && !isActive && (
            <span style={{
              fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.1em",
              color: "rgba(245,166,35,0.5)", background: "rgba(245,166,35,0.07)",
              border: "1px solid rgba(245,166,35,0.18)", borderRadius: 5, padding: "2px 8px",
            }}>
              {wordCount}w
            </span>
          )}
          {/* PenLine: click to enter edit mode (stops header toggle) */}
          <button
            type="button"
            title="Edit note"
            onClick={e => {
              e.stopPropagation();
              if (!isActive) onClick(); // open card first if collapsed
              setIsEditing(true);
            }}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: 4,
              display: "flex", alignItems: "center", borderRadius: 6,
            }}
          >
            <PenLine
              size={14}
              color={isEditing ? "rgba(245,166,35,0.9)" : isActive ? "rgba(245,166,35,0.5)" : "rgba(232,213,183,0.2)"}
              style={{ transition: "color 0.2s" }}
            />
          </button>
        </div>
      </div>

      {/* ── Expanded body ── */}
      {isActive && (
        <div style={{ padding: "0 20px 20px" }}>
          <div style={{ height: 1, background: "rgba(245,166,35,0.1)", marginBottom: 16 }} />

          {isEditing ? (
            /* ── EDIT MODE ── */
            <>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleChange}
                placeholder={`What happened on ${DAY_NAMES[date.getDay()]}?\n\nWrite your thoughts, tasks, reflections…`}
                style={{
                  width: "100%",
                  minHeight: 200,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(245,166,35,0.22)",
                  borderRadius: 12,
                  padding: "14px 16px",
                  color: "#e8d5b7",
                  fontFamily: FONT_MONO,
                  fontSize: 13.5,
                  lineHeight: 1.75,
                  resize: "vertical",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => { e.target.style.borderColor = "rgba(245,166,35,0.55)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(245,166,35,0.22)"; }}
                onPaste={handlePaste}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
              />
              {/* Hidden image file input */}
              <input
                ref={noteImgInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) uploadAndInsert(file);
                }}
              />

              {/* ── Inserted image chip strip ── */}
              {(() => {
                const imgFilenames = [...text.matchAll(/!\[\]\(([\w.\-]+)\)/g)].map(m => m[1]);
                if (!imgFilenames.length) return null;
                return (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    {imgFilenames.map((fn, i) => (
                      <div key={`${fn}-${i}`} style={{
                        position: "relative", display: "inline-flex", flexShrink: 0,
                      }}>
                        <img
                          src={NOTE_IMG_BASE + fn}
                          alt={fn}
                          style={{
                            height: 56, width: 56, objectFit: "cover",
                            borderRadius: 8,
                            border: "1px solid rgba(245,166,35,0.25)",
                            display: "block",
                          }}
                        />
                        <button
                          type="button"
                          title={`Remove ${fn}`}
                          onClick={() => setConfirmDeleteImg(fn)}
                          style={{
                            position: "absolute", top: -6, right: -6,
                            width: 18, height: 18,
                            background: "rgba(200,40,40,0.88)",
                            border: "1.5px solid rgba(255,255,255,0.2)",
                            borderRadius: "50%",
                            cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            padding: 0, lineHeight: 1,
                            color: "#fff", fontSize: 10, fontWeight: 700,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* ── Voice recording bar ── */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8, marginTop: 10,
              }}>
                {/* Record / Stop button */}
                <button
                  type="button"
                  title={recording ? "Stop recording" : "Record voice note"}
                  onClick={recording ? stopRecording : startRecording}
                  disabled={transcribing}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: recording
                      ? "rgba(220,60,60,0.13)"
                      : "rgba(245,166,35,0.07)",
                    border: recording
                      ? "1px solid rgba(220,60,60,0.45)"
                      : "1px solid rgba(245,166,35,0.22)",
                    borderRadius: 999,
                    padding: "5px 14px 5px 10px",
                    cursor: transcribing ? "not-allowed" : "pointer",
                    opacity: transcribing ? 0.55 : 1,
                    fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: "0.09em",
                    color: recording ? "rgba(220,100,100,0.9)" : "rgba(245,166,35,0.75)",
                    transition: "all 0.18s",
                    flexShrink: 0,
                  }}
                >
                  {transcribing ? (
                    <>
                      <Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} />
                      Transcribing…
                    </>
                  ) : recording ? (
                    <>
                      <Square size={12} fill="rgba(220,100,100,0.85)" color="rgba(220,100,100,0.85)" style={{ animation: "mic-pulse 1s ease-in-out infinite" }} />
                      Stop
                    </>
                  ) : (
                    <>
                      <Mic size={13} />
                      Dictate
                    </>
                  )}
                </button>

                {/* Pulse ring when recording */}
                {recording && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.08em",
                    color: "rgba(220,100,100,0.7)",
                  }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: "rgba(220,60,60,0.85)",
                      animation: "mic-pulse 1s ease-in-out infinite",
                      display: "inline-block",
                    }} />
                    Listening…
                  </span>
                )}

                {/* Image upload button */}
                <button
                  type="button"
                  title="Insert image (or paste / drop)"
                  onClick={() => noteImgInputRef.current?.click()}
                  disabled={imageUploading}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 28, height: 28, flexShrink: 0,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(245,166,35,0.18)",
                    borderRadius: 8,
                    cursor: imageUploading ? "not-allowed" : "pointer",
                    opacity: imageUploading ? 0.5 : 1,
                    transition: "all 0.15s",
                  }}
                >
                  {imageUploading
                    ? <Loader2 size={13} color="rgba(245,166,35,0.7)" style={{ animation: "spin 0.8s linear infinite" }} />
                    : <ImageIcon size={13} color="rgba(245,166,35,0.6)" />}
                </button>

                <div style={{ flex: 1 }} />

                {/* Save status + Done */}
                {saved ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: FONT_MONO, fontSize: 10, color: "rgba(70,200,110,0.7)" }}>
                    <Check size={11} color="rgba(70,200,110,0.8)" /> Saved
                  </span>
                ) : text.trim() ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: FONT_MONO, fontSize: 10, color: "rgba(232,213,183,0.3)" }}>
                    <Clock size={11} color="rgba(232,213,183,0.3)" /> Saving…
                  </span>
                ) : null}

                <span style={{
                  fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: "0.1em",
                  color: "rgba(232,213,183,0.25)",
                }}>
                  {wordCount}w
                </span>

                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8, padding: "5px 12px", cursor: "pointer",
                    fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: "0.08em",
                    color: "rgba(232,213,183,0.6)", display: "flex", alignItems: "center", gap: 5,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(245,166,35,0.45)"; e.currentTarget.style.color = "#e8d5b7"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(232,213,183,0.6)"; }}
                >
                  <X size={11} /> Done
                </button>
              </div>
            </>
          ) : (
            /* ── VIEW MODE ── */
            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(245,166,35,0.12)",
              borderRadius: 12,
              padding: "16px 18px",
            }}>
              {/* Panel switch: Goals | Note | Highlights (every day) */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  title="Daily goals (double-click to auto-check from note)"
                  onClick={() => setPanel("goals")}
                  onDoubleClick={(e) => { e.stopPropagation(); runGoalsAutoCheck(); }}
                  style={{
                    background: panel === "goals" ? "rgba(200,40,40,0.18)" : "rgba(255,255,255,0.03)",
                    border: panel === "goals" ? "1px solid rgba(220,70,70,0.65)" : "1px solid rgba(200,60,60,0.55)",
                    borderRadius: 999,
                    padding: "4px 10px",
                    cursor: "pointer",
                    color: panel === "goals" ? "rgba(255,140,140,0.95)" : "rgba(240,100,100,0.88)",
                    fontFamily: FONT_MONO,
                    fontSize: 9.5,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Target size={12} />
                  Goals
                </button>
                <button
                  type="button"
                  onClick={() => setPanel("note")}
                  style={{
                    background: panel === "note" ? "rgba(245,166,35,0.14)" : "rgba(255,255,255,0.03)",
                    border: panel === "note" ? "1px solid rgba(245,166,35,0.38)" : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 999,
                    padding: "4px 10px",
                    cursor: "pointer",
                    color: panel === "note" ? "rgba(245,166,35,0.9)" : "rgba(232,213,183,0.35)",
                    fontFamily: FONT_MONO,
                    fontSize: 9.5,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                  }}
                >
                  Note
                </button>
                <button
                  type="button"
                  title={highlightsData ? "Double-click to refresh highlights" : "Generate highlights"}
                  onClick={() => runHighlights()}
                  onDoubleClick={(e) => { e.stopPropagation(); runHighlights(true); }}
                  style={{
                    background: panel === "highlights" ? "rgba(245,166,35,0.14)" : "rgba(255,255,255,0.03)",
                    border: panel === "highlights" ? "1px solid rgba(245,166,35,0.38)" : "1px solid rgba(70,200,110,0.45)",
                    borderRadius: 999,
                    padding: "4px 10px",
                    cursor: "pointer",
                    color: panel === "highlights" ? "rgba(245,166,35,0.9)" : "rgba(70,200,110,0.65)",
                    fontFamily: FONT_MONO,
                    fontSize: 9.5,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Sparkles size={12} />
                  Highlights
                </button>
                {highlightsLoading && panel === "highlights" && (
                  <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <Loader2 size={14} color="rgba(245,166,35,0.65)" style={{ animation: "spin 0.8s linear infinite" }} />
                    <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.1em", color: "rgba(245,166,35,0.55)" }}>
                      Summarizing…
                    </span>
                  </span>
                )}
                {goalsSyncLoading && panel === "goals" && (
                  <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <Loader2 size={14} color="rgba(220,70,70,0.75)" style={{ animation: "spin 0.8s linear infinite" }} />
                    <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.1em", color: "rgba(240,100,100,0.78)" }}>
                      Checking goals…
                    </span>
                  </span>
                )}
              </div>

              {panel === "highlights" && hasNote && (
                <>
                  {highlightsErr && (
                    <div style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: "rgba(220,80,80,0.85)", marginBottom: 10 }}>
                      {highlightsErr}
                    </div>
                  )}

                  {highlightsData ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {/* Checks */}
                      <div style={{
                        border: "1px solid rgba(245,166,35,0.1)",
                        background: "rgba(245,166,35,0.04)",
                        borderRadius: 12,
                        padding: "12px 14px",
                      }}>
                        <div style={{
                          fontFamily: FONT_MONO,
                          fontSize: 9.5,
                          letterSpacing: "0.22em",
                          textTransform: "uppercase",
                          color: "rgba(245,166,35,0.5)",
                          marginBottom: 10,
                        }}>
                          Checks
                        </div>
                        {(() => {
                          const c = highlightsData?.checks || {};
                          const items = [
                            { key: "cold_shower", label: "Cold shower", showMinutes: false },
                            { key: "morning_meditation", label: "Morning meditation", showMinutes: true },
                            { key: "gym", label: "Gym", showMinutes: true },
                            { key: "evening_meditation", label: "Evening meditation", showMinutes: true },
                          ];
                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {items.map((it) => {
                                const val = c[it.key] || {};
                                const done = !!val.done;
                                const minutes = typeof val.minutes === "number" ? val.minutes : null;
                                const bodyParts = Array.isArray(val.body_parts) ? val.body_parts.filter(Boolean) : [];
                                return (
                                  <div key={it.key} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                                    <span style={{
                                      width: 9, height: 9, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                                      background: done ? "rgba(70,200,110,0.8)" : "rgba(255,255,255,0.14)",
                                      boxShadow: done ? "0 0 10px rgba(70,200,110,0.35)" : "none",
                                      border: done ? "1px solid rgba(70,200,110,0.55)" : "1px solid rgba(255,255,255,0.16)",
                                    }} />
                                    <div style={{ flex: 1 }}>
                                      <div style={{
                                        display: "flex", flexWrap: "wrap", gap: 8, alignItems: "baseline",
                                        fontFamily: FONT_MONO, fontSize: 12.5, lineHeight: 1.5,
                                        color: done ? "rgba(232,213,183,0.85)" : "rgba(232,213,183,0.45)",
                                      }}>
                                        <span style={{ fontWeight: 700, color: done ? "rgba(70,200,110,0.9)" : "rgba(232,213,183,0.65)" }}>
                                          {done ? "Done" : "Not done"}
                                        </span>
                                        <span style={{ color: "rgba(232,213,183,0.75)" }}>{it.label}</span>
                                        {it.showMinutes && minutes != null && (
                                          <span style={{
                                            fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
                                            color: "rgba(245,166,35,0.55)",
                                            background: "rgba(245,166,35,0.06)",
                                            border: "1px solid rgba(245,166,35,0.16)",
                                            borderRadius: 7, padding: "1px 8px",
                                          }}>
                                            {minutes} min
                                          </span>
                                        )}
                                        {it.key === "gym" && bodyParts.length > 0 && (
                                          <span style={{
                                            fontSize: 10, letterSpacing: "0.08em",
                                            color: "rgba(80,160,220,0.85)",
                                            background: "rgba(80,160,220,0.08)",
                                            border: "1px solid rgba(80,160,220,0.18)",
                                            borderRadius: 7, padding: "1px 8px",
                                          }}>
                                            {bodyParts.join(", ")}
                                          </span>
                                        )}
                                      </div>
                                      {val.evidence && (
                                        <div style={{
                                          marginTop: 3,
                                          fontFamily: FONT_MONO, fontSize: 11.5, lineHeight: 1.65,
                                          color: "rgba(232,213,183,0.35)",
                                        }}>
                                          “{val.evidence}”
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Special incidents */}
                      {(() => {
                        const rawIncidents = highlightsData?.checks?.special_incidents;
                        if (!Array.isArray(rawIncidents) || rawIncidents.length === 0) return null;
                        const incidents = rawIncidents.map((item) =>
                          typeof item === "string" ? { text: item, sentiment: "neutral" } : item
                        );
                        return (
                          <div style={{
                            border: "1px solid rgba(255,255,255,0.08)",
                            background: "rgba(255,255,255,0.02)",
                            borderRadius: 12,
                            padding: "12px 14px",
                          }}>
                            <button
                              type="button"
                              onClick={() => setDailyIncidentsOpen((v) => !v)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 7,
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                borderRadius: 8,
                                padding: "6px 12px",
                                cursor: "pointer",
                                fontFamily: FONT_MONO,
                                fontSize: 9.5,
                                letterSpacing: "0.14em",
                                textTransform: "uppercase",
                                color: "rgba(232,213,183,0.7)",
                              }}
                            >
                              <AlertCircle size={12} />
                              Special Incidents ({incidents.length})
                              {dailyIncidentsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>

                            {dailyIncidentsOpen && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                                {incidents.slice(0, 10).map((inc, idx) => {
                                  const cfg = getIncidentSentimentMeta(inc.sentiment);
                                  const { Icon } = cfg;
                                  return (
                                    <div
                                      key={idx}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 14,
                                        background: cfg.bg,
                                        border: `1px solid ${cfg.border}`,
                                        borderRadius: 14,
                                        padding: "12px 14px",
                                      }}
                                    >
                                      <div style={{
                                        flexShrink: 0,
                                        width: 38,
                                        height: 38,
                                        borderRadius: "50%",
                                        background: cfg.iconBg,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        boxShadow: `0 2px 12px ${cfg.border}`,
                                      }}>
                                        <Icon size={20} color="#fff" strokeWidth={2.2} />
                                      </div>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                          fontFamily: FONT_MONO,
                                          fontSize: 8.5,
                                          letterSpacing: "0.18em",
                                          textTransform: "uppercase",
                                          color: cfg.subColor,
                                          marginBottom: 3,
                                        }}>
                                          {cfg.label}
                                        </div>
                                        <div style={{
                                          fontFamily: FONT_MONO,
                                          fontSize: 12.5,
                                          color: cfg.textColor,
                                          lineHeight: 1.5,
                                        }}>
                                          {inc.text}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Literal bullets */}
                      {Array.isArray(highlightsData?.literal_bullets) && highlightsData.literal_bullets.length > 0 && (
                        <div style={{
                          border: "1px solid rgba(255,255,255,0.08)",
                          background: "rgba(255,255,255,0.02)",
                          borderRadius: 12,
                          padding: "12px 14px",
                        }}>
                          <div style={{
                            fontFamily: FONT_MONO,
                            fontSize: 9.5,
                            letterSpacing: "0.22em",
                            textTransform: "uppercase",
                            color: "rgba(245,166,35,0.5)",
                            marginBottom: 10,
                          }}>
                            Highlights
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 18, color: "rgba(232,213,183,0.72)", lineHeight: 1.7 }}>
                            {highlightsData.literal_bullets.slice(0, 10).map((b, idx) => (
                              <li key={idx} style={{ fontFamily: FONT_MONO, fontSize: 12.5 }}>{b}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{
                      fontFamily: FONT_MONO,
                      fontSize: 12.5,
                      lineHeight: 1.8,
                      color: "rgba(232,213,183,0.55)",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}>
                      {highlightsLoading ? highlightsRaw || "Summarizing…" : (highlightsRaw || "Click Highlights to generate.")}
                    </div>
                  )}
                </>
              )}
              {panel === "highlights" && !hasNote && (
                <div style={{
                  fontFamily: FONT_MONO,
                  fontSize: 12.5,
                  lineHeight: 1.8,
                  color: "rgba(232,213,183,0.45)",
                }}>
                  Write something in your note first to use AI Highlights.
                </div>
              )}
              {panel === "goals" && (
                <div>
                  {goalsSyncErr && (
                    <div style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: "rgba(220,80,80,0.9)", marginBottom: 10 }}>
                      {goalsSyncErr}
                    </div>
                  )}
                  <div style={{
                    fontFamily: FONT_MONO,
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "rgba(245,166,35,0.75)",
                    marginBottom: 10,
                  }}>
                    Goals · {DAY_NAMES[date.getDay()]} {date.getDate()} {MONTH_NAMES[date.getMonth()]}
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT_MONO, fontSize: 12 }}>
                    <tbody>
                      {goals.map((g) => (
                        <tr key={g.id}>
                          <td style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.08)", width: 36, verticalAlign: "middle" }}>
                            <button
                              type="button"
                              onClick={() => handleToggleGoal(g.id)}
                              title={g.done ? "Mark undone" : "Mark done"}
                              style={{
                                background: "transparent",
                                border: "none",
                                padding: 4,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                color: "rgba(232,213,183,0.7)",
                              }}
                              aria-label={g.done ? "Mark undone" : "Mark done"}
                            >
                              {g.done ? <CircleCheck size={18} color="rgba(70,200,110,0.9)" /> : <Circle size={18} />}
                            </button>
                          </td>
                          <td style={{
                            padding: "8px 10px",
                            borderBottom: "1px solid rgba(255,255,255,0.08)",
                            verticalAlign: "middle",
                            textDecoration: g.done ? "line-through" : "none",
                            color: g.done ? "rgba(232,213,183,0.45)" : "rgba(232,213,183,0.9)",
                          }}>
                            {g.text}
                          </td>
                          <td style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.08)", width: 36, textAlign: "right", verticalAlign: "middle" }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteGoal(g)}
                              title={g.done ? "Remove goal" : "Finish the goal first to remove"}
                              style={{
                                background: "transparent",
                                border: "none",
                                padding: 4,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                color: g.done ? "rgba(200,80,80,0.9)" : "rgba(232,213,183,0.35)",
                              }}
                              aria-label="Remove goal"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.08)", width: 36, verticalAlign: "middle" }}>
                          <button
                            type="button"
                            onClick={() => setGoalAdding(true)}
                            title="Add goal"
                            style={{
                              background: "transparent",
                              border: "none",
                              padding: 4,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              color: "rgba(232,213,183,0.7)",
                            }}
                            aria-label="Add goal"
                          >
                            <Plus size={18} />
                          </button>
                        </td>
                        <td style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.08)", verticalAlign: "middle" }} colSpan={2}>
                          {goalAdding ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <input
                                type="text"
                                value={newGoalText}
                                onChange={(e) => setNewGoalText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveNewGoal();
                                  if (e.key === "Escape") { setGoalAdding(false); setNewGoalText(""); }
                                }}
                                placeholder="New goal…"
                                autoFocus
                                style={{
                                  flex: 1,
                                  minWidth: 120,
                                  background: "rgba(255,255,255,0.06)",
                                  border: "1px solid rgba(245,166,35,0.3)",
                                  borderRadius: 8,
                                  padding: "6px 10px",
                                  color: "#e8d5b7",
                                  fontFamily: FONT_MONO,
                                  fontSize: 12,
                                  outline: "none",
                                }}
                              />
                              <button
                                type="button"
                                onClick={handleSaveNewGoal}
                                title="Save"
                                style={{ background: "transparent", border: "none", padding: 4, cursor: "pointer", color: "rgba(70,200,110,0.9)", display: "inline-flex", alignItems: "center" }}
                                aria-label="Save goal"
                              >
                                <Check size={18} />
                              </button>
                              <button
                                type="button"
                                onClick={() => { setGoalAdding(false); setNewGoalText(""); }}
                                title="Cancel"
                                style={{ background: "transparent", border: "none", padding: 4, cursor: "pointer", color: "rgba(200,80,80,0.9)", display: "inline-flex", alignItems: "center" }}
                                aria-label="Cancel"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              {panel === "note" && hasNote && (
                <div style={{
                  fontFamily: FONT_MONO,
                  fontSize: 13.5,
                  lineHeight: 1.8,
                  color: "#e8d5b7",
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}>
                  {text.split(/(!\[\]\([\w.\-]+\))/g).map((part, i) => {
                    const m = part.match(/^!\[\]\(([\w.\-]+)\)$/);
                    if (m) {
                      const fn = m[1];
                      const src = NOTE_IMG_BASE + fn;
                      const imgIdx = noteImages.indexOf(fn);
                      return (
                        <img
                          key={i}
                          src={src}
                          alt={fn}
                          style={{
                            maxHeight: 160,
                            maxWidth: "100%",
                            borderRadius: 8,
                            verticalAlign: "middle",
                            margin: "3px 5px",
                            display: "inline-block",
                            border: "1px solid rgba(245,166,35,0.18)",
                            cursor: "zoom-in",
                          }}
                          onClick={() => setLightboxIdx(imgIdx >= 0 ? imgIdx : 0)}
                          title="Click to view"
                        />
                      );
                    }
                    return <span key={i}>{part}</span>;
                  })}
                </div>
              )}
              {panel === "note" && !hasNote && (
                <p style={{
                  fontFamily: FONT_MONO, fontSize: 12.5, lineHeight: 1.7,
                  color: "rgba(232,213,183,0.22)", margin: 0,
                  fontStyle: "italic",
                }}>
                  Nothing written yet.{" "}
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    style={{
                      background: "none", border: "none", cursor: "pointer", padding: 0,
                      fontFamily: FONT_MONO, fontSize: 12.5, fontStyle: "italic",
                      color: "rgba(245,166,35,0.55)", textDecoration: "underline",
                    }}
                  >
                    Click here to write.
                  </button>
                </p>
              )}
              {hasNote && panel === "note" && (
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  marginTop: 14, paddingTop: 10,
                  borderTop: "1px solid rgba(245,166,35,0.08)",
                }}>
                  <span style={{
                    fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.1em",
                    color: "rgba(232,213,183,0.25)",
                  }}>
                    {wordCount} word{wordCount !== 1 ? "s" : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    style={{
                      background: "rgba(245,166,35,0.08)",
                      border: "1px solid rgba(245,166,35,0.28)",
                      borderRadius: 8, padding: "5px 13px", cursor: "pointer",
                      fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: "0.08em",
                      color: "rgba(245,166,35,0.75)", display: "flex", alignItems: "center", gap: 6,
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(245,166,35,0.14)"; e.currentTarget.style.color = "#f5a623"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(245,166,35,0.08)"; e.currentTarget.style.color = "rgba(245,166,35,0.75)"; }}
                  >
                    <PenLine size={11} /> Edit
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Image lightbox ── */}
      {lightboxIdx !== null && noteImages.length > 0 && (
        <div
          onClick={() => setLightboxIdx(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 10000,
            background: "rgba(0,0,0,0.88)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {/* Prev arrow */}
          {noteImages.length > 1 && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setLightboxIdx((lightboxIdx - 1 + noteImages.length) % noteImages.length); }}
              style={{
                position: "fixed", left: 18, top: "50%", transform: "translateY(-50%)",
                zIndex: 10001,
                background: "rgba(245,166,35,0.12)",
                border: "1px solid rgba(245,166,35,0.3)",
                borderRadius: "50%",
                width: 44, height: 44,
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#e8d5b7", fontSize: 20,
              }}
            >
              ‹
            </button>
          )}

          {/* Image */}
          <img
            src={NOTE_IMG_BASE + noteImages[lightboxIdx]}
            alt={noteImages[lightboxIdx]}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: "90vw",
              maxHeight: "85vh",
              borderRadius: 12,
              boxShadow: "0 12px 60px rgba(0,0,0,0.7)",
              border: "1px solid rgba(245,166,35,0.2)",
              display: "block",
              objectFit: "contain",
            }}
          />

          {/* Next arrow */}
          {noteImages.length > 1 && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setLightboxIdx((lightboxIdx + 1) % noteImages.length); }}
              style={{
                position: "fixed", right: 18, top: "50%", transform: "translateY(-50%)",
                zIndex: 10001,
                background: "rgba(245,166,35,0.12)",
                border: "1px solid rgba(245,166,35,0.3)",
                borderRadius: "50%",
                width: 44, height: 44,
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#e8d5b7", fontSize: 20,
              }}
            >
              ›
            </button>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={() => setLightboxIdx(null)}
            style={{
              position: "fixed", top: 16, right: 16,
              zIndex: 10001,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "50%",
              width: 36, height: 36,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "rgba(232,213,183,0.7)", fontSize: 16,
            }}
          >
            ✕
          </button>

          {/* Counter */}
          {noteImages.length > 1 && (
            <div style={{
              position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
              fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.12em",
              color: "rgba(232,213,183,0.45)",
            }}>
              {lightboxIdx + 1} / {noteImages.length}
            </div>
          )}
        </div>
      )}

      {/* ── Image delete confirmation dialog ── */}
      {confirmDeleteImg && (
        <div
          onClick={() => setConfirmDeleteImg(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#120d00",
              border: "1px solid rgba(200,40,40,0.45)",
              borderRadius: 16,
              padding: "24px 28px",
              maxWidth: 340,
              width: "90%",
              boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            <p style={{ margin: "0 0 6px", fontSize: 13.5, color: "#e8d5b7", lineHeight: 1.5 }}>
              Delete this image?
            </p>
            <p style={{ margin: "0 0 20px", fontSize: 10.5, color: "rgba(232,213,183,0.4)", wordBreak: "break-all" }}>
              {confirmDeleteImg}
            </p>
            <p style={{ margin: "0 0 20px", fontSize: 11.5, color: "rgba(232,213,183,0.55)", lineHeight: 1.6 }}>
              This will remove it from the note <em>and</em> permanently delete it from storage.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setConfirmDeleteImg(null)}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 9, padding: "7px 18px",
                  cursor: "pointer", fontFamily: "'DM Mono', monospace",
                  fontSize: 11, letterSpacing: "0.08em",
                  color: "rgba(232,213,183,0.55)",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { removeImage(confirmDeleteImg); setConfirmDeleteImg(null); }}
                style={{
                  background: "rgba(200,40,40,0.15)",
                  border: "1px solid rgba(200,40,40,0.5)",
                  borderRadius: 9, padding: "7px 18px",
                  cursor: "pointer", fontFamily: "'DM Mono', monospace",
                  fontSize: 11, letterSpacing: "0.08em",
                  color: "rgba(240,100,100,0.9)",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WeeklyNotes() {
  const navigate = useNavigate();
  const today = new Date();
  today.setHours(0,0,0,0);

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [activeKey, setActiveKey] = useState(() => toDateKey(today));
  const [notesData, setNotesData] = useState({}); // { dateKey: { note_text, highlights } }
  const [loading, setLoading] = useState(true);

  const days = getWeekDays(weekStart);
  const todayKey = toDateKey(today);
  const isCurrentWeek = toDateKey(weekStart) === toDateKey(startOfWeek(today));
  const weekEndKey = toDateKey(new Date(weekStart.getTime() + 6 * 86400000));
  const weekKey = toDateKey(weekStart); // used as key for weekly goals (prefix added in storage)

  // ── Weekly goals ───────────────────────────────────────────────
  const [weeklyGoalsOpen, setWeeklyGoalsOpen] = useState(false);
  const [weeklyHighlightsOpen, setWeeklyHighlightsOpen] = useState(false);
  const [weeklyGoals, setWeeklyGoals] = useState([]);
  const [weeklyGoalAdding, setWeeklyGoalAdding] = useState(false);
  const [newWeeklyGoalText, setNewWeeklyGoalText] = useState("");
  const [weeklyHighlightsLoading, setWeeklyHighlightsLoading] = useState(false);
  const [weeklyHighlightsRaw, setWeeklyHighlightsRaw] = useState("");
  const [weeklyHighlightsData, setWeeklyHighlightsData] = useState(null);
  const [weeklyHighlightsErr, setWeeklyHighlightsErr] = useState("");
  const [weeklyIncompleteMsg, setWeeklyIncompleteMsg] = useState("");
  const [weeklyIncidentsOpen, setWeeklyIncidentsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadWeeklyGoals(weekKey).then((g) => {
      if (!cancelled) setWeeklyGoals(g);
    }).catch(() => {});
    setWeeklyGoalAdding(false);
    setNewWeeklyGoalText("");
    return () => { cancelled = true; };
  }, [weekKey]);

  useEffect(() => {
    setWeeklyHighlightsRaw("");
    setWeeklyHighlightsData(null);
    setWeeklyHighlightsErr("");
    setWeeklyIncompleteMsg("");
    setWeeklyHighlightsLoading(false);
  }, [weekKey]);

  function persistWeeklyGoals(updated) {
    setWeeklyGoals(updated);
    saveWeeklyGoals(weekKey, updated).catch(() => {});
  }

  function handleAddWeeklyGoal() {
    const trimmed = newWeeklyGoalText.trim();
    if (!trimmed) return;
    const updated = [...weeklyGoals, { id: createGoalId(), text: trimmed, done: false }];
    persistWeeklyGoals(updated);
    setNewWeeklyGoalText("");
    setWeeklyGoalAdding(false);
  }

  function handleToggleWeeklyGoal(id) {
    persistWeeklyGoals(weeklyGoals.map((g) => g.id === id ? { ...g, done: !g.done } : g));
  }

  function handleDeleteWeeklyGoal(goal) {
    if (!goal.done) {
      toast("Mark the goal as done first to remove it.", {
        style: { background: "#1a0e00", color: "#e8d5b7", border: "1px solid rgba(245,166,35,0.35)", fontFamily: "'DM Mono', monospace", fontSize: "12px" },
      });
      return;
    }
    persistWeeklyGoals(weeklyGoals.filter((g) => g.id !== goal.id));
  }

  async function handleImportWeeklyGoals() {
    if (weeklyGoals.length === 0) {
      toast("No weekly goals to import.", {
        style: { background: "#1a0e00", color: "#e8d5b7", border: "1px solid rgba(245,166,35,0.35)", fontFamily: "'DM Mono', monospace", fontSize: "12px" },
      });
      return;
    }
    try {
      await Promise.all(days.map(async (day) => {
        const dk = toDateKey(day);
        const existing = await loadGoalsForDay(dk);
        const existingTexts = new Set(existing.map((g) => g.text.trim().toLowerCase()));
        const toAdd = weeklyGoals
          .filter((g) => !existingTexts.has(g.text.trim().toLowerCase()))
          .map((g) => ({ id: createGoalId(), text: g.text, done: false }));
        if (toAdd.length > 0) {
          await saveGoalsForDay(dk, [...existing, ...toAdd]);
        }
      }));
      toast(`Imported ${weeklyGoals.length} goal${weeklyGoals.length !== 1 ? "s" : ""} to all 7 days ✦`, {
        style: { background: "#1a0e00", color: "#e8d5b7", border: "1px solid rgba(245,166,35,0.35)", fontFamily: "'DM Mono', monospace", fontSize: "12px", letterSpacing: "0.05em" },
      });
      setTimeout(() => {
        window.location.assign("/note");
      }, 120);
    } catch {
      toast.error("Import failed — check connection.");
    }
  }

  async function runWeeklyHighlights(force = false) {
    setWeeklyHighlightsOpen(true);
    setWeeklyHighlightsErr("");
    setWeeklyIncompleteMsg("");
    setWeeklyHighlightsRaw("");

    const dayKeys = days.map((d) => toDateKey(d));
    const weekRowKey = `week:${weekKey}`;

    try {
      const rowsMap = await fetchNoteRows([...dayKeys, weekRowKey]);
      const complete = dayKeys.every((k) => ((rowsMap[k]?.note_text || "").trim().length > 0));
      if (!complete) {
        setWeeklyHighlightsData(null);
        setWeeklyIncompleteMsg("Week has not been completed yet. Add notes for all 7 days first.");
        return;
      }

      const cachedWeekly = rowsMap[weekRowKey]?.highlights || null;
      if (cachedWeekly && !force) {
        setWeeklyHighlightsData(cachedWeekly);
        return;
      }

      if (force && cachedWeekly) {
        toast("Refreshing weekly highlights…", {
          style: {
            background: "#1a0e00",
            color: "#e8d5b7",
            border: "1px solid rgba(245,166,35,0.25)",
            fontFamily: "'DM Mono', monospace",
            fontSize: "12px",
            letterSpacing: "0.05em",
          },
        });
      }

      const weeklyText = days.map((d) => {
        const dk = toDateKey(d);
        const dayName = DAY_NAMES[d.getDay()];
        const note = (rowsMap[dk]?.note_text || "").trim();
        return `${dayName} (${dk}):\n${note}`;
      }).join("\n\n");

      setWeeklyHighlightsLoading(true);
      let assembled = "";
      const full = await fetchHighlightsStream({
        text: weeklyText,
        instruction: WEEKLY_HIGHLIGHTS_INSTRUCTION,
        onDelta: (delta) => {
          assembled += delta;
          setWeeklyHighlightsRaw((prev) => prev + delta);
        },
      });

      const parsed = tryParseHighlightsJson(full || assembled);
      if (!parsed) {
        setWeeklyHighlightsErr("Could not parse weekly highlights. Showing raw output.");
        return;
      }

      const tagged = {
        ...parsed,
        tag: `Week${weekNumber}`,
        week_start_key: weekKey,
        week_end_key: weekEndKey,
      };

      setWeeklyHighlightsData(tagged);
      await saveHighlightsToDb(weekRowKey, tagged);
      toast("Weekly highlights ready ✦", {
        style: {
          background: "#1a0e00",
          color: "#e8d5b7",
          border: "1px solid rgba(245,166,35,0.35)",
          fontFamily: "'DM Mono', monospace",
          fontSize: "12px",
          letterSpacing: "0.05em",
        },
      });
    } catch {
      setWeeklyHighlightsErr("Failed to generate weekly highlights. Check Groq key/env.");
    } finally {
      setWeeklyHighlightsLoading(false);
    }
  }

  // ── Chat UI state ─────────────────────────────────────────────
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]); // { role: "user" | "assistant", content: string }
  const [chatBusy, setChatBusy] = useState(false);
  const [chatSaving, setChatSaving] = useState(false);
  const [chatInitLoading, setChatInitLoading] = useState(false);

  // Chat memory (Supabase)
  const [activeChatId, setActiveChatId] = useState(null);
  const [activeChatTitle, setActiveChatTitle] = useState(null);
  const [chatHistoryOpen, setChatHistoryOpen] = useState(false);
  const [historyThreads, setHistoryThreads] = useState([]); // [{ id, title, created_at, updated_at }]
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historySearching, setHistorySearching] = useState(false);
  const [chatDeleteConfirm, setChatDeleteConfirm] = useState(null); // { id, title } | null
  const [chatDeleting, setChatDeleting] = useState(false);
  const [chatImages, setChatImages] = useState([]); // [{ name, dataUrl }]
  const [chatImageReading, setChatImageReading] = useState(false);
  const [chatAnalyzingImages, setChatAnalyzingImages] = useState(false);
  const fileInputRef = useRef(null);

  // ── Prompt manager ─────────────────────────────────────────────
  const [promptMgrOpen, setPromptMgrOpen] = useState(false);
  const [promptRows, setPromptRows] = useState([]); // raw rows from Supabase
  const [promptDrafts, setPromptDrafts] = useState({}); // key -> edited text
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [promptsSaving, setPromptsSaving] = useState({}); // key -> bool

  async function openPromptMgr() {
    setPromptMgrOpen(true);
    setPromptsLoading(true);
    try {
      const rows = await fetchAllPrompts();
      setPromptRows(rows || []);
      const drafts = {};
      (rows || []).forEach((r) => { drafts[r.key] = r.prompt_text; });
      setPromptDrafts(drafts);
    } catch {
      toast.error("Could not load prompts from Supabase.");
    } finally {
      setPromptsLoading(false);
    }
  }

  async function savePrompt(row) {
    setPromptsSaving((p) => ({ ...p, [row.key]: true }));
    try {
      await upsertPrompt(row.key, row.type, row.label, promptDrafts[row.key] ?? row.prompt_text);
      toast("Prompt saved ✦", {
        style: {
          background: "#1a0e00", color: "#e8d5b7",
          border: "1px solid rgba(245,166,35,0.35)",
          fontFamily: "'DM Mono', monospace", fontSize: "12px", letterSpacing: "0.05em",
        },
      });
    } catch {
      toast.error("Failed to save prompt.");
    } finally {
      setPromptsSaving((p) => ({ ...p, [row.key]: false }));
    }
  }

  // ── Speaker (auto-TTS) toggle ──────────────────────────────────
  const [speakerOn, setSpeakerOn] = useState(false);

  // Stop any in-progress speech when the popup closes
  useEffect(() => {
    if (!chatOpen) stopSpeaking();
  }, [chatOpen]);

  // Load last chat thread when chat opens
  useEffect(() => {
    if (!chatOpen) return;
    let cancelled = false;

    async function loadLatest() {
      setChatInitLoading(true);
      try {
        const latest = await fetchLatestChatThread();
        if (cancelled) return;

        if (latest && Array.isArray(latest.messages)) {
          setActiveChatId(latest.id);
          setActiveChatTitle(latest.title ?? null);
          setChatMessages(latest.messages);
        } else {
          setActiveChatId(null);
          setActiveChatTitle(null);
          setChatMessages([]);
        }
      } catch {
        if (!cancelled) toast.error("Could not load chat history from Supabase.");
      } finally {
        if (!cancelled) setChatInitLoading(false);
      }
    }

    loadLatest();
    return () => {
      cancelled = true;
    };
  }, [chatOpen]);

  // Load chat history list when History panel opens (debounced on search)
  useEffect(() => {
    if (!chatHistoryOpen) return;
    const q = (historySearch || "").trim();
    const delay = q ? 450 : 0;
    const t = setTimeout(() => {
      loadHistoryThreads(q);
    }, delay);
    return () => clearTimeout(t);
  }, [chatHistoryOpen, historySearch]);

  // ── Chat voice recording ───────────────────────────────────────
  const [chatRecording, setChatRecording] = useState(false);
  const [chatTranscribing, setChatTranscribing] = useState(false);
  const chatMediaRecorderRef = useRef(null);
  const chatChunksRef = useRef([]);
  const chatStreamRef = useRef(null);

  async function startChatRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chatStreamRef.current = stream;
      chatChunksRef.current = [];

      const options = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? { mimeType: "audio/webm;codecs=opus" }
        : MediaRecorder.isTypeSupported("audio/webm")
          ? { mimeType: "audio/webm" }
          : {};

      const mr = new MediaRecorder(stream, options);
      chatMediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chatChunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        const mimeType = mr.mimeType || "audio/webm";
        const blob = new Blob(chatChunksRef.current, { type: mimeType });
        chatChunksRef.current = [];
        setChatTranscribing(true);
        try {
          const transcribed = await transcribeAudio(blob);
          if (transcribed) {
            setChatInput((prev) => prev.trim() ? `${prev.trimEnd()} ${transcribed}` : transcribed);
          }
        } catch (err) {
          if (err?.status === 429 || /429|rate limit/i.test(err?.message)) {
            toast.error("Rate limit exceeded — try again in a minute.");
          } else {
            toast.error("Voice transcription failed.");
          }
        } finally {
          setChatTranscribing(false);
        }
      };

      mr.start(250);
      setChatRecording(true);
    } catch {
      toast.error("Microphone access denied.");
    }
  }

  function stopChatRecording() {
    chatMediaRecorderRef.current?.stop();
    chatStreamRef.current?.getTracks().forEach((t) => t.stop());
    chatStreamRef.current = null;
    setChatRecording(false);
  }

  async function handleSelectImages(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    const remaining = Math.max(0, 5 - chatImages.length);
    if (remaining <= 0) {
      toast.error("Max 5 images allowed.");
      return;
    }
    const picked = files.slice(0, remaining);
    if (files.length > remaining) {
      toast.error("Only 5 images max. Extra files were ignored.");
    }

    setChatImageReading(true);
    try {
      const encoded = await Promise.all(
        picked.map(
          (file) =>
            new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve({ name: file.name, dataUrl: String(reader.result || "") });
              reader.onerror = () => reject(new Error("file-read-failed"));
              reader.readAsDataURL(file);
            })
        )
      );
      setChatImages((prev) => [...prev, ...encoded].slice(0, 5));
    } catch {
      toast.error("Could not read selected image(s).");
    } finally {
      setChatImageReading(false);
    }
  }

  // Fetch notes for the current week from Supabase
  useEffect(() => {
    let cancelled = false;
    async function loadWeekNotes() {
      setLoading(true);
      const weekDays = getWeekDays(weekStart);
      const dateKeys = weekDays.map((d) => toDateKey(d));
      const data = await fetchNoteRows(dateKeys);
      if (!cancelled) {
        setNotesData(data);
        setLoading(false);
      }
    }
    loadWeekNotes();
    return () => { cancelled = true; };
  }, [weekStart]);

  // Callback when a note is saved (update local state for summary dots)
  function handleNoteChange(dateKey, noteText) {
    setNotesData((prev) => ({
      ...prev,
      [dateKey]: { ...prev[dateKey], note_text: noteText },
    }));
  }

  const chatListRef = useRef(null);

  function deriveChatTitleFromFirstMessage(userText) {
    const t = (userText || "").replace(/\s+/g, " ").trim();
    if (!t) return null;
    return t.length > 40 ? t.slice(0, 40) + "…" : t;
  }

  async function loadHistoryThreads(search = "") {
    setHistoryLoading(true);
    setHistorySearching(false);
    try {
      const rows = await fetchChatThreadsList({ search, limit: 30 });
      setHistoryThreads(rows || []);
    } catch {
      toast.error("Could not load chat history from Supabase.");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function openChatThread(threadId) {
    if (!threadId) return;
    setChatHistoryOpen(false);
    stopSpeaking();
    setChatInput("");
    setChatImages([]);
    setChatAnalyzingImages(false);

    setChatInitLoading(true);
    try {
      const thread = await fetchChatThreadById(threadId);
      if (!thread || !Array.isArray(thread.messages)) {
        toast.error("Chat thread was empty or could not be loaded.");
        return;
      }

      setActiveChatId(thread.id ?? null);
      setActiveChatTitle(thread.title ?? null);
      setChatMessages(thread.messages);
      const when = thread.created_at ? new Date(thread.created_at).toLocaleString() : "";
      toast(`Loaded chat${when ? ` from ${when}` : ""}.`, {
        style: {
          background: "#1a0e00",
          color: "#e8d5b7",
          border: "1px solid rgba(245,166,35,0.35)",
          fontFamily: "'DM Mono', monospace",
          fontSize: "12px",
          letterSpacing: "0.05em",
        },
      });
    } catch {
      toast.error("Failed to load selected chat history item.");
    } finally {
      setChatInitLoading(false);
    }
  }

  async function sendChat() {
    const text = chatInput.trim();
    const hasImages = chatImages.length > 0;
    if ((!text && !hasImages) || chatBusy || chatImageReading) return;

    // Ensure we have a thread to persist to
    let threadId = activeChatId;
    let threadTitle = activeChatTitle;
    const weekStartKey = toDateKey(weekStart);

    if (!threadId) {
      try {
        const created = await createChatThread({
          title: null,
          weekStartKey,
          weekEndKey,
        });
        threadId = created?.id ?? null;
        setActiveChatId(threadId);
        if (!threadId) {
          toast.error("Could not create a chat thread in Supabase.");
          return;
        }
      } catch {
        toast.error("Could not create a chat thread in Supabase.");
        return;
      }
    }

    const computedTitle =
      threadTitle
        ? threadTitle
        : text
          ? deriveChatTitleFromFirstMessage(text)
          : hasImages
            ? "Image chat"
            : null;

    const userMsg = {
      role: "user",
      content: `${text || "(image query)"}${hasImages ? `\n[${chatImages.length} image${chatImages.length > 1 ? "s" : ""} attached]` : ""}`,
    };
    const history = [...chatMessages, userMsg];
    const imagesPayload = chatImages.map((img) => img.dataUrl);

    setChatInput("");
    setChatImages([]);
    setChatAnalyzingImages(hasImages);
    setChatMessages(history);
    setChatBusy(true);

    try {
      const answer = await fetchChatCompletion({
        userMessage: text || "Analyze the attached image(s) and help me based on them.",
        messages: chatMessages, // keep history *before* this user message
        weekStartKey: toDateKey(weekStart),
        weekEndKey,
        images: imagesPayload,
      });

      const finalAnswer = answer || "No answer returned.";
      const updatedMessages = [...history, { role: "assistant", content: finalAnswer }];
      setChatMessages(updatedMessages);

      // Persist chat memory (thread messages + search_text)
      setChatSaving(true);
      try {
        const titleToSave = threadTitle ? threadTitle : computedTitle;
        if (!threadTitle && computedTitle) setActiveChatTitle(computedTitle);

        await upsertChatThreadMessages({
          id: threadId,
          title: titleToSave,
          weekStartKey,
          weekEndKey,
          messages: updatedMessages,
        });
      } catch {
        toast.error("Could not save chat to history.");
      } finally {
        setChatSaving(false);
      }

      if (speakerOn) {
        speak(finalAnswer).catch((err) => {
          console.error("TTS error:", err);
          if (err?.status === 429 || /429|rate limit/i.test(err?.message)) {
            toast.error("Rate limit exceeded — Sandy will text only for now.");
          } else {
            toast.error("Couldn't play audio. Check the Groq key or try toggling speaker off/on.");
          }
        });
      }
    } catch (e) {
      setChatMessages([
        ...history,
        { role: "assistant", content: "Could not reach the chat service. Try again later." },
      ]);
    } finally {
      setChatBusy(false);
      setChatAnalyzingImages(false);
    }
  }

  useEffect(() => {
    if (!chatOpen) return;
    const el = chatListRef.current;
    if (!el) return;
    // Defer to let DOM paint
    setTimeout(() => {
      el.scrollTop = el.scrollHeight;
    }, 0);
  }, [chatOpen, chatMessages, chatBusy]);

  function prevWeek() {
    setWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }

  function nextWeek() {
    setWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }

  function goToday() {
    setWeekStart(startOfWeek(today));
    setActiveKey(todayKey);
  }

  const weekNumber = (() => {
    const d = new Date(weekStart);
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  })();

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(0deg, #0d0805 0%, #1a0e00 40%, #0a0d1a 100%)",
      fontFamily: FONT_MONO,
    }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes mic-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.45; transform: scale(0.8); } }
      `}</style>
      <div style={{
        maxWidth: 680,
        margin: "0 auto",
        padding: "48px 20px 80px",
      }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            marginBottom: 12,
          }}>
            <BookOpen size={18} color="rgba(245,166,35,0.6)" />
            <span style={{
              fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.35em",
              textTransform: "uppercase", color: "rgba(245,166,35,0.5)",
            }}>
              Weekly Notes
            </span>
          </div>
          <h1
            onClick={() => navigate("/")}
            title="Go to home"
            style={{
              fontFamily: FONT_SERIF, fontSize: 52, fontWeight: 400,
              color: "#e8d5b7", margin: "0 0 10px",
              letterSpacing: "-0.5px", lineHeight: 1.1,
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            Klar<span style={{ color: "rgba(237,135,19,0.9)", fontStyle: "italic" }}>'</span>y
          </h1>
          <p style={{
            fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.25em",
            textTransform: "uppercase", color: "rgba(245,166,35,0.4)", margin: 0,
          }}>
            · A log for every day ·
          </p>
        </div>

        {/* Week navigation */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 24,
          padding: "18px 18px",
          borderRadius: 14,
          border: "1px solid rgba(245,166,35,0.16)",
          background: "rgba(245,166,35,0.04)",
        }}>
          <button
            type="button"
            onClick={prevWeek}
            style={{
              background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, padding: "7px 10px", cursor: "pointer",
              color: "rgba(232,213,183,0.6)", display: "flex", alignItems: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(245,166,35,0.5)"; e.currentTarget.style.color = "#f5a623"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(232,213,183,0.6)"; }}
          >
            <ChevronLeft size={16} />
          </button>

          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{
              fontFamily: FONT_SERIF, fontSize: 17,
              color: "#e8d5b7", marginBottom: 4,
            }}>
              {formatWeekLabel(weekStart)}
            </div>
            <div style={{
              fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.2em",
              textTransform: "uppercase", color: "rgba(245,166,35,0.45)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <Calendar size={10} color="rgba(245,166,35,0.4)" />
              Week {weekNumber}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              <button
                type="button"
                title="Weekly goals"
                onClick={() => setWeeklyGoalsOpen((v) => !v)}
                style={{
                  background: weeklyGoalsOpen ? "rgba(200,40,40,0.18)" : "rgba(255,255,255,0.03)",
                  border: weeklyGoalsOpen ? "1px solid rgba(220,70,70,0.65)" : "1px solid rgba(200,60,60,0.55)",
                  borderRadius: 8, padding: "6px 12px", cursor: "pointer",
                  color: weeklyGoalsOpen ? "rgba(255,140,140,0.95)" : "rgba(240,100,100,0.88)",
                  fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.1em",
                  display: "flex", alignItems: "center", gap: 5,
                  transition: "all 0.15s",
                  textTransform: "uppercase",
                }}
              >
                <Target size={12} /> Goals
              </button>
              <button
                type="button"
                title={weeklyHighlightsData ? "Double-click to refresh weekly highlights" : "Generate weekly highlights"}
                onClick={() => runWeeklyHighlights()}
                onDoubleClick={(e) => { e.stopPropagation(); runWeeklyHighlights(true); }}
                style={{
                  background: weeklyHighlightsOpen ? "rgba(245,166,35,0.14)" : "rgba(255,255,255,0.03)",
                  border: weeklyHighlightsOpen ? "1px solid rgba(245,166,35,0.38)" : "1px solid rgba(70,200,110,0.45)",
                  borderRadius: 8, padding: "6px 12px", cursor: "pointer",
                  color: weeklyHighlightsOpen ? "rgba(245,166,35,0.9)" : "rgba(70,200,110,0.75)",
                  fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.1em",
                  display: "flex", alignItems: "center", gap: 5,
                  transition: "all 0.15s",
                  textTransform: "uppercase",
                }}
              >
                <Sparkles size={12} /> Highlights
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {!isCurrentWeek && (
              <button
                type="button"
                onClick={goToday}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(70,200,110,0.35)",
                  borderRadius: 8, padding: "7px 12px", cursor: "pointer",
                  color: "rgba(70,200,110,0.75)",
                  fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.1em",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(70,200,110,0.7)"; e.currentTarget.style.color = "rgba(70,200,110,0.95)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(70,200,110,0.35)"; e.currentTarget.style.color = "rgba(70,200,110,0.75)"; }}
              >
                Today
              </button>
            )}
            <button
              type="button"
              onClick={nextWeek}
              style={{
                background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, padding: "7px 10px", cursor: "pointer",
                color: "rgba(232,213,183,0.6)", display: "flex", alignItems: "center",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(245,166,35,0.5)"; e.currentTarget.style.color = "#f5a623"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(232,213,183,0.6)"; }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* ── Weekly Goals panel ── */}
        {weeklyGoalsOpen && (
          <div style={{
            marginBottom: 16,
            background: "rgba(200,40,40,0.06)",
            border: "1px solid rgba(200,60,60,0.3)",
            borderRadius: 14,
            padding: "18px 20px",
          }}>
            {/* Panel header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 14,
            }}>
              <div style={{
                fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.2em",
                textTransform: "uppercase", color: "rgba(245,166,35,0.75)",
                display: "flex", alignItems: "center", gap: 7,
              }}>
                <Target size={12} color="rgba(245,166,35,0.65)" />
                Weekly Goals · Week {weekNumber}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button
                  type="button"
                  title="Import these goals into every day this week"
                  onClick={handleImportWeeklyGoals}
                  style={{
                    background: "rgba(70,200,110,0.08)",
                    border: "1px solid rgba(70,200,110,0.35)",
                    borderRadius: 8, padding: "5px 11px", cursor: "pointer",
                    color: "rgba(70,200,110,0.85)",
                    fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    display: "flex", alignItems: "center", gap: 5,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(70,200,110,0.14)"; e.currentTarget.style.color = "rgba(70,200,110,1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(70,200,110,0.08)"; e.currentTarget.style.color = "rgba(70,200,110,0.85)"; }}
                >
                  <ChevronRight size={11} /> Import to all days
                </button>
              </div>
            </div>

            {/* Goals table */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT_MONO, fontSize: 12 }}>
              <tbody>
                {weeklyGoals.map((g) => (
                  <tr key={g.id}>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)", width: 34, verticalAlign: "middle" }}>
                      <button
                        type="button"
                        onClick={() => handleToggleWeeklyGoal(g.id)}
                        title={g.done ? "Mark undone" : "Mark done"}
                        style={{ background: "transparent", border: "none", padding: 3, cursor: "pointer", display: "inline-flex", alignItems: "center", color: "rgba(232,213,183,0.7)" }}
                      >
                        {g.done ? <CircleCheck size={17} color="rgba(70,200,110,0.9)" /> : <Circle size={17} color="rgba(240,100,100,0.7)" />}
                      </button>
                    </td>
                    <td style={{
                      padding: "7px 8px",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      verticalAlign: "middle",
                      textDecoration: g.done ? "line-through" : "none",
                      color: g.done ? "rgba(232,213,183,0.4)" : "rgba(232,213,183,0.9)",
                    }}>
                      {g.text}
                    </td>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)", width: 34, textAlign: "right", verticalAlign: "middle" }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteWeeklyGoal(g)}
                        title={g.done ? "Remove goal" : "Mark done first to remove"}
                        style={{ background: "transparent", border: "none", padding: 3, cursor: "pointer", display: "inline-flex", alignItems: "center", color: g.done ? "rgba(200,80,80,0.9)" : "rgba(232,213,183,0.3)" }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {/* Add row */}
                <tr>
                  <td style={{ padding: "7px 8px", width: 34, verticalAlign: "middle" }}>
                    <button
                      type="button"
                      onClick={() => setWeeklyGoalAdding(true)}
                      title="Add goal"
                      style={{ background: "transparent", border: "none", padding: 3, cursor: "pointer", display: "inline-flex", alignItems: "center", color: "rgba(240,100,100,0.8)" }}
                    >
                      <Plus size={17} />
                    </button>
                  </td>
                  <td style={{ padding: "7px 8px", verticalAlign: "middle" }} colSpan={2}>
                    {weeklyGoalAdding ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <input
                          type="text"
                          value={newWeeklyGoalText}
                          onChange={(e) => setNewWeeklyGoalText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddWeeklyGoal();
                            if (e.key === "Escape") { setWeeklyGoalAdding(false); setNewWeeklyGoalText(""); }
                          }}
                          placeholder="New weekly goal…"
                          autoFocus
                          style={{
                            flex: 1, minWidth: 140,
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(245,166,35,0.3)",
                            borderRadius: 8, padding: "5px 10px",
                            color: "#e8d5b7", fontFamily: FONT_MONO, fontSize: 12, outline: "none",
                          }}
                        />
                        <button type="button" onClick={handleAddWeeklyGoal} title="Save"
                          style={{ background: "transparent", border: "none", padding: 3, cursor: "pointer", color: "rgba(70,200,110,0.9)", display: "inline-flex", alignItems: "center" }}>
                          <Check size={17} />
                        </button>
                        <button type="button" onClick={() => { setWeeklyGoalAdding(false); setNewWeeklyGoalText(""); }} title="Cancel"
                          style={{ background: "transparent", border: "none", padding: 3, cursor: "pointer", color: "rgba(200,80,80,0.9)", display: "inline-flex", alignItems: "center" }}>
                          <X size={17} />
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: "rgba(232,213,183,0.28)", fontStyle: "italic" }}>
                        {weeklyGoals.length === 0 ? "No goals yet — click + to add" : ""}
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ── Weekly Highlights placeholder panel ── */}
        {weeklyHighlightsOpen && (
          <div style={{
            marginBottom: 16,
            background: "rgba(70,200,110,0.06)",
            border: "1px solid rgba(70,200,110,0.3)",
            borderRadius: 14,
            padding: "18px 20px",
          }}>
            <div style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(70,200,110,0.78)",
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}>
              <Sparkles size={12} color="rgba(70,200,110,0.9)" />
              Weekly Highlights · Week {weekNumber}
            </div>
            <div style={{
              fontFamily: FONT_MONO,
              fontSize: 12,
              lineHeight: 1.8,
              color: "rgba(232,213,183,0.62)",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.02)",
              borderRadius: 12,
              padding: "12px 14px",
            }}>
              {weeklyHighlightsLoading ? (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  <Loader2 size={14} color="rgba(70,200,110,0.85)" style={{ animation: "spin 0.8s linear infinite" }} />
                  <span>Summarizing week…</span>
                </div>
              ) : weeklyIncompleteMsg ? (
                <span style={{ color: "rgba(245,166,35,0.85)" }}>{weeklyIncompleteMsg}</span>
              ) : weeklyHighlightsErr ? (
                <span style={{ color: "rgba(220,80,80,0.9)" }}>{weeklyHighlightsErr}</span>
              ) : weeklyHighlightsData ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    alignSelf: "flex-start",
                    border: "1px solid rgba(70,200,110,0.25)",
                    background: "rgba(70,200,110,0.08)",
                    borderRadius: 999,
                    padding: "2px 10px",
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "rgba(70,200,110,0.92)",
                  }}>
                    {weeklyHighlightsData.tag || `Week${weekNumber}`}
                  </div>
                  {Array.isArray(weeklyHighlightsData.literal_bullets) && weeklyHighlightsData.literal_bullets.length > 0 && (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {weeklyHighlightsData.literal_bullets.slice(0, 10).map((b, idx) => (
                        <li key={idx} style={{ marginBottom: 5, color: "rgba(232,213,183,0.85)" }}>{b}</li>
                      ))}
                    </ul>
                  )}
                  {(() => {
                    const rawIncidents = weeklyHighlightsData?.checks?.special_incidents;
                    if (!rawIncidents || !rawIncidents.length) return null;

                    // normalise: model may return strings (old schema) or { text, sentiment }
                    const incidents = rawIncidents.map((item) =>
                      typeof item === "string"
                        ? { text: item, sentiment: "neutral" }
                        : item
                    );

                    const sentimentConfig = {
                      positive: {
                        label: "Constructive",
                        bg: "rgba(34,130,80,0.22)",
                        border: "rgba(50,200,110,0.45)",
                        iconBg: "rgba(50,200,110,0.85)",
                        textColor: "rgba(180,255,210,0.92)",
                        subColor: "rgba(140,220,170,0.75)",
                        Icon: CheckCircle2,
                      },
                      negative: {
                        label: "Destructive",
                        bg: "rgba(130,30,30,0.25)",
                        border: "rgba(220,70,70,0.45)",
                        iconBg: "rgba(210,60,60,0.85)",
                        textColor: "rgba(255,190,190,0.95)",
                        subColor: "rgba(220,150,150,0.75)",
                        Icon: XCircle,
                      },
                      neutral: {
                        label: "Neutral",
                        bg: "rgba(40,80,160,0.2)",
                        border: "rgba(80,130,220,0.4)",
                        iconBg: "rgba(70,120,210,0.85)",
                        textColor: "rgba(190,210,255,0.92)",
                        subColor: "rgba(160,185,240,0.7)",
                        Icon: MinusCircle,
                      },
                    };

                    return (
                      <div>
                        <button
                          type="button"
                          onClick={() => setWeeklyIncidentsOpen((v) => !v)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 8,
                            padding: "6px 12px",
                            cursor: "pointer",
                            fontFamily: FONT_MONO,
                            fontSize: 9.5,
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                            color: "rgba(232,213,183,0.7)",
                          }}
                        >
                          <AlertCircle size={12} />
                          Special Incidents ({incidents.length})
                          {weeklyIncidentsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>

                        {weeklyIncidentsOpen && (
                          <div style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                            marginTop: 12,
                          }}>
                            {incidents.map((inc, idx) => {
                              const cfg = sentimentConfig[inc.sentiment] || sentimentConfig.neutral;
                              const { Icon } = cfg;
                              return (
                                <div
                                  key={idx}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 14,
                                    background: cfg.bg,
                                    border: `1px solid ${cfg.border}`,
                                    borderRadius: 14,
                                    padding: "12px 14px",
                                  }}
                                >
                                  <div style={{
                                    flexShrink: 0,
                                    width: 38,
                                    height: 38,
                                    borderRadius: "50%",
                                    background: cfg.iconBg,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    boxShadow: `0 2px 12px ${cfg.border}`,
                                  }}>
                                    <Icon size={20} color="#fff" strokeWidth={2.2} />
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                      fontFamily: FONT_MONO,
                                      fontSize: 8.5,
                                      letterSpacing: "0.18em",
                                      textTransform: "uppercase",
                                      color: cfg.subColor,
                                      marginBottom: 3,
                                    }}>
                                      {cfg.label}
                                    </div>
                                    <div style={{
                                      fontFamily: FONT_MONO,
                                      fontSize: 12.5,
                                      color: cfg.textColor,
                                      lineHeight: 1.5,
                                    }}>
                                      {inc.text}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                "Click Highlights to generate weekly highlights."
              )}
            </div>
          </div>
        )}

        {/* Day cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {loading ? (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "40px 0", gap: 12,
            }}>
              <Loader2 size={18} color="rgba(245,166,35,0.6)" style={{ animation: "spin 0.8s linear infinite" }} />
              <span style={{
                fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.15em",
                color: "rgba(245,166,35,0.5)",
              }}>
                Loading notes…
              </span>
            </div>
          ) : days.map((day) => {
            const key = toDateKey(day);
            const row = notesData[key] || {};
            return (
              <DayCard
                key={key}
                date={day}
                isToday={key === todayKey}
                isActive={key === activeKey}
                onClick={() => setActiveKey(prev => prev === key ? null : key)}
                initialNote={row.note_text || ""}
                initialHighlights={row.highlights || null}
                onNoteChange={handleNoteChange}
              />
            );
          })}
        </div>

        {/* Week summary strip */}
        <div style={{
          marginTop: 28,
          display: "flex", gap: 6, justifyContent: "center",
        }}>
          {days.map((day) => {
            const key = toDateKey(day);
            const row = notesData[key] || {};
            const hasNote = (row.note_text || "").trim().length > 0;
            const isTodayDot = key === todayKey;
            return (
              <div
                key={key}
                title={`${DAY_SHORT[day.getDay()]} ${day.getDate()}`}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                }}
              >
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: hasNote
                    ? "rgba(245,166,35,0.8)"
                    : isTodayDot
                      ? "rgba(70,200,110,0.6)"
                      : "rgba(255,255,255,0.12)",
                  boxShadow: hasNote ? "0 0 6px rgba(245,166,35,0.5)" : "none",
                  transition: "all 0.3s",
                }} />
                <span style={{
                  fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: isTodayDot ? "rgba(70,200,110,0.6)" : "rgba(232,213,183,0.25)",
                }}>
                  {DAY_SHORT[day.getDay()]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        <p style={{
          textAlign: "center", marginTop: 36,
          fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.15em",
          color: "rgba(232,213,183,0.15)",
        }}>
          · notes sync to cloud · navigate weeks with the arrows ·
        </p>

        {/* Chat trigger (bottom-right, sticky) */}
        {!chatOpen && (
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            style={{
              position: "fixed",
              bottom: 18,
              right: 18,
              zIndex: 4000,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(26,14,0,0.92)",
              border: "1px solid rgba(245,166,35,0.25)",
              color: "#e8d5b7",
              borderRadius: 16,
              padding: "12px 14px",
              cursor: "pointer",
              boxShadow: "0 18px 48px rgba(0,0,0,0.45)",
              fontFamily: FONT_MONO,
            }}
            title="Chat with your notes"
          >
            <MessageSquare size={16} color="rgba(245,166,35,0.8)" />
            <span style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>Chat</span>
          </button>
        )}

        {/* Chat popup */}
        {chatOpen && (
          <div
            style={{
              position: "fixed",
              bottom: 18,
              right: 18,
              zIndex: 4000,
              width: "min(420px, 92vw)",
              height: "70vh",
              background: "rgba(26,14,0,0.92)",
              border: "1px solid rgba(245,166,35,0.25)",
              borderRadius: 18,
              boxShadow: "0 22px 64px rgba(0,0,0,0.55)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <MessageSquare size={16} color="rgba(245,166,35,0.85)" />
                <div style={{ fontFamily: FONT_MONO, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(232,213,183,0.9)" }}>
                  Klar'y Chat
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {/* Prompt manager button */}
                <button
                  type="button"
                  title="Prompt Manager"
                  onClick={openPromptMgr}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(232,213,183,0.45)",
                    borderRadius: 10,
                    padding: "6px 8px",
                    cursor: "pointer",
                    display: "flex", alignItems: "center",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(245,166,35,0.4)"; e.currentTarget.style.color = "rgba(245,166,35,0.8)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(232,213,183,0.45)"; }}
                >
                  <Settings size={13} />
                </button>

                {/* Fresh chat (+) */}
                <button
                  type="button"
                  title="New chat"
                  onClick={() => {
                    stopSpeaking();
                    setChatHistoryOpen(false);
                    setChatInput("");
                    setChatImages([]);
                    setChatAnalyzingImages(false);
                    setChatMessages([]);
                    setChatSaving(false);
                    // Create a new thread immediately
                    (async () => {
                      try {
                        const created = await createChatThread({
                          title: null,
                          weekStartKey: toDateKey(weekStart),
                          weekEndKey,
                        });
                        setActiveChatId(created?.id ?? null);
                        setActiveChatTitle(null);
                        toast("Fresh chat started ✦", {
                          style: {
                            background: "#1a0e00",
                            color: "#e8d5b7",
                            border: "1px solid rgba(245,166,35,0.35)",
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "12px",
                            letterSpacing: "0.05em",
                          },
                        });
                      } catch {
                        toast.error("Could not start a fresh chat.");
                      }
                    })();
                  }}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(232,213,183,0.45)",
                    borderRadius: 10,
                    padding: "6px 8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "rgba(245,166,35,0.4)";
                    e.currentTarget.style.color = "rgba(245,166,35,0.8)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.color = "rgba(232,213,183,0.45)";
                  }}
                >
                  <Plus size={13} />
                </button>

                {/* Chat history */}
                <button
                  type="button"
                  title="Chat history"
                  onClick={() => {
                    setChatHistoryOpen((v) => {
                      const next = !v;
                      if (next) {
                        stopSpeaking();
                        toast("Loading chat history…", {
                          style: {
                            background: "#1a0e00",
                            color: "#e8d5b7",
                            border: "1px solid rgba(245,166,35,0.35)",
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "12px",
                            letterSpacing: "0.05em",
                          },
                        });
                      }
                      return next;
                    });
                  }}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(232,213,183,0.45)",
                    borderRadius: 10,
                    padding: "6px 8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "rgba(70,200,110,0.35)";
                    e.currentTarget.style.color = "rgba(70,200,110,0.85)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.color = "rgba(232,213,183,0.45)";
                  }}
                >
                  <Clock size={13} />
                </button>

                {/* Close button */}
                <button
                  type="button"
                  onClick={() => setChatOpen(false)}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(232,213,183,0.7)",
                    borderRadius: 10,
                    padding: "6px 10px",
                    cursor: "pointer",
                    fontFamily: FONT_MONO,
                    fontSize: 12,
                  }}
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            <div
              ref={chatListRef}
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "12px 12px 6px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {chatHistoryOpen && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <input
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Search chat messages…"
                      style={{
                        flex: 1,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(245,166,35,0.18)",
                        borderRadius: 14,
                        padding: "10px 12px",
                        color: "#e8d5b7",
                        fontFamily: FONT_MONO,
                        fontSize: 13,
                        outline: "none",
                      }}
                    />
                    {(historyLoading || historySearching || chatInitLoading) ? (
                      <Loader2 size={16} style={{ animation: "spin 0.9s linear infinite", color: "rgba(245,166,35,0.8)" }} />
                    ) : (
                      <Clock size={16} color="rgba(232,213,183,0.25)" />
                    )}
                  </div>

                  {historyLoading ? (
                    <div style={{ color: "rgba(232,213,183,0.45)", fontFamily: FONT_MONO, fontSize: 12, lineHeight: 1.6 }}>
                      Loading chat history…
                    </div>
                  ) : historyThreads.length === 0 ? (
                    <div style={{ color: "rgba(232,213,183,0.45)", fontFamily: FONT_MONO, fontSize: 12, lineHeight: 1.6 }}>
                      No chat history found.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {historyThreads.map((t) => {
                        const when = t?.updated_at ? new Date(t.updated_at).toLocaleString() : "";
                        const isActive = t?.id === activeChatId;
                        return (
                          <div
                            key={t.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => openChatThread(t.id)}
                            onKeyDown={(e) => e.key === "Enter" && openChatThread(t.id)}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              gap: 12,
                              textAlign: "left",
                              background: isActive ? "rgba(245,166,35,0.14)" : "rgba(255,255,255,0.02)",
                              border: isActive ? "1px solid rgba(245,166,35,0.35)" : "1px solid rgba(245,166,35,0.12)",
                              borderRadius: 12,
                              padding: "10px 12px",
                              cursor: "pointer",
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: FONT_MONO, fontSize: 12.5, color: "rgba(232,213,183,0.9)", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {t.title ? t.title : "Chat"}
                              </div>
                              <div style={{ marginTop: 4, fontFamily: FONT_MONO, fontSize: 10.5, color: "rgba(232,213,183,0.35)" }}>
                                {when}
                              </div>
                            </div>

                            <button
                              type="button"
                              title="Delete chat"
                              onClick={async (e) => {
                                e.stopPropagation();
                                setChatDeleteConfirm({ id: t.id, title: t.title || "Chat" });
                              }}
                              style={{
                                border: "none",
                                background: "transparent",
                                cursor: "pointer",
                                padding: 0,
                                marginTop: 2,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                width: 28,
                                height: 28,
                                borderRadius: 10,
                                border: "1px solid rgba(200,40,40,0.35)",
                                color: "rgba(240,100,100,0.95)",
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
              {!chatHistoryOpen && chatMessages.length === 0 ? (
                <div style={{ color: "rgba(232,213,183,0.45)", fontFamily: FONT_MONO, fontSize: 12, lineHeight: 1.6 }}>
                  Ask about your week notes.
                  <div style={{ marginTop: 8, color: "rgba(245,166,35,0.55)" }}>
                    Example: “Did you do cold showers everyday this week?”
                  </div>
                </div>
              ) : null}
              {!chatHistoryOpen && chatMessages.map((m, idx) => {
                const isUser = m.role === "user";
                const bubbleStyle = {
                  maxWidth: "92%",
                  background: isUser ? "rgba(245,166,35,0.12)" : "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 14,
                  padding: "10px 12px",
                  fontFamily: FONT_MONO,
                  fontSize: 12.5,
                  lineHeight: 1.65,
                  color: "rgba(232,213,183,0.85)",
                  wordBreak: "break-word",
                };
                return (
                  <div
                    key={idx}
                    style={{
                      alignSelf: isUser ? "flex-end" : "flex-start",
                      ...bubbleStyle,
                    }}
                  >
                    {isUser ? (
                      <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                    ) : (
                      <div className="chat-md" style={{ maxWidth: "100%" }}>
                        <style>{`
                          .chat-md p { margin: 0 0 6px 0; }
                          .chat-md p:last-child { margin-bottom: 0; }
                          .chat-md ul, .chat-md ol { margin: 6px 0; padding-left: 18px; }
                          .chat-md li { margin: 3px 0; }
                          .chat-md strong { color: #f5a623; font-weight: 700; }
                          .chat-md em { color: rgba(232,213,183,0.75); font-style: italic; }
                          .chat-md table { border-collapse: collapse; width: 100%; margin: 8px 0; }
                          .chat-md th { background: rgba(245,166,35,0.12); color: rgba(245,166,35,0.9); padding: 5px 9px; border: 1px solid rgba(245,166,35,0.22); font-size: 11px; letter-spacing: 0.08em; text-align: left; }
                          .chat-md td { padding: 5px 9px; border: 1px solid rgba(255,255,255,0.08); color: rgba(232,213,183,0.8); font-size: 12px; }
                          .chat-md tr:nth-child(even) td { background: rgba(255,255,255,0.02); }
                          .chat-md h1, .chat-md h2, .chat-md h3 { color: #e8d5b7; margin: 8px 0 4px; font-size: 13px; letter-spacing: 0.05em; }
                        `}</style>
                        <ReactMarkdown skipHtml={true}>
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                );
              })}
              {!chatHistoryOpen && chatBusy ? (
                <div style={{ alignSelf: "flex-start", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "10px 12px", fontFamily: FONT_MONO, fontSize: 12.5, color: "rgba(232,213,183,0.6)" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                    <Loader2 size={13} style={{ animation: "spin 0.9s linear infinite" }} />
                    {chatAnalyzingImages ? "Analyzing image(s)…" : "Thinking…"}
                  </div>
                </div>
              ) : null}
            </div>

            {!chatHistoryOpen && (
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.08)",
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <textarea
                rows={2}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendChat();
                  }
                }}
                placeholder="Ask about your notes…"
                style={{
                  width: "100%",
                  resize: "none",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(245,166,35,0.18)",
                  borderRadius: 14,
                  padding: "10px 12px",
                  color: "#e8d5b7",
                  fontFamily: FONT_MONO,
                  fontSize: 13,
                  outline: "none",
                  lineHeight: 1.5,
                }}
              />

              {chatImages.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {chatImages.map((img, idx) => (
                    <div
                      key={`${img.name}-${idx}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(245,166,35,0.18)",
                        borderRadius: 999,
                        padding: "4px 8px",
                        color: "rgba(232,213,183,0.68)",
                        fontFamily: FONT_MONO,
                        fontSize: 10.5,
                      }}
                    >
                      <Camera size={12} color="rgba(245,166,35,0.75)" />
                      <span>{img.name.length > 18 ? `${img.name.slice(0, 18)}…` : img.name}</span>
                      <button
                        type="button"
                        onClick={() => setChatImages((prev) => prev.filter((_, i) => i !== idx))}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "rgba(232,213,183,0.55)",
                          cursor: "pointer",
                          padding: 0,
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                        title="Remove image"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleSelectImages}
                style={{ display: "none" }}
              />

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* Speaker toggle */}
                <button
                  type="button"
                  title={speakerOn ? "Speaker on — click to mute" : "Speaker off — click to enable auto-read"}
                  onClick={() => {
                    setSpeakerOn((v) => {
                      const next = !v;
                      if (next) {
                        unlockAudio(); // unlock AudioContext during this user gesture
                      } else {
                        stopSpeaking();
                      }
                      return next;
                    });
                  }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 42, height: 42, flexShrink: 0,
                    background: speakerOn ? "rgba(245,166,35,0.15)" : "rgba(255,255,255,0.04)",
                    border: speakerOn ? "1px solid rgba(245,166,35,0.5)" : "1px solid rgba(245,166,35,0.15)",
                    borderRadius: 14,
                    cursor: "pointer",
                    transition: "all 0.18s",
                  }}
                >
                  {speakerOn
                    ? <Volume2 size={16} color="rgba(245,166,35,0.9)" />
                    : <VolumeX size={16} color="rgba(232,213,183,0.3)" />}
                </button>

                {/* Mic / Stop button */}
                <button
                  type="button"
                  title={chatRecording ? "Stop recording" : "Dictate message"}
                  onClick={chatRecording ? stopChatRecording : startChatRecording}
                  disabled={chatTranscribing || chatBusy}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 42, height: 42, flexShrink: 0,
                    background: chatRecording ? "rgba(220,60,60,0.14)" : "rgba(255,255,255,0.04)",
                    border: chatRecording ? "1px solid rgba(220,60,60,0.5)" : "1px solid rgba(245,166,35,0.2)",
                    borderRadius: 14,
                    cursor: chatTranscribing || chatBusy ? "not-allowed" : "pointer",
                    opacity: chatTranscribing || chatBusy ? 0.5 : 1,
                    transition: "all 0.18s",
                  }}
                >
                  {chatTranscribing ? (
                    <Loader2 size={16} color="rgba(245,166,35,0.7)" style={{ animation: "spin 0.8s linear infinite" }} />
                  ) : chatRecording ? (
                    <Square size={14} fill="rgba(220,100,100,0.85)" color="rgba(220,100,100,0.85)" style={{ animation: "mic-pulse 1s ease-in-out infinite" }} />
                  ) : (
                    <Mic size={16} color="rgba(245,166,35,0.6)" />
                  )}
                </button>

                {/* Camera / image upload button */}
                <button
                  type="button"
                  title="Upload up to 5 images"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={chatBusy || chatImageReading || chatImages.length >= 5}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 42, height: 42, flexShrink: 0,
                    background: chatImages.length ? "rgba(245,166,35,0.12)" : "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(245,166,35,0.2)",
                    borderRadius: 14,
                    cursor: chatBusy || chatImageReading || chatImages.length >= 5 ? "not-allowed" : "pointer",
                    opacity: chatBusy || chatImageReading || chatImages.length >= 5 ? 0.5 : 1,
                    transition: "all 0.18s",
                  }}
                >
                  {chatImageReading ? (
                    <Loader2 size={16} color="rgba(245,166,35,0.7)" style={{ animation: "spin 0.8s linear infinite" }} />
                  ) : (
                    <Camera size={16} color="rgba(245,166,35,0.72)" />
                  )}
                </button>

                {/* Send button */}
                <button
                  type="button"
                  onClick={sendChat}
                  disabled={chatBusy || chatImageReading || (chatInput.trim() === "" && chatImages.length === 0)}
                  style={{
                    flex: 1,
                    background: chatBusy || chatInput.trim() === "" ? "rgba(255,255,255,0.05)" : "rgba(245,166,35,0.15)",
                    border: "1px solid rgba(245,166,35,0.35)",
                    color: "rgba(232,213,183,0.85)",
                    borderRadius: 14,
                    padding: "10px 12px",
                    cursor: chatBusy || chatInput.trim() === "" ? "not-allowed" : "pointer",
                    fontFamily: FONT_MONO,
                    fontSize: 12.5,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Send size={14} color="rgba(245,166,35,0.85)" />
                  Send
                </button>
              </div>
            </div>
            )}
          </div>
        )}

      </div>

      {/* ── Delete chat confirmation dialog ───────────────────── */}
      {chatDeleteConfirm && (
        <div
          onClick={() => setChatDeleteConfirm(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10050,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 96vw)",
              background: "rgba(20,11,2,0.97)",
              border: "1px solid rgba(245,166,35,0.28)",
              borderRadius: 20,
              boxShadow: "0 24px 72px rgba(0,0,0,0.65)",
              padding: "20px 22px",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Trash2 size={16} color="rgba(240,100,100,0.9)" />
                <div style={{ color: "rgba(232,213,183,0.9)", fontSize: 12.5, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Delete chat
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChatDeleteConfirm(null)}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(232,213,183,0.7)",
                  borderRadius: 10,
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginTop: 14, color: "rgba(232,213,183,0.85)", fontSize: 13.5, lineHeight: 1.6 }}>
              Delete this chat history item?
              <div style={{ marginTop: 6, color: "rgba(232,213,183,0.45)", fontSize: 11.5, wordBreak: "break-word" }}>
                {chatDeleteConfirm.title}
              </div>
            </div>

            <div style={{ marginTop: 18, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setChatDeleteConfirm(null)}
                disabled={chatDeleting}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10,
                  padding: "8px 16px",
                  cursor: chatDeleting ? "not-allowed" : "pointer",
                  color: "rgba(232,213,183,0.6)",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={async () => {
                  const id = chatDeleteConfirm?.id;
                  if (!id) return;
                  setChatDeleting(true);
                  try {
                    await deleteChatThreadById(id);
                    toast("Chat deleted ✦", {
                      style: {
                        background: "#1a0e00",
                        color: "#e8d5b7",
                        border: "1px solid rgba(245,166,35,0.35)",
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "12px",
                        letterSpacing: "0.05em",
                      },
                    });

                    setHistoryThreads((prev) => prev.filter((x) => x.id !== id));

                    if (id === activeChatId) {
                      setActiveChatId(null);
                      setActiveChatTitle(null);
                      setChatMessages([]);
                    }
                  } catch {
                    toast.error("Failed to delete chat history item.");
                  } finally {
                    setChatDeleting(false);
                    setChatDeleteConfirm(null);
                  }
                }}
                disabled={chatDeleting}
                style={{
                  background: "rgba(200,40,40,0.15)",
                  border: "1px solid rgba(200,40,40,0.5)",
                  borderRadius: 10,
                  padding: "8px 16px",
                  cursor: chatDeleting ? "not-allowed" : "pointer",
                  color: "rgba(240,100,100,0.95)",
                  fontFamily: "'DM Mono', monospace",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                {chatDeleting ? (
                  <>
                    <Loader2 size={14} style={{ animation: "spin 0.9s linear infinite" }} />
                    Deleting…
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Prompt Manager Dialog ─────────────────────────────── */}
      {promptMgrOpen && (
        <div
          onClick={() => setPromptMgrOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 2000,
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "min(620px, 96vw)",
              maxHeight: "88vh",
              background: "rgba(20,11,2,0.97)",
              border: "1px solid rgba(245,166,35,0.28)",
              borderRadius: 20,
              boxShadow: "0 24px 72px rgba(0,0,0,0.65)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Settings size={15} color="rgba(245,166,35,0.8)" />
                <span style={{ fontFamily: FONT_MONO, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(232,213,183,0.9)" }}>
                  Prompt Manager
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPromptMgrOpen(false)}
                style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(232,213,183,0.6)", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontFamily: FONT_MONO, fontSize: 12 }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 24 }}>
              {promptsLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(232,213,183,0.45)", fontFamily: FONT_MONO, fontSize: 12 }}>
                  <Loader2 size={14} style={{ animation: "spin 0.9s linear infinite" }} /> Loading prompts…
                </div>
              ) : promptRows.length === 0 ? (
                <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: "rgba(232,213,183,0.4)", lineHeight: 1.7 }}>
                  No prompts found in Supabase.<br />
                  <span style={{ color: "rgba(245,166,35,0.6)" }}>Run the SQL seed to insert the default rows.</span>
                </div>
              ) : (
                promptRows.map((row) => (
                  <div key={row.key} style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(245,166,35,0.12)",
                    borderRadius: 14,
                    padding: "16px 18px",
                  }}>
                    {/* Row header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(245,166,35,0.75)", background: "rgba(245,166,35,0.09)", border: "1px solid rgba(245,166,35,0.2)", borderRadius: 999, padding: "2px 8px" }}>
                        {row.type}
                      </span>
                      <span style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: "rgba(232,213,183,0.85)", fontWeight: 500 }}>
                        {row.label}
                      </span>
                    </div>
                    {row.type === "highlights" && (
                      <div style={{ fontFamily: FONT_MONO, fontSize: 9.5, color: "rgba(245,166,35,0.55)", marginBottom: 8, letterSpacing: "0.06em" }}>
                        ⚠ Keep the JSON schema section intact — only edit the Rules or preamble text.
                      </div>
                    )}
                    <textarea
                      value={promptDrafts[row.key] ?? row.prompt_text}
                      onChange={e => setPromptDrafts(d => ({ ...d, [row.key]: e.target.value }))}
                      rows={10}
                      style={{
                        width: "100%",
                        resize: "vertical",
                        background: "rgba(0,0,0,0.25)",
                        border: "1px solid rgba(245,166,35,0.18)",
                        borderRadius: 10,
                        padding: "12px 14px",
                        color: "#e8d5b7",
                        fontFamily: FONT_MONO,
                        fontSize: 11.5,
                        lineHeight: 1.7,
                        outline: "none",
                        boxSizing: "border-box",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={e => { e.target.style.borderColor = "rgba(245,166,35,0.5)"; }}
                      onBlur={e => { e.target.style.borderColor = "rgba(245,166,35,0.18)"; }}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                      <button
                        type="button"
                        onClick={() => savePrompt(row)}
                        disabled={promptsSaving[row.key]}
                        style={{
                          background: promptsSaving[row.key] ? "rgba(245,166,35,0.07)" : "rgba(245,166,35,0.15)",
                          border: "1px solid rgba(245,166,35,0.4)",
                          color: "#e8d5b7",
                          borderRadius: 10,
                          padding: "7px 18px",
                          cursor: promptsSaving[row.key] ? "not-allowed" : "pointer",
                          fontFamily: FONT_MONO,
                          fontSize: 11,
                          letterSpacing: "0.08em",
                          display: "flex", alignItems: "center", gap: 6,
                          transition: "all 0.15s",
                        }}
                      >
                        {promptsSaving[row.key] ? <><Loader2 size={12} style={{ animation: "spin 0.8s linear infinite" }} /> Saving…</> : "Save to Supabase"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.07em", color: "rgba(232,213,183,0.3)" }}>
              Changes take effect within 5 minutes (TTL cache). Prompts are fetched server-side.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
