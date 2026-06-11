/* ============================================================
   MIS TAREAS — Lógica pura (filtro, búsqueda, orden, vencidas)

   Todas las funciones son puras: reciben todo por parámetro,
   no tocan el DOM, ni localStorage, ni estado global.
   Las utilidades de fecha viven en fechas.js y se re-exportan
   aquí para que los tests de caracterización no cambien.
   ============================================================ */

import { todayISO } from './fechas.js';

export { fmtDue, todayISO } from './fechas.js';

export const PRIO_RANK = { alta: 0, media: 1, baja: 2 };

// Una tarea está vencida si tiene fecha, no está completada y la
// fecha es anterior a hoy. Si vence HOY, todavía NO está vencida.
export function isOverdue(t, hoy = todayISO()) {
  return Boolean(t.due && !t.done && t.due < hoy);
}

// ¿Se puede arrastrar para reordenar? Sólo en modo manual sin filtros ni búsqueda.
export function canDrag(filter, query, sortBy) {
  return sortBy === 'manual' && filter === 'todas' && query.trim() === '';
}

/* ---------- Comparadores de orden ---------- */

// Vencimiento ascendente; las tareas sin fecha van al final.
export function cmpDue(a, b) {
  return (a.due || '9999').localeCompare(b.due || '9999');
}

// alta < media < baja; sin prioridad cuenta como media.
export function cmpPriority(a, b) {
  return PRIO_RANK[a.priority || 'media'] - PRIO_RANK[b.priority || 'media'];
}

// Más recientes primero (created descendente).
export function cmpCreated(a, b) {
  return b.created - a.created;
}

// Alfabético en español, insensible a mayúsculas y tildes.
export function cmpAlpha(a, b) {
  return a.text.localeCompare(b.text, 'es', { sensitivity: 'base' });
}

/* ---------- Filtro + búsqueda + orden ---------- */

// Devuelve un array NUEVO con las tareas visibles según filtro de
// estado, texto de búsqueda y criterio de orden. 'manual' (o cualquier
// valor desconocido) conserva el orden original del array.
export function visibleTasks(tasks, filter, query, sortBy) {
  let data = tasks.slice();
  // Filtro de estado
  if (filter === 'pendientes') data = data.filter(t => !t.done);
  else if (filter === 'completadas') data = data.filter(t => t.done);
  // Búsqueda
  const q = query.trim().toLowerCase();
  if (q) data = data.filter(t => t.text.toLowerCase().includes(q));
  // Orden
  if (sortBy === 'due') data.sort(cmpDue);
  else if (sortBy === 'priority') data.sort(cmpPriority);
  else if (sortBy === 'created') data.sort(cmpCreated);
  else if (sortBy === 'alpha') data.sort(cmpAlpha);
  return data;
}
