import { useState } from "react";
import toast from "react-hot-toast";
import Dialog from "./Dialog.jsx";

/**
 * Dialog for saving a date range with a title.
 * Props: open, onClose, onProceed (optional, called with title after toast)
 */
export default function SaveRangeDialog({ open, onClose, onProceed }) {
  const [title, setTitle] = useState("");
  const canProceed = title.trim() !== "";

  function handleProceed() {
    if (!canProceed) return;
    const t = title.trim();
    const capitalized = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
    toast.success(`${capitalized} is saved`, { style: { fontFamily: "'DM Mono', monospace" } });
    onProceed?.(t);
    setTitle("");
    onClose();
  }

  function handleClose() {
    setTitle("");
    onClose();
  }

  const footer = (
    <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
      <button
        type="button"
        onClick={handleProceed}
        disabled={!canProceed}
        style={{
          background: "linear-gradient(135deg, rgba(245,166,35,0.3), rgba(232,117,58,0.25))",
          border: "1px solid rgba(245,166,35,0.4)",
          borderRadius: "10px",
          padding: "8px 14px",
          color: "#e8d5b7",
          fontSize: "11px",
          fontFamily: "inherit",
          cursor: "pointer",
          letterSpacing: "0.05em",
        }}
      >
        Proceed
      </button>
    </div>
  );

  return (
    <Dialog open={open} onClose={handleClose} title="Save this range?" footer={footer}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleProceed();
          if (e.key === "Escape") handleClose();
        }}
        placeholder="e.g. gym, vacation..."
        autoFocus
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "10px",
          padding: "12px 14px",
          color: "#e8d5b7",
          fontFamily: "'DM Mono', monospace",
          fontSize: "16px",
          letterSpacing: "0.04em",
          outline: "none",
        }}
      />
    </Dialog>
  );
}
