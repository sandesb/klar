const STORAGE_KEY = "klary_todo_tasks";

function getStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function setStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/** Key for a saved range + date: "rangeId:YYYY-MM-DD" */
export function todoKey(rangeId, dateKey) {
  return `${rangeId}:${dateKey}`;
}

/**
 * Load tasks for a given saved range and date.
 * @returns Array of { id, text, done }
 */
export function loadTodoTasks(rangeId, dateKey) {
  const store = getStore();
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
export function saveTodoTasks(rangeId, dateKey, tasks) {
  const store = getStore();
  store[todoKey(rangeId, dateKey)] = tasks;
  setStore(store);
}

/** Generate a simple unique id for a task */
export function createTaskId() {
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
