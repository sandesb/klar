import { useState, useEffect } from "react";
import { Plus, Check, X, Circle, CircleCheck, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import Dialog from "./Dialog.jsx";
import { loadTodoTasks, saveTodoTasks, createTaskId } from "../todoTasksStorage.js";

/**
 * Todo list dialog for a specific date in a saved range.
 * Props: open, onClose, rangeId, dateKey, dateLabel (e.g. "February 23")
 */
export default function TodoDialog({ open, onClose, rangeId, dateKey, dateLabel }) {
  const [tasks, setTasks] = useState([]);
  const [adding, setAdding] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");

  useEffect(() => {
    if (open && rangeId && dateKey) {
      loadTodoTasks(rangeId, dateKey).then(setTasks).catch(() => setTasks([]));
      setAdding(false);
      setNewTaskText("");
    }
  }, [open, rangeId, dateKey]);

  async function handleSaveNew() {
    const text = newTaskText.trim();
    if (!text) return;
    const next = [...tasks, { id: createTaskId(), text, done: false }];
    setTasks(next);
    await saveTodoTasks(rangeId, dateKey, next);
    setNewTaskText("");
    setAdding(false);
  }

  function handleCancelNew() {
    setAdding(false);
    setNewTaskText("");
  }

  async function handleToggleDone(taskId) {
    const next = tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t));
    setTasks(next);
    await saveTodoTasks(rangeId, dateKey, next);
  }

  async function handleDelete(task) {
    if (!task.done) {
      toast("Please finish the task first", { style: { fontFamily: "'DM Mono', monospace" } });
      return;
    }
    const next = tasks.filter((t) => t.id !== task.id);
    setTasks(next);
    await saveTodoTasks(rangeId, dateKey, next);
    toast.success("Task deleted", { style: { fontFamily: "'DM Mono', monospace" } });
  }

  if (!open) return null;

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    fontFamily: "'DM Mono', monospace",
    fontSize: "12px",
  };
  const cellStyle = {
    padding: "8px 10px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(232,213,183,0.9)",
    verticalAlign: "middle",
  };
  const buttonIcon = {
    background: "transparent",
    border: "none",
    padding: "4px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "rgba(232,213,183,0.7)",
  };

  return (
    <Dialog open={open} onClose={onClose} title={dateLabel ? `Tasks · ${dateLabel}` : "Tasks"}>
      <table style={tableStyle}>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td style={{ ...cellStyle, width: "36px" }}>
                <button
                  type="button"
                  onClick={() => handleToggleDone(task.id)}
                  title={task.done ? "Mark undone" : "Mark done"}
                  style={buttonIcon}
                  aria-label={task.done ? "Mark undone" : "Mark done"}
                >
                  {task.done ? (
                    <CircleCheck size={18} color="rgba(70,200,110,0.9)" />
                  ) : (
                    <Circle size={18} />
                  )}
                </button>
              </td>
              <td
                style={{
                  ...cellStyle,
                  textDecoration: task.done ? "line-through" : "none",
                  color: task.done ? "rgba(232,213,183,0.5)" : "rgba(232,213,183,0.9)",
                }}
              >
                {task.text}
              </td>
              <td style={{ ...cellStyle, width: "36px", textAlign: "right" }}>
                <button
                  type="button"
                  onClick={() => handleDelete(task)}
                  title={task.done ? "Delete task" : "Finish the task first to delete"}
                  style={{ ...buttonIcon, color: task.done ? "rgba(200,80,80,0.9)" : "rgba(232,213,183,0.35)" }}
                  aria-label="Delete task"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
          <tr>
            <td style={{ ...cellStyle, width: "36px" }}>
              <button
                type="button"
                onClick={() => setAdding(true)}
                title="Add task"
                style={buttonIcon}
                aria-label="Add task"
              >
                <Plus size={18} />
              </button>
            </td>
            <td style={cellStyle} colSpan={2}>
              {adding ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <input
                    type="text"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveNew();
                      if (e.key === "Escape") handleCancelNew();
                    }}
                    placeholder="New task…"
                    autoFocus
                    style={{
                      flex: "1",
                      minWidth: "120px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(245,166,35,0.3)",
                      borderRadius: "8px",
                      padding: "6px 10px",
                      color: "#e8d5b7",
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "12px",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveNew}
                    title="Save"
                    style={{ ...buttonIcon, color: "rgba(70,200,110,0.9)" }}
                    aria-label="Save"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelNew}
                    title="Cancel"
                    style={{ ...buttonIcon, color: "rgba(200,80,80,0.9)" }}
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
    </Dialog>
  );
}
