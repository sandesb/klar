/**
 * Reusable modal dialog with themed styling.
 * Props: open, onClose, title, children, footer
 */
export default function Dialog({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          background: "linear-gradient(180deg, #1a0e00 0%, #0d0805 100%)",
          border: "1px solid rgba(245,166,35,0.25)",
          borderRadius: "14px",
          padding: "22px 26px",
          boxShadow: "0 12px 40px rgba(0,0,0,0.5), 0 0 20px rgba(245,166,35,0.08)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          minWidth: "200px",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          title="Close"
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            background: "transparent",
            border: "none",
            padding: "4px",
            cursor: "pointer",
            color: "rgba(232,213,183,0.5)",
            fontSize: "14px",
            fontFamily: "inherit",
            lineHeight: 1,
          }}
        >
          ✕
        </button>
        {title && (
          <label
            style={{
              fontSize: "10px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(245,166,35,0.7)",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            {title}
          </label>
        )}
        {children}
        {footer}
      </div>
    </div>
  );
}
