import Dialog from "./Dialog.jsx";

/**
 * Dialog for setting custom working days per week (1–7).
 * Props: open, onClose, value, onChange, onProceed, onReset
 */
export default function WorkingDaysDialog({ open, onClose, value, onChange, onProceed, onReset }) {
  const n = parseInt(value, 10);
  const canProceed = value !== "" && n >= 1 && n <= 7;

  const footer = (
    <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
      <button
        type="button"
        onClick={() => {
          onReset?.();
          onClose();
        }}
        style={{
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "10px",
          padding: "8px 14px",
          color: "rgba(232,213,183,0.6)",
          fontSize: "11px",
          fontFamily: "inherit",
          cursor: "pointer",
          letterSpacing: "0.05em",
        }}
      >
        Reset
      </button>
      <button
        type="button"
        onClick={() => canProceed && onProceed()}
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
    <Dialog open={open} onClose={onClose} title="Working days per week (1–7)" footer={footer}>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "");
          const num = parseInt(v, 10);
          if (v === "" || (num >= 1 && num <= 7)) onChange(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") canProceed && onProceed();
          if (e.key === "Escape") onClose();
        }}
        placeholder="4"
        autoFocus
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "10px",
          padding: "12px 14px",
          color: "#e8d5b7",
          fontFamily: "'DM Mono', monospace",
          fontSize: "18px",
          letterSpacing: "0.06em",
          outline: "none",
          textAlign: "center",
        }}
      />
    </Dialog>
  );
}
