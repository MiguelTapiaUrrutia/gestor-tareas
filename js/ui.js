/* ============================================================
   MIS TAREAS — UI (render, toasts, modal, tema, parallax)
   No posee estado de la aplicación: recibe el estado por
   parámetro y delega las acciones en callbacks de app.js.
   ============================================================ */

import { visibleTasks, isOverdue, canDrag } from './logica.js';
import { fmtDate, fmtDue } from './fechas.js';
import { LS, save } from './storage.js';

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];

export const PRIO = { alta: 'Alta', media: 'Media', baja: 'Baja' };

/* ---------- Iconos SVG (trazo grueso, neo-brutalista) ---------- */
export const I = {
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="square" stroke-linejoin="miter"><path d="M4 12l5 5L20 6"/></svg>',
  edit:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"><path d="M4 20h16M4 20v-4L16 4l4 4L8 20H4z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  plus:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="square"><path d="M12 5v14M5 12h14"/></svg>',
  save:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"><path d="M5 4h12l3 3v13H5zM8 4v6h7M8 20v-6h8v6"/></svg>',
  cog:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square"><circle cx="12" cy="12" r="3.4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>',
  sun:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.5 4.5l1.8 1.8M17.7 17.7l1.8 1.8M19.5 4.5l-1.8 1.8M6.3 17.7l-1.8 1.8"/></svg>',
  moon:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square" stroke-linejoin="round"><path d="M20 14.5A8 8 0 019.5 4 7.5 7.5 0 1020 14.5z"/></svg>',
  back:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square"><path d="M14 5l-7 7 7 7M7 12h13"/></svg>',
  box:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square" stroke-linejoin="round"><path d="M3 8l9-5 9 5v8l-9 5-9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>',
  info:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"><path d="M12 11v6M12 7v.5"/><circle cx="12" cy="12" r="9"/></svg>',
  user:  '<svg class="ico-user" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20a7.5 7.5 0 0115 0"/></svg>',
  drag:  '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.6"/><circle cx="15" cy="5" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="19" r="1.6"/><circle cx="15" cy="19" r="1.6"/></svg>',
  flag:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square" stroke-linejoin="round"><path d="M5 21V4h11l-2 4 2 4H5"/></svg>',
};

export function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ============================================================
   RENDER
   ============================================================ */
const listEl = $('#list');
const emptyEl = $('#empty');

export function renderTasks({ tasks, filter, query, sortBy }) {
  const data = visibleTasks(tasks, filter, query, sortBy);
  listEl.innerHTML = '';
  listEl.classList.toggle('no-drag', !canDrag(filter, query, sortBy));

  if (data.length === 0) {
    emptyEl.hidden = false;
    let msg;
    if (query.trim()) msg = `Sin resultados para «${query.trim()}».`;
    else msg = { todas: 'No tienes tareas todavía. ¡Crea la primera!', pendientes: 'No hay tareas pendientes. ¡Buen trabajo!', completadas: 'Aún no completas ninguna tarea.' }[filter];
    $('#emptyText').textContent = msg;
  } else {
    emptyEl.hidden = true;
  }

  const drag = canDrag(filter, query, sortBy);
  for (const t of data) {
    const f = fmtDate(t.created);
    const prio = t.priority || 'media';
    const overdue = isOverdue(t);
    const li = document.createElement('li');
    li.className = 'task parallax' + (t.done ? ' done' : '');
    li.dataset.id = t.id;
    li.dataset.speed = (0.02 + (Math.random() * 0.03)).toFixed(3);

    const dueBadge = t.due
      ? `<span class="task__badge ${overdue ? 'task__badge--overdue' : 'task__badge--due'}"><span class="dot"></span>${overdue ? 'Venció ' : 'Vence '}${fmtDue(t.due)}</span>`
      : '';

    li.innerHTML = `
      <button class="drag" aria-label="Arrastrar para reordenar" draggable="${drag}" title="${drag ? 'Arrastra para reordenar' : 'Cambia a orden Manual para reordenar'}">${I.drag}</button>
      <button class="check" role="checkbox" aria-checked="${t.done}" aria-label="Marcar como completada" data-act="toggle">${I.check}</button>
      <div class="task__body">
        <div class="task__title" data-act="edit-start">${escapeHtml(t.text)}</div>
        <div class="task__meta">
          <span class="task__badge ${t.done ? 'task__badge--done' : 'task__badge--pend'}">${t.done ? 'Completada' : 'Pendiente'}</span>
          <span class="task__badge task__badge--prio-${prio}">${I.flag}${PRIO[prio]}</span>
          ${dueBadge}
        </div>
      </div>
      <div class="task__side">
        <div class="task__date"><span>Creada</span>${f.d} ${f.m} ${f.y}</div>
        <div class="task__actions">
          <button class="act act--edit" aria-label="Editar tarea" data-act="edit-start">${I.edit}</button>
          <button class="act act--del" aria-label="Eliminar tarea" data-act="delete">${I.trash}</button>
        </div>
      </div>`;
    listEl.appendChild(li);
  }
  renderCounts(tasks);
  applyParallax();
}

function renderCounts(tasks) {
  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  const pend = total - done;
  $('#cTodas').textContent = total;
  $('#cPend').textContent = pend;
  $('#cDone').textContent = done;
  $('#counter').innerHTML = `<b>${pend}</b> pendiente${pend === 1 ? '' : 's'} · <b>${done}</b> hecha${done === 1 ? '' : 's'}`;
}

/* ============================================================
   EDITOR INLINE
   onSave recibe { text, priority, due } ya validados;
   onCancel restaura la vista (app.js decide cómo).
   ============================================================ */
