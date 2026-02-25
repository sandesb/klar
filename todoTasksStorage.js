import { supabaseSelect, supabaseUpsert } from "./supabaseClient.js";

const TABLE = "todo";

/** Key for a saved range + date: "rangeId:YYYY-MM-DD" */
export function todoKey(rangeId, dateKey) {
  return `${rangeId}:${dateKey}`;
}

/**
 * Load tasks for a given saved range and date.
 * @returns Promise<Array of { id, text, done }>
 */
export async function loadTodoTasks(rangeId, dateKey) {
  try {
    const key = todoKey(rangeId, dateKey);
    const rows = await supabaseSelect(TABLE, `id=eq.${key}`);
    if (!rows.length) return [];
    const data = rows[0].data;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Save tasks for a given saved range and date.
 * @param {string} rangeId - saved range id
 * @param {string} dateKey - YYYY-MM-DD
 * @param {Array<{ id: string, text: string, done: boolean }>} tasks
 */
export async function saveTodoTasks(rangeId, dateKey, tasks) {
  const key = todoKey(rangeId, dateKey);
  await supabaseUpsert(TABLE, { id: key, data: tasks });
}

/** Generate a simple unique id for a task */
export function createTaskId() {
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
