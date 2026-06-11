/* ============================================================
   MIS TAREAS — Orquestador
   Posee el estado, define las acciones y conecta los eventos.
   La persistencia vive en storage.js, la lógica pura en
   logica.js/fechas.js y todo el DOM en ui.js.
   ============================================================ */

import { LS, load, save, persist, loadTasks, GENERAL_ID } from './storage.js';
import { canDrag } from './logica.js';
import {
  $, $$, renderTasks, startEdit, askDelete, initModal,
  toast, shake, applyTheme, showView, renderAvatars, fillForm, initParallax,
} from './ui.js';

/* ---------- Estado ---------- */
let tasks = loadTasks(); // corre la migración v2 al cargar
let profile = load(LS.profile, { nombre: '', apellidos: '', avatar: '' });
let filter = localStorage.getItem(LS.filter) || 'todas';
let sortBy = localStorage.getItem(LS.sort) || 'manual';
let query = '';

function uid() { return crypto.randomUUID(); }

function render() { renderTasks({ tasks, filter, query, sortBy }); }

/* ============================================================
   ACCIONES DE TAREAS
   ============================================================ */
function addTask(text, priority, due, projectId) {
  text = text.trim();
  if (!text) { shake($('#newTask')); return; }
  tasks.unshift({ id: uid(), text, done: false, created: Date.now(), priority: priority || 'media', due: due || '', projectId: projectId || GENERAL_ID });
  persist(tasks);
  render();
  toast('Tarea creada', 'check');
}

function toggle(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  persist(tasks);
  render();
  toast(t.done ? 'Tarea completada' : 'Marcada como pendiente', t.done ? 'check' : 'info');
}

function removeTask(id) {
  tasks = tasks.filter(x => x.id !== id);
  persist(tasks);
  render();
  toast('Tarea eliminada', 'trash');
}

function editTask(li) {
  const t = tasks.find(x => x.id === li.dataset.id);
  if (!t) return;
  startEdit(li, t, {
    onSave: vals => {
      t.text = vals.text;
      t.priority = vals.priority;
      t.due = vals.due;
      persist(tasks);
      render();
      toast('Tarea actualizada', 'edit');
    },
    onCancel: render,
  });
}

/* ---------- Delegación de eventos en la lista ---------- */
const listEl = $('#list');

listEl.addEventListener('click', e => {
  const li = e.target.closest('.task');
  if (!li) return;
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const act = btn.dataset.act;
  const id = li.dataset.id;
  if (act === 'toggle') toggle(id);
  else if (act === 'delete') askDelete(id, tasks);
  else if (act === 'edit-start') editTask(li);
});
listEl.addEventListener('keydown', e => {
  if ((e.key === ' ' || e.key === 'Enter') && e.target.classList.contains('check')) {
    e.preventDefault();
    toggle(e.target.closest('.task').dataset.id);
  }
});

/* ---------- Arrastrar para reordenar (HTML5 DnD) ---------- */
let dragLi = null;
listEl.addEventListener('dragstart', e => {
  const handle = e.target.closest('.drag');
  if (!handle || !canDrag(filter, query, sortBy)) { e.preventDefault(); return; }
  dragLi = handle.closest('.task');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragLi.dataset.id);
  try { e.dataTransfer.setDragImage(dragLi, 20, 20); } catch (_) {}
  requestAnimationFrame(() => dragLi && dragLi.classList.add('dragging'));
});
listEl.addEventListener('dragover', e => {
  if (!dragLi) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const after = getDragAfter(e.clientY);
  if (after == null) { if (listEl.lastElementChild !== dragLi) listEl.appendChild(dragLi); }
  else if (after !== dragLi) listEl.insertBefore(dragLi, after);
});
listEl.addEventListener('drop', e => e.preventDefault());
listEl.addEventListener('dragend', () => {
  if (!dragLi) return;
  dragLi.classList.remove('dragging');
  const order = $$('.task', listEl).map(li => li.dataset.id);
  tasks.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  persist(tasks);
  dragLi = null;
  render();
  toast('Orden actualizado', 'drag');
});
function getDragAfter(y) {
  const els = $$('.task:not(.dragging)', listEl);
  let closest = null, closestOffset = -Infinity;
  for (const el of els) {
    const box = el.getBoundingClientRect();
    const offset = y - (box.top + box.height / 2);
    if (offset < 0 && offset > closestOffset) { closestOffset = offset; closest = el; }
  }
  return closest;
}