export function startEdit(li, t, { onSave, onCancel }) {
  if (!t || li.querySelector('.task__editor')) return;
  const body = li.querySelector('.task__body');
  li.classList.add('editing');
  const prio = t.priority || 'media';
  const opts = ['alta', 'media', 'baja'].map(p => `<option value="${p}"${p === prio ? ' selected' : ''}>${PRIO[p]}</option>`).join('');
  body.innerHTML = `
    <input class="task__edit" value="${escapeHtml(t.text)}" aria-label="Editar texto de la tarea" maxlength="160">
    <div class="editor__row">
      <div class="opt">
        <label class="label">Prioridad</label>
        <div class="select-wrap"><select class="field field--sm js-prio">${opts}</select></div>
      </div>
      <div class="opt">
        <label class="label">Vencimiento</label>
        <input class="field field--sm js-due" type="date" value="${t.due || ''}">
      </div>
    </div>
    <div class="editor__actions">
      <button class="btn btn--primary btn--xs js-save" type="button">${I.save}Guardar</button>
      <button class="btn btn--ghost btn--xs js-cancel" type="button">Cancelar</button>
    </div>`;

  const input = body.querySelector('.task__edit');
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);

  const doSave = () => {
    const val = input.value.trim();
    if (!val) { shake(input); return; }
    onSave({ text: val, priority: body.querySelector('.js-prio').value, due: body.querySelector('.js-due').value });
  };
  body.querySelector('.js-save').addEventListener('click', doSave);
  body.querySelector('.js-cancel').addEventListener('click', onCancel);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); doSave(); }
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
  });
}

/* ============================================================
   MODAL DE CONFIRMACIÓN (eliminar)
   ============================================================ */
const modal = $('#modal');
let pendingDelete = null;

export function askDelete(id, tasks) {
  const t = tasks.find(x => x.id === id);
  pendingDelete = id;
  $('#modalText').textContent = `Vas a eliminar «${t ? t.text : ''}». Esta acción no se puede deshacer.`;
  modal.classList.add('is-open');
  $('#modalConfirm').focus();
}

function closeModal() { modal.classList.remove('is-open'); pendingDelete = null; }

export function initModal(onConfirm) {
  $('#modalConfirm').addEventListener('click', () => { if (pendingDelete) onConfirm(pendingDelete); closeModal(); });
  $('#modalCancel').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal(); });
}

/* ============================================================
   TOASTS
   ============================================================ */
const toastWrap = $('#toasts');

export function toast(msg, icon = 'info') {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${I[icon] || I.info}<span>${escapeHtml(msg)}</span>`;
  toastWrap.appendChild(el);
  setTimeout(() => { el.classList.add('out'); el.addEventListener('animationend', () => el.remove()); }, 2200);
}

export function shake(el) {
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.borderColor = '#b23a1c';
  el.style.animation = 'pop .3s ease';
  setTimeout(() => { el.style.borderColor = ''; }, 600);
}

/* ============================================================
   TEMA CLARO / OSCURO
   ============================================================ */
export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = $('#themeBtn');
  btn.innerHTML = (theme === 'dark' ? I.sun : I.moon) + `<span>${theme === 'dark' ? 'Claro' : 'Oscuro'}</span>`;
  save(LS.theme, theme);
}

/* ============================================================
   NAVEGACIÓN DE VISTAS
   ============================================================ */
export function showView(name) {
  $$('.view').forEach(v => v.classList.toggle('is-active', v.dataset.view === name));
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

/* ============================================================
   PERFIL / AVATARES
   ============================================================ */
function initials(profile) {
  const a = (profile.nombre || '').trim()[0] || '';
  const b = (profile.apellidos || '').trim()[0] || '';
  return (a + b).toUpperCase();
}

// Pinta la imagen del avatar en un contenedor; si la URL falla,
// lo sustituye por el fallback (iniciales o icono de usuario).
function setAvatar(el, url, fallback) {
  if (!url) { el.innerHTML = fallback; return; }
  const img = document.createElement('img');
  img.alt = 'Avatar';
  img.addEventListener('error', () => { el.innerHTML = fallback; });
  img.src = url;
  el.innerHTML = '';
  el.appendChild(img);
}

export function renderAvatars(profile) {
  const has = profile.avatar && profile.avatar.trim();
  const fallback = initials(profile) || I.user;
  const url = has ? profile.avatar : '';
  setAvatar($('#avatarBtn'), url, fallback);
  setAvatar($('#pvAvatar'), url, fallback);
  const full = [profile.nombre, profile.apellidos].filter(Boolean).join(' ') || 'Tu perfil';
  $('#pvName').textContent = full;
  $('#pvTag').textContent = profile.nombre ? '@' + (profile.nombre + (profile.apellidos ? '.' + profile.apellidos : '')).toLowerCase().replace(/\s+/g, '') : 'sin configurar';
  $('#greetName').textContent = profile.nombre ? `, ${profile.nombre}` : '';
}

export function fillForm(profile) {
  $('#fNombre').value = profile.nombre || '';
  $('#fApellidos').value = profile.apellidos || '';
  $('#fAvatar').value = profile.avatar || '';
}

/* ============================================================
   PARALLAX — bloques flotando sobre la textura
   ============================================================ */
let ticking = false;
const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function applyParallax() {
  if (reduce) return;
  const vh = window.innerHeight;
  $$('.parallax').forEach(el => {
    const r = el.getBoundingClientRect();
    const center = r.top + r.height / 2;
    const off = (center - vh / 2) / vh;       // -1 .. 1
    const speed = parseFloat(el.dataset.speed || 0.03);
    el.style.transform = `translateY(${(-off * speed * 100).toFixed(2)}px)`;
  });
}

export function initParallax() {
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(() => { applyParallax(); ticking = false; }); ticking = true; }
  }, { passive: true });
  window.addEventListener('resize', applyParallax);
}
