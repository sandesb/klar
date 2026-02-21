import Dialog from "./Dialog.jsx";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { formatLong } from "../calendar.jsx";

/**
 * Table dialog listing saved date ranges.
 * Props: open, onClose, ranges, onSelectRange(entry), onDelete(id)
 */
export default function SavedRangesDialog({ open, onClose, ranges, onSelectRange, onDelete }) {
  function confirmDelete(r) {
    toast.custom(
      (t) => (
        <div
          style={{
            background: "linear-gradient(180deg, #1a0e00 0%, #0d0805 100%)",
            border: "1px solid rgba(245,166,35,0.25)",
            borderRadius: "12px",
            padding: "14px 18px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            fontFamily: "'DM Mono', monospace",
            minWidth: "220px",
          }}
        >
          <div style={{ fontSize: "12px", color: "rgba(232,213,183,0.9)", marginBottom: "12px" }}>
            Delete &quot;{r.title}&quot;?
          </div>
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => {
                toast.dismiss(t.id);
              }}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "8px",
                padding: "6px 12px",
                color: "rgba(232,213,183,0.7)",
                fontSize: "11px",
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => {
                const title = r.title;
                onDelete?.(r.id);
                toast.dismiss(t.id);
                const capitalized = title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();
                toast.success(`'${capitalized}' deleted successfully`, { style: { fontFamily: "'DM Mono', monospace" } });
              }}
              style={{
                background: "rgba(200,80,80,0.25)",
                border: "1px solid rgba(200,80,80,0.5)",
                borderRadius: "8px",
                padding: "6px 12px",
                color: "rgba(255,220,220,0.95)",
                fontSize: "11px",
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              Yes
            </button>
          </div>
        </div>
      ),
      { duration: Infinity }
    );
  }

  const footer = null;
  const content =
    ranges.length === 0 ? (
      <div
        style={{
          padding: "24px 0",
          color: "rgba(232,213,183,0.4)",
          fontSize: "12px",
          fontFamily: "'DM Mono', monospace",
          textAlign: "center",
        }}
      >
        No saved ranges
      </div>
    ) : (
      <div
        style={{
          overflowX: "auto",
          overflowY: "auto",
          maxHeight: "60vh",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "'DM Mono', monospace",
            fontSize: "11px",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  borderBottom: "1px solid rgba(245,166,35,0.3)",
                  color: "rgba(245,166,35,0.8)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                S.N.
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  borderBottom: "1px solid rgba(245,166,35,0.3)",
                  color: "rgba(245,166,35,0.8)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Title
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  borderBottom: "1px solid rgba(245,166,35,0.3)",
                  color: "rgba(245,166,35,0.8)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Start
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  borderBottom: "1px solid rgba(245,166,35,0.3)",
                  color: "rgba(245,166,35,0.8)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                End
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  borderBottom: "1px solid rgba(245,166,35,0.3)",
                  color: "rgba(245,166,35,0.8)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Plus days
              </th>
              <th
                style={{
                  width: "36px",
                  padding: "10px 8px",
                  borderBottom: "1px solid rgba(245,166,35,0.3)",
                  color: "rgba(245,166,35,0.8)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                {" "}
              </th>
            </tr>
          </thead>
          <tbody>
            {ranges.map((r, i) => (
              <tr key={r.id}>
                <td
                  style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    color: "rgba(232,213,183,0.6)",
                  }}
                >
                  {i + 1}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onSelectRange?.(r)}
                    title="Load this range"
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      color: "#e8d5b7",
                      fontFamily: "inherit",
                      fontSize: "inherit",
                      textDecoration: "underline",
                      textDecorationColor: "rgba(245,166,35,0.4)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "rgba(245,166,35,0.95)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#e8d5b7";
                    }}
                  >
                    {r.title}
                  </button>
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    color: "rgba(232,213,183,0.85)",
                  }}
                >
                  {formatLong(new Date(r.start))}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    color: "rgba(232,213,183,0.85)",
                  }}
                >
                  {formatLong(new Date(r.end))}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    color: "rgba(232,213,183,0.85)",
                  }}
                >
                  {r.plusDays}
                </td>
                <td
                  style={{
                    padding: "10px 8px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    verticalAlign: "middle",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => confirmDelete(r)}
                    title="Delete"
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: "4px",
                      cursor: "pointer",
                      color: "rgba(232,213,183,0.4)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "rgba(200,80,80,0.9)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "rgba(232,213,183,0.4)";
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

  return (
    <Dialog open={open} onClose={onClose} title="Saved ranges" footer={footer}>
      <div style={{ minWidth: "320px", maxWidth: "90vw" }}>{content}</div>
    </Dialog>
  );
}
