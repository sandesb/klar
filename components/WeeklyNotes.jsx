import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, BookOpen, Calendar, PenLine, Check, Clock, X, Sparkles, Loader2, MessageSquare, Send, Mic, Square, Volume2, VolumeX } from "lucide-react";
import ReactMarkdown from "react-markdown";
import toast from "react-hot-toast";
import { fetchHighlightsStream } from "../utils/groqHighlights.js";
import { fetchNoteRows, saveNoteText, saveHighlights as saveHighlightsToDb } from "../utils/notesStorage.js";
import { fetchChatCompletion } from "../utils/groqChat.js";
import { transcribeAudio } from "../utils/groqTranscribe.js";
import { speak, stopSpeaking, unlockAudio } from "../utils/groqTts.js";
const FONT_MONO = "'DM Mono', monospace";
const FONT_SERIF = "'Playfair Display', serif";

const DAY_NAMES  = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT  = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

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
  const [panel, setPanel] = useState("note"); // 'note' | 'highlights'
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

  // Sync when initial data changes (e.g. week navigation)
  useEffect(() => {
    setText(initialNote ?? "");
  }, [initialNote]);

  useEffect(() => {
    setHighlightsData(initialHighlights ?? null);
  }, [initialHighlights]);

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
      setPanel("note");
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

  async function runHighlights() {
    if (!hasNote) return;
    if (!isActive) onClick();
    setIsEditing(false);
    setPanel("highlights");
    setHighlightsErr("");
    setHighlightsRaw("");

    // Use existing highlights from Supabase if available
    if (highlightsData) {
      return;
    }

    abortRef.current?.abort?.();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setHighlightsLoading(true);
    try {
      let assembled = "";
      const full = await fetchHighlightsStream({
        text,
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
            <button
              type="button"
              title="Generate highlights"
              onClick={(e) => { e.stopPropagation(); runHighlights(); }}
              disabled={!hasNote || highlightsLoading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: highlightsLoading ? "rgba(245,166,35,0.09)" : "rgba(245,166,35,0.06)",
                border: "1px solid rgba(245,166,35,0.18)",
                borderRadius: 999,
                padding: "2px 10px",
                cursor: !hasNote ? "not-allowed" : "pointer",
                opacity: !hasNote ? 0.45 : 1,
                color: "rgba(245,166,35,0.7)",
                fontFamily: FONT_MONO,
                fontSize: 9.5,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              {highlightsLoading ? <Loader2 size={12} style={{ animation: "spin 0.8s linear infinite" }} /> : <Sparkles size={12} />}
              Highlights
            </button>
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
              />
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
              {/* Panel switch */}
              {hasNote && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
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
                    onClick={() => runHighlights()}
                    style={{
                      background: panel === "highlights" ? "rgba(245,166,35,0.14)" : "rgba(255,255,255,0.03)",
                      border: panel === "highlights" ? "1px solid rgba(245,166,35,0.38)" : "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 999,
                      padding: "4px 10px",
                      cursor: "pointer",
                      color: panel === "highlights" ? "rgba(245,166,35,0.9)" : "rgba(232,213,183,0.35)",
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
                  {highlightsLoading && (
                    <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <Loader2 size={14} color="rgba(245,166,35,0.65)" style={{ animation: "spin 0.8s linear infinite" }} />
                      <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.1em", color: "rgba(245,166,35,0.55)" }}>
                        Summarizing…
                      </span>
                    </span>
                  )}
                </div>
              )}

              {panel === "highlights" && hasNote ? (
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
                      {Array.isArray(highlightsData?.checks?.special_incidents) && highlightsData.checks.special_incidents.length > 0 && (
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
                            Special incidents
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 18, color: "rgba(232,213,183,0.72)", lineHeight: 1.7 }}>
                            {highlightsData.checks.special_incidents.slice(0, 8).map((s, idx) => (
                              <li key={idx} style={{ fontFamily: FONT_MONO, fontSize: 12.5 }}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}

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
              ) : hasNote ? (
                <p style={{
                  fontFamily: FONT_MONO,
                  fontSize: 13.5,
                  lineHeight: 1.8,
                  color: "#e8d5b7",
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}>
                  {text}
                </p>
              ) : (
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
              {hasNote && (
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
    </div>
  );
}

export default function WeeklyNotes() {
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

  // ── Chat UI state ─────────────────────────────────────────────
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]); // { role: "user" | "assistant", content: string }
  const [chatBusy, setChatBusy] = useState(false);

  // ── Speaker (auto-TTS) toggle ──────────────────────────────────
  const [speakerOn, setSpeakerOn] = useState(false);

  // Stop any in-progress speech when the popup closes
  useEffect(() => {
    if (!chatOpen) stopSpeaking();
  }, [chatOpen]);

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

  async function sendChat() {
    const text = chatInput.trim();
    if (!text || chatBusy) return;

    const userMsg = { role: "user", content: text };
    const history = [...chatMessages, userMsg];

    setChatInput("");
    setChatMessages(history);
    setChatBusy(true);

    try {
      const answer = await fetchChatCompletion({
        userMessage: text,
        messages: chatMessages, // keep history *before* this user message
        weekStartKey: toDateKey(weekStart),
        weekEndKey,
      });

      const finalAnswer = answer || "No answer returned.";
      setChatMessages([...history, { role: "assistant", content: finalAnswer }]);
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
          <h1 style={{
            fontFamily: FONT_SERIF, fontSize: 52, fontWeight: 400,
            color: "#e8d5b7", margin: "0 0 10px",
            letterSpacing: "-0.5px", lineHeight: 1.1,
          }}>
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
          padding: "14px 18px",
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

          <div style={{ textAlign: "center" }}>
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
              {isCurrentWeek && (
                <span style={{
                  background: "rgba(70,200,110,0.1)",
                  border: "1px solid rgba(70,200,110,0.25)",
                  borderRadius: 5, padding: "1px 7px",
                  color: "rgba(70,200,110,0.75)",
                  fontSize: 8.5,
                }}>
                  Current
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
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

        {/* Chat trigger (bottom-left, sticky) */}
        {!chatOpen && (
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            style={{
              position: "fixed",
              bottom: 18,
              left: 18,
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
              left: 18,
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
              {chatMessages.length === 0 ? (
                <div style={{ color: "rgba(232,213,183,0.45)", fontFamily: FONT_MONO, fontSize: 12, lineHeight: 1.6 }}>
                  Ask about your week notes.
                  <div style={{ marginTop: 8, color: "rgba(245,166,35,0.55)" }}>
                    Example: “Did you do cold showers everyday this week?”
                  </div>
                </div>
              ) : null}
              {chatMessages.map((m, idx) => {
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
              {chatBusy ? (
                <div style={{ alignSelf: "flex-start", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "10px 12px", fontFamily: FONT_MONO, fontSize: 12.5, color: "rgba(232,213,183,0.6)" }}>
                  Thinking…
                </div>
              ) : null}
            </div>

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

                {/* Send button */}
                <button
                  type="button"
                  onClick={sendChat}
                  disabled={chatBusy || chatInput.trim() === ""}
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
          </div>
        )}

      </div>
    </div>
  );
}
