/* ============================================================
   MIS TAREAS — Fechas
   Formateo y fecha local en ISO corto. Sin DOM ni estado.
   ============================================================ */

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// timestamp -> { d: '05', m: 'Ene', y: 2026 } para la fecha de creación
export function fmtDate(ts) {
  const d = new Date(ts);
  return { d: String(d.getDate()).padStart(2, '0'), m: MESES[d.getMonth()], y: d.getFullYear() };
}

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
