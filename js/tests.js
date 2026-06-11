/* ============================================================
   TESTS DE CARACTERIZACIÓN — js/logica.js
   Red de seguridad para el refactor: capturan el comportamiento
   ACTUAL del monolito (app.js) tal cual es, no el ideal.

   Funciona en navegador (tests.html, verde/rojo + resumen)
   y también en Node: `node js/tests.js` (sale con código 1 si falla).
   ============================================================ */

import {
  visibleTasks, isOverdue, fmtDue, todayISO, cmpDue, cmpPriority, cmpCreated, cmpAlpha,
  canDrag, reassignProject, isDuplicateProjectName,
} from './logica.js';
import { migrateTasks, ensureGeneral, GENERAL_ID } from './storage.js';

/* ---------- Mini framework de aserciones ---------- */
const resultados = [];

function test(nombre, fn) {
  try {
    fn();
    resultados.push({ nombre, ok: true });
  } catch (e) {
    resultados.push({ nombre, ok: false, error: e.message });
  }
}

function assert(cond, msg = 'la condición es falsa') {
  if (!cond) throw new Error(msg);
}

function assertEq(actual, esperado, msg = '') {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(esperado);
  if (a !== e) throw new Error(`${msg}${msg ? ' — ' : ''}esperado ${e}, obtenido ${a}`);
}

/* ---------- Datos de prueba ---------- */
// Fábrica de tareas con la misma forma que usa app.js
let seq = 0;
function tarea(extra = {}) {
  seq += 1;
  return { id: 't' + seq, text: 'Tarea ' + seq, done: false, created: seq, priority: 'media', due: '', ...extra };
}

const HOY = '2026-06-11';

function ids(arr) { return arr.map(t => t.id); }

/* ============================================================
   FILTROS
   ============================================================ */
test('filtro "todas" devuelve todas las tareas', () => {
  const ts = [tarea(), tarea({ done: true }), tarea()];
  assertEq(visibleTasks(ts, 'todas', '', 'manual').length, 3);
});

test('filtro "pendientes" devuelve sólo las no completadas', () => {
  const a = tarea(); const b = tarea({ done: true }); const c = tarea();
  assertEq(ids(visibleTasks([a, b, c], 'pendientes', '', 'manual')), [a.id, c.id]);
});

test('filtro "completadas" devuelve sólo las completadas', () => {
  const a = tarea(); const b = tarea({ done: true }); const c = tarea({ done: true });
  assertEq(ids(visibleTasks([a, b, c], 'completadas', '', 'manual')), [b.id, c.id]);
});

/* ============================================================
   BÚSQUEDA
   ============================================================ */
test('búsqueda con texto: coincide sin distinguir mayúsculas', () => {
  const a = tarea({ text: 'Enviar INFORME mensual' });
  const b = tarea({ text: 'Comprar café' });
  const c = tarea({ text: 'revisar informe de gastos' });
  assertEq(ids(visibleTasks([a, b, c], 'todas', 'informe', 'manual')), [a.id, c.id]);
});

test('búsqueda vacía o sólo espacios no filtra nada', () => {
  const ts = [tarea(), tarea(), tarea()];
  assertEq(visibleTasks(ts, 'todas', '', 'manual').length, 3);
  assertEq(visibleTasks(ts, 'todas', '   ', 'manual').length, 3);
});

/* ============================================================
   ORDEN
   ============================================================ */
test('orden "due": ascendente y las tareas sin fecha al final', () => {
  const sinFecha = tarea({ due: '' });
  const tarde = tarea({ due: '2026-06-20' });
  const pronto = tarea({ due: '2026-06-12' });
  assertEq(ids(visibleTasks([sinFecha, tarde, pronto], 'todas', '', 'due')), [pronto.id, tarde.id, sinFecha.id]);
});

test('orden "priority": alta < media < baja, y sin prioridad cuenta como media', () => {
  const baja = tarea({ priority: 'baja' });
  const sinPrio = tarea({ priority: undefined });
  const alta = tarea({ priority: 'alta' });
  const media = tarea({ priority: 'media' });
  // sinPrio va antes que media porque empatan en rango y el orden es estable
  assertEq(ids(visibleTasks([baja, sinPrio, alta, media], 'todas', '', 'priority')), [alta.id, sinPrio.id, media.id, baja.id]);
});

test('orden "created": más recientes primero (descendente)', () => {
  const vieja = tarea({ created: 1000 });
  const nueva = tarea({ created: 3000 });
  const media = tarea({ created: 2000 });
  assertEq(ids(visibleTasks([vieja, nueva, media], 'todas', '', 'created')), [nueva.id, media.id, vieja.id]);
});

