import { jsonbinGet, jsonbinPut } from "./jsonbinClient.js";

const TODO_TASKS_BIN_ID = "699ea4c2d0ea881f40d7442d";

async function getStore() {
  try {
    const record = await jsonbinGet(TODO_TASKS_BIN_ID);
    if (record == null || typeof record !== "object" || Array.isArray(record)) return {};
    return record;
  } catch {
    return {};
  }
}

async function setStore(store) {
  await jsonbinPut(TODO_TASKS_BIN_ID, store);
}

/** Key for a saved range + date: "rangeId:YYYY-MM-DD" */
export function todoKey(rangeId, dateKey) {
  return `${rangeId}:${dateKey}`;
}

/**
 * Load tasks for a given saved range and date.
 * @returns Promise<Array of { id, text, done }>
 */
export async function loadTodoTasks(rangeId, dateKey) {
  const store = await getStore();
  const key = todoKey(rangeId, dateKey);
  const list = store[key];
  return Array.isArray(list) ? list : [];
}

/**
 * Save tasks for a given saved range and date.
 * @param {string} rangeId - saved range id
 * @param {string} dateKey - YYYY-MM-DD
 * @param {Array<{ id: string, text: string, done: boolean }>} tasks
 */
export async function saveTodoTasks(rangeId, dateKey, tasks) {
  const store = await getStore();
  store[todoKey(rangeId, dateKey)] = tasks;
  await setStore(store);
}

/** Generate a simple unique id for a task */
export function createTaskId() {
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
