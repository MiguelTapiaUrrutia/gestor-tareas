/* ============================================================
   MIS TAREAS — Lógica pura (extraída de app.js en la Fase 1)

   NOTA TEMPORAL: app.js es una IIFE clásica y todavía no puede
   importar este módulo sin convertirse en ES Module (eso es la
   Fase 2). Mientras tanto, estas funciones están DUPLICADAS:
   la copia original sigue viviendo dentro de app.js y esta es
   la versión pura y testeable. En la Fase 2, app.js pasará a
   importar de aquí y la duplicación desaparece.

   Todas las funciones son puras: reciben todo por parámetro,
   no tocan el DOM, ni localStorage, ni estado global.
   ============================================================ */

export const PRIO_RANK = { alta: 0, media: 1, baja: 2 };

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/* ---------- Fechas ---------- */

// 'YYYY-MM-DD' -> texto corto ('11 Jun'); '' -> ''
export function fmtDue(due) {
  if (!due) return '';
  const [y, m, d] = due.split('-').map(Number);
  return `${String(d).padStart(2, '0')} ${MESES[m - 1]}`;
}

// Fecha local en formato 'YYYY-MM-DD'. Acepta una fecha de
// referencia por parámetro para poder testearla sin depender del reloj.
export function todayISO(fecha = new Date()) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

// Una tarea está vencida si tiene fecha, no está completada y la
// fecha es anterior a hoy. Si vence HOY, todavía NO está vencida.
export function isOverdue(t, hoy = todayISO()) {
  return Boolean(t.due && !t.done && t.due < hoy);
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