test('orden "alpha": insensible a tildes y mayúsculas, colación española', () => {
  const arbol = tarea({ text: 'árbol' });
  const casa = tarea({ text: 'Casa' });
  const abeja = tarea({ text: 'abeja' });
  const nu = tarea({ text: 'Ñu' });
  // abeja < árbol (la tilde no cuenta), Casa < Ñu (ñ va tras la n)
  assertEq(ids(visibleTasks([nu, arbol, casa, abeja], 'todas', '', 'alpha')), [abeja.id, arbol.id, casa.id, nu.id]);
});

test('orden "manual" conserva el orden original del array', () => {
  const a = tarea(); const b = tarea(); const c = tarea();
  assertEq(ids(visibleTasks([b, c, a], 'todas', '', 'manual')), [b.id, c.id, a.id]);
});

test('visibleTasks no muta el array original al ordenar', () => {
  const a = tarea({ text: 'zeta' }); const b = tarea({ text: 'alfa' });
  const original = [a, b];
  visibleTasks(original, 'todas', '', 'alpha');
  assertEq(ids(original), [a.id, b.id], 'el array de entrada cambió');
});

/* ============================================================
   isOverdue — bordes
   ============================================================ */
test('isOverdue: una tarea que vence HOY no está vencida', () => {
  assert(!isOverdue(tarea({ due: HOY }), HOY));
});

test('isOverdue: vencida ayer y pendiente sí está vencida', () => {
  assert(isOverdue(tarea({ due: '2026-06-10' }), HOY));
});

test('isOverdue: una tarea completada nunca está vencida', () => {
  assert(!isOverdue(tarea({ due: '2026-06-01', done: true }), HOY));
});

test('isOverdue: sin fecha de vencimiento no está vencida', () => {
  assert(!isOverdue(tarea({ due: '' }), HOY));
});

/* ============================================================
   FECHAS
   ============================================================ */
test('fmtDue: formatea "YYYY-MM-DD" como "DD Mes" con cero a la izquierda', () => {
  assertEq(fmtDue('2026-06-11'), '11 Jun');
  assertEq(fmtDue('2026-01-05'), '05 Ene');
});

test('fmtDue: cadena vacía devuelve cadena vacía', () => {
  assertEq(fmtDue(''), '');
});

test('todayISO: formato YYYY-MM-DD con relleno de ceros', () => {
  assertEq(todayISO(new Date(2026, 0, 5)), '2026-01-05');
  assertEq(todayISO(new Date(2026, 11, 25)), '2026-12-25');
});

/* ============================================================
   COMBINACIONES filtro + búsqueda + orden
   ============================================================ */
test('combinación: pendientes + búsqueda + orden por vencimiento', () => {
  const a = tarea({ text: 'Informe anual', due: '2026-06-20' });
  const b = tarea({ text: 'Informe mensual', due: '2026-06-12' });
  const c = tarea({ text: 'Informe viejo', due: '2026-06-01', done: true }); // fuera: completada
  const d = tarea({ text: 'Comprar café', due: '2026-06-02' });              // fuera: no coincide
  const e = tarea({ text: 'informe sin fecha', due: '' });                   // al final: sin fecha
  assertEq(ids(visibleTasks([a, b, c, d, e], 'pendientes', 'informe', 'due')), [b.id, a.id, e.id]);
});

test('combinación: completadas + búsqueda + orden alfabético', () => {
  const a = tarea({ text: 'Zanahorias', done: true });
  const b = tarea({ text: 'ánimo al equipo', done: true });
  const c = tarea({ text: 'Avena', done: false }); // fuera: pendiente
  assertEq(ids(visibleTasks([a, b, c], 'completadas', 'a', 'alpha')), [b.id, a.id]);
});

/* ============================================================
   PROYECTOS — visibleTasks, reasignación, canDrag, duplicados
   ============================================================ */
test('visibleTasks: filtra por projectId', () => {
  const a = tarea({ projectId: 'sence' });
  const b = tarea({ projectId: GENERAL_ID });
  const c = tarea({ projectId: 'sence' });
  assertEq(ids(visibleTasks([a, b, c], 'todas', '', 'manual', 'sence')), [a.id, c.id]);
});

test('visibleTasks: con "todos" no filtra por proyecto', () => {
  const ts = [tarea({ projectId: 'sence' }), tarea({ projectId: GENERAL_ID })];
  assertEq(visibleTasks(ts, 'todas', '', 'manual', 'todos').length, 2);
});

test('visibleTasks: sin el 5º parámetro se comporta como "todos" (compatibilidad)', () => {
  const ts = [tarea({ projectId: 'sence' }), tarea({ projectId: GENERAL_ID })];
  assertEq(visibleTasks(ts, 'todas', '', 'manual').length, 2);
});