/* ---------- Crear ---------- */
$('#creatorForm').addEventListener('submit', e => {
  e.preventDefault();
  const input = $('#newTask');
  addTask(input.value, $('#newPrio').value, $('#newDue').value);
  input.value = '';
  $('#newDue').value = '';
  $('#newPrio').value = 'media';
  input.focus();
});

/* ---------- Búsqueda ---------- */
const searchInput = $('#search');
const searchbar = $('#searchbar');
searchInput.addEventListener('input', () => {
  query = searchInput.value;
  searchbar.classList.toggle('has-text', query.length > 0);
  render();
});
$('#searchClear').addEventListener('click', () => {
  query = ''; searchInput.value = '';
  searchbar.classList.remove('has-text');
  render(); searchInput.focus();
});

/* ---------- Ordenar ---------- */
const sortSel = $('#sort');
sortSel.value = sortBy;
sortSel.addEventListener('change', () => {
  sortBy = sortSel.value;
  localStorage.setItem(LS.sort, sortBy);
  render();
});

/* ---------- Filtros ---------- */
$$('.chip').forEach(chip => chip.addEventListener('click', () => {
  filter = chip.dataset.filter;
  localStorage.setItem(LS.filter, filter);
  syncFilters();
  render();
}));
function syncFilters() {
  $$('.chip').forEach(c => {
    const on = c.dataset.filter === filter;
    c.classList.toggle('is-active', on);
    c.setAttribute('aria-pressed', on);
  });
}

/* ---------- Modal de eliminar ---------- */
initModal(id => removeTask(id));

/* ---------- Tema ---------- */
// Una sola vía de lectura: load() (JSON + try/catch), simétrica con el
// save() que usa applyTheme. Sin tema guardado, manda la preferencia del SO.
let theme = load(LS.theme, null);
if (!theme) theme = (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
$('#themeBtn').addEventListener('click', () => applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));

/* ---------- Navegación de vistas ---------- */
function goView(name) {
  showView(name);
  if (name === 'settings') fillForm(profile);
}
$('#settingsBtn').addEventListener('click', () => goView('settings'));
$('#avatarBtn').addEventListener('click', () => goView('settings'));
$('#backBtn').addEventListener('click', () => goView('tareas'));

/* ---------- Perfil / settings ---------- */
// Vista previa en vivo
['fNombre', 'fApellidos', 'fAvatar'].forEach(id => {
  $('#' + id).addEventListener('input', () => {
    profile = { nombre: $('#fNombre').value, apellidos: $('#fApellidos').value, avatar: $('#fAvatar').value };
    renderAvatars(profile);
  });
});
$('#profileForm').addEventListener('submit', e => {
  e.preventDefault();
  profile = { nombre: $('#fNombre').value.trim(), apellidos: $('#fApellidos').value.trim(), avatar: $('#fAvatar').value.trim() };
  save(LS.profile, profile);
  renderAvatars(profile);
  toast('Perfil guardado', 'save');
});

/* ============================================================
   INIT
   ============================================================ */
applyTheme(theme);
syncFilters();
renderAvatars(profile);
render();
initParallax();

// Semilla de ejemplo en el primer uso
if (tasks.length === 0 && !localStorage.getItem('mistareas.seeded')) {
  localStorage.setItem('mistareas.seeded', '1');
  const now = Date.now();
  const iso = (offsetDays) => {
    const d = new Date(now + offsetDays * 86400000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  tasks = [
    { id: uid(), text: 'Enviar la propuesta al cliente', done: false, created: now - 3600000, priority: 'alta', due: iso(1), projectId: GENERAL_ID },
    { id: uid(), text: 'Revisar el tablero del proyecto', done: false, created: now - 86400000, priority: 'media', due: iso(-1), projectId: GENERAL_ID },
    { id: uid(), text: 'Comprar café y pan para la semana', done: false, created: now - 7200000, priority: 'baja', due: '', projectId: GENERAL_ID },
    { id: uid(), text: 'Agendar reunión de equipo', done: true, created: now - 172800000, priority: 'media', due: iso(-2), projectId: GENERAL_ID },
  ];
  persist(tasks);
  render();
}