test('combinación: proyecto + pendientes + búsqueda + orden por vencimiento', () => {
  const a = tarea({ text: 'Informe final', projectId: 'sence', due: '2026-06-20' });
  const b = tarea({ text: 'Informe parcial', projectId: 'sence', due: '2026-06-12' });
  const c = tarea({ text: 'Informe ajeno', projectId: GENERAL_ID, due: '2026-06-01' }); // fuera: otro proyecto
  const d = tarea({ text: 'Informe hecho', projectId: 'sence', done: true });           // fuera: completada
  const e = tarea({ text: 'Comprar café', projectId: 'sence' });                        // fuera: no coincide
  assertEq(ids(visibleTasks([a, b, c, d, e], 'pendientes', 'informe', 'due', 'sence')), [b.id, a.id]);
});

test('reassignProject: las tareas del proyecto eliminado pasan al destino', () => {
  const a = tarea({ projectId: 'sence' });
  const b = tarea({ projectId: GENERAL_ID });
  const res = reassignProject([a, b], 'sence', GENERAL_ID);
  assertEq(res.map(t => t.projectId), [GENERAL_ID, GENERAL_ID]);
});

test('reassignProject: las demás tareas no se tocan y no muta el original', () => {
  const a = tarea({ projectId: 'sence' });
  const b = tarea({ projectId: 'otro' });
  const res = reassignProject([a, b], 'sence', GENERAL_ID);
  assert(res[1] === b, 'la tarea de otro proyecto debería ser el mismo objeto');
  assertEq(a.projectId, 'sence', 'la tarea original fue mutada');
});

test('canDrag: false en la vista "todos" aunque sea manual sin filtros', () => {
  assert(!canDrag('todas', '', 'manual', 'todos'));
});

test('canDrag: true en proyecto específico con manual, filtro "todas" y sin búsqueda', () => {
  assert(canDrag('todas', '', 'manual', 'sence'));
  assert(!canDrag('pendientes', '', 'manual', 'sence'));
  assert(!canDrag('todas', 'caf', 'manual', 'sence'));
  assert(!canDrag('todas', '', 'due', 'sence'));
});

test('nombre duplicado: detecta ignorando tildes, mayúsculas y espacios', () => {
  const projects = [{ id: 'x', nombre: 'Currículum', color: '#1C7ED6' }];
  assert(isDuplicateProjectName(projects, '  curriculum '));
  assert(isDuplicateProjectName(projects, 'CURRÍCULUM'));
  assert(!isDuplicateProjectName(projects, 'Currículum 2'));
});

/* ============================================================
   MIGRACIÓN v1 → v2 (proyectos)
   ============================================================ */
test('migración: una tarea sin projectId recibe "general"', () => {
  const vieja = tarea(); delete vieja.projectId;
  const [m] = migrateTasks([vieja]);
  assertEq(m.projectId, GENERAL_ID);
});

test('migración: una tarea con projectId no se toca', () => {
  const t = tarea({ projectId: 'curso-sence' });
  const [m] = migrateTasks([t]);
  assertEq(m.projectId, 'curso-sence');
  assert(m === t, 'debería conservar el mismo objeto');
});

test('migración: es idempotente (correrla dos veces == una vez)', () => {
  const vieja = tarea(); delete vieja.projectId;
  const unaVez = migrateTasks([vieja, tarea({ projectId: 'x' })]);
  const dosVeces = migrateTasks(unaVez);
  assertEq(dosVeces, unaVez);
});

test('migración: no muta el array original', () => {
  const vieja = tarea(); delete vieja.projectId;
  const original = [vieja];
  migrateTasks(original);
  assert(!('projectId' in original[0]), 'la tarea original fue mutada');
});

test('ensureGeneral: crea "General" si falta y es idempotente', () => {
  const conGeneral = ensureGeneral([]);
  assertEq(conGeneral[0].id, GENERAL_ID);
  assert(ensureGeneral(conGeneral) === conGeneral, 'no debería recrear el array si General ya existe');
});

/* ============================================================
   RESULTADOS — navegador (verde/rojo) o consola Node
   ============================================================ */
const pasan = resultados.filter(r => r.ok).length;
const total = resultados.length;

if (typeof document !== 'undefined') {
  const lista = document.querySelector('#resultados');
  for (const r of resultados) {
    const li = document.createElement('li');
    li.className = r.ok ? 'pass' : 'fail';
    li.textContent = (r.ok ? '✔ ' : '✘ ') + r.nombre + (r.ok ? '' : ' — ' + r.error);
    lista.appendChild(li);
  }
  const resumen = document.querySelector('#resumen');
  resumen.textContent = `${pasan} / ${total} tests pasan`;
  resumen.className = pasan === total ? 'ok' : 'ko';
} else {
  for (const r of resultados) {
    console.log((r.ok ? '  PASS ' : '  FAIL ') + r.nombre + (r.ok ? '' : ' — ' + r.error));
  }
  console.log(`\n${pasan} / ${total} tests pasan`);
  if (pasan !== total) process.exit(1);
}
