/* ============================================================
   MIS TAREAS — Lógica (Vanilla JS)
   ============================================================ */
(function () {
  'use strict';

  const LS = {
    tasks: 'mistareas.tasks',
    theme: 'mistareas.theme',
    profile: 'mistareas.profile',
    filter: 'mistareas.filter',
    sort: 'mistareas.sort',
  };

  /* ---------- Estado ---------- */
  let tasks = load(LS.tasks, []);
  let profile = load(LS.profile, { nombre: '', apellidos: '', avatar: '' });
  let filter = localStorage.getItem(LS.filter) || 'todas';
  let sortBy = localStorage.getItem(LS.sort) || 'manual';
  let query = '';

  const PRIO = { alta: 'Alta', media: 'Media', baja: 'Baja' };
  const PRIO_RANK = { alta: 0, media: 1, baja: 2 };

  /* ---------- Utilidades ---------- */
  function load(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; }
    catch { return fallback; }
  }
  function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
  function persist() { save(LS.tasks, tasks); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  function fmtDate(ts) {
    const d = new Date(ts);
    return { d: String(d.getDate()).padStart(2, '0'), m: MESES[d.getMonth()], y: d.getFullYear() };
  }
  // 'YYYY-MM-DD' -> texto corto
  function fmtDue(due) {
    if (!due) return '';
    const [y, m, d] = due.split('-').map(Number);
    return `${String(d).padStart(2, '0')} ${MESES[m - 1]}`;
  }
  function todayISO() {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  }
  function isOverdue(t) { return t.due && !t.done && t.due < todayISO(); }

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- Iconos SVG (trazo grueso, neo-brutalista) ---------- */
  const I = {
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

  /* ============================================================
     RENDER
     ============================================================ */
  const listEl = $('#list');
  const emptyEl = $('#empty');

  // ¿Se puede arrastrar para reordenar? Sólo en modo manual sin filtros ni búsqueda.
  function canDrag() { return sortBy === 'manual' && filter === 'todas' && query.trim() === ''; }

  function visibleTasks() {
    let data = tasks.slice();
    // Filtro de estado
    if (filter === 'pendientes') data = data.filter(t => !t.done);
    else if (filter === 'completadas') data = data.filter(t => t.done);
    // Búsqueda
    const q = query.trim().toLowerCase();
    if (q) data = data.filter(t => t.text.toLowerCase().includes(q));
    // Orden
    if (sortBy === 'due') {
      data.sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
    } else if (sortBy === 'priority') {
      data.sort((a, b) => PRIO_RANK[a.priority || 'media'] - PRIO_RANK[b.priority || 'media']);
    } else if (sortBy === 'created') {
      data.sort((a, b) => b.created - a.created);
    } else if (sortBy === 'alpha') {
      data.sort((a, b) => a.text.localeCompare(b.text, 'es', { sensitivity: 'base' }));
    }
    return data;
  }

  function renderTasks() {
    const data = visibleTasks();
    listEl.innerHTML = '';
    listEl.classList.toggle('no-drag', !canDrag());

    if (data.length === 0) {
      emptyEl.hidden = false;
      let msg;
      if (query.trim()) msg = `Sin resultados para «${query.trim()}».`;
      else msg = { todas: 'No tienes tareas todavía. ¡Crea la primera!', pendientes: 'No hay tareas pendientes. ¡Buen trabajo!', completadas: 'Aún no completas ninguna tarea.' }[filter];
      $('#emptyText').textContent = msg;
    } else {
      emptyEl.hidden = true;
    }

    const drag = canDrag();
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
    renderCounts();
    applyParallax();
  }

  function renderCounts() {
    const total = tasks.length;
    const done = tasks.filter(t => t.done).length;
    const pend = total - done;
    $('#cTodas').textContent = total;
    $('#cPend').textContent = pend;
    $('#cDone').textContent = done;
    $('#counter').innerHTML = `<b>${pend}</b> pendiente${pend === 1 ? '' : 's'} · <b>${done}</b> hecha${done === 1 ? '' : 's'}`;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ============================================================
     ACCIONES DE TAREAS
     ============================================================ */
  function addTask(text, priority, due) {
    text = text.trim();
    if (!text) { shake($('#newTask')); return; }
    tasks.unshift({ id: uid(), text, done: false, created: Date.now(), priority: priority || 'media', due: due || '' });
    persist();
    renderTasks();
    toast('Tarea creada', 'check');
  }

  function toggle(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    t.done = !t.done;
    persist();
    renderTasks();
    toast(t.done ? 'Tarea completada' : 'Marcada como pendiente', t.done ? 'check' : 'info');
  }

  function removeTask(id) {
    tasks = tasks.filter(x => x.id !== id);
    persist();
    renderTasks();
    toast('Tarea eliminada', 'trash');
  }

  function startEdit(li) {
    const id = li.dataset.id;
    const t = tasks.find(x => x.id === id);
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

    const save = () => {
      const val = input.value.trim();
      if (!val) { shake(input); return; }
      t.text = val;
      t.priority = body.querySelector('.js-prio').value;
      t.due = body.querySelector('.js-due').value;
      persist();
      renderTasks();
      toast('Tarea actualizada', 'edit');
    };
    body.querySelector('.js-save').addEventListener('click', save);
    body.querySelector('.js-cancel').addEventListener('click', () => renderTasks());
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); save(); }
      if (e.key === 'Escape') { e.preventDefault(); renderTasks(); }
    });
  }

  /* ---------- Delegación de eventos en la lista ---------- */
  listEl.addEventListener('click', e => {
    const li = e.target.closest('.task');
    if (!li) return;
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    const id = li.dataset.id;
    if (act === 'toggle') toggle(id);
    else if (act === 'delete') askDelete(id);
    else if (act === 'edit-start') startEdit(li);
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
    if (!handle || !canDrag()) { e.preventDefault(); return; }
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
    persist();
    dragLi = null;
    renderTasks();
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
    renderTasks();
  });
  $('#searchClear').addEventListener('click', () => {
    query = ''; searchInput.value = '';
    searchbar.classList.remove('has-text');
    renderTasks(); searchInput.focus();
  });

  /* ---------- Ordenar ---------- */
  const sortSel = $('#sort');
  sortSel.value = sortBy;
  sortSel.addEventListener('change', () => {
    sortBy = sortSel.value;
    localStorage.setItem(LS.sort, sortBy);
    renderTasks();
  });

  /* ---------- Filtros ---------- */
  $$('.chip').forEach(chip => chip.addEventListener('click', () => {
    filter = chip.dataset.filter;
    localStorage.setItem(LS.filter, filter);
    syncFilters();
    renderTasks();
  }));
  function syncFilters() {
    $$('.chip').forEach(c => {
      const on = c.dataset.filter === filter;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-pressed', on);
    });
  }

  /* ============================================================
     MODAL DE CONFIRMACIÓN (eliminar)
     ============================================================ */
  const modal = $('#modal');
  let pendingDelete = null;
  function askDelete(id) {
    const t = tasks.find(x => x.id === id);
    pendingDelete = id;
    $('#modalText').textContent = `Vas a eliminar «${t ? t.text : ''}». Esta acción no se puede deshacer.`;
    modal.classList.add('is-open');
    $('#modalConfirm').focus();
  }
  function closeModal() { modal.classList.remove('is-open'); pendingDelete = null; }
  $('#modalConfirm').addEventListener('click', () => { if (pendingDelete) removeTask(pendingDelete); closeModal(); });
  $('#modalCancel').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal(); });

  /* ============================================================
     TOASTS
     ============================================================ */
  const toastWrap = $('#toasts');
  function toast(msg, icon = 'info') {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `${I[icon] || I.info}<span>${escapeHtml(msg)}</span>`;
    toastWrap.appendChild(el);
    setTimeout(() => { el.classList.add('out'); el.addEventListener('animationend', () => el.remove()); }, 2200);
  }

  function shake(el) {
    el.style.animation = 'none';
    el.offsetHeight; // reflow
    el.style.borderColor = '#b23a1c';
    el.style.animation = 'pop .3s ease';
    setTimeout(() => { el.style.borderColor = ''; }, 600);
  }

  /* ============================================================
     TEMA CLARO / OSCURO
     ============================================================ */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = $('#themeBtn');
    btn.innerHTML = (theme === 'dark' ? I.sun : I.moon) + `<span>${theme === 'dark' ? 'Claro' : 'Oscuro'}</span>`;
    save(LS.theme, theme);
  }
  let theme = localStorage.getItem(LS.theme);
  if (!theme) theme = (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  else theme = JSON.parse(theme);
  $('#themeBtn').addEventListener('click', () => applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));

  /* ============================================================
     NAVEGACIÓN DE VISTAS
     ============================================================ */
  function showView(name) {
    $$('.view').forEach(v => v.classList.toggle('is-active', v.dataset.view === name));
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    if (name === 'settings') fillForm();
  }
  $('#settingsBtn').addEventListener('click', () => showView('settings'));
  $('#avatarBtn').addEventListener('click', () => showView('settings'));
  $('#backBtn').addEventListener('click', () => showView('tareas'));

  /* ============================================================
     PERFIL / SETTINGS
     ============================================================ */
  function initials() {
    const a = (profile.nombre || '').trim()[0] || '';
    const b = (profile.apellidos || '').trim()[0] || '';
    return (a + b).toUpperCase();
  }
  function avatarContent() {
    const ini = initials();
    return ini || I.user;
  }
  function renderAvatars() {
    const has = profile.avatar && profile.avatar.trim();
    const fallback = avatarContent();
    const img = has ? `<img src="${escapeHtml(profile.avatar)}" alt="Avatar" onerror="this.parentNode.innerHTML='${fallback.replace(/'/g, "\\'")}'">` : fallback;
    $('#avatarBtn').innerHTML = img;
    $('#pvAvatar').innerHTML = img;
    const full = [profile.nombre, profile.apellidos].filter(Boolean).join(' ') || 'Tu perfil';
    $('#pvName').textContent = full;
    $('#pvTag').textContent = profile.nombre ? '@' + (profile.nombre + (profile.apellidos ? '.' + profile.apellidos : '')).toLowerCase().replace(/\s+/g, '') : 'sin configurar';
    $('#greetName').textContent = profile.nombre ? `, ${profile.nombre}` : '';
  }
  function fillForm() {
    $('#fNombre').value = profile.nombre || '';
    $('#fApellidos').value = profile.apellidos || '';
    $('#fAvatar').value = profile.avatar || '';
  }
  // Vista previa en vivo
  ['fNombre', 'fApellidos', 'fAvatar'].forEach(id => {
    $('#' + id).addEventListener('input', () => {
      profile = { nombre: $('#fNombre').value, apellidos: $('#fApellidos').value, avatar: $('#fAvatar').value };
      renderAvatars();
    });
  });
  $('#profileForm').addEventListener('submit', e => {
    e.preventDefault();
    profile = { nombre: $('#fNombre').value.trim(), apellidos: $('#fApellidos').value.trim(), avatar: $('#fAvatar').value.trim() };
    save(LS.profile, profile);
    renderAvatars();
    toast('Perfil guardado', 'save');
  });

  /* ============================================================
     PARALLAX — bloques flotando sobre la textura
     ============================================================ */
  let ticking = false;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function applyParallax() {
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
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(() => { applyParallax(); ticking = false; }); ticking = true; }
  }, { passive: true });
  window.addEventListener('resize', applyParallax);

  /* ============================================================
     INIT
     ============================================================ */
  applyTheme(theme);
  syncFilters();
  renderAvatars();
  renderTasks();

  // Semilla de ejemplo en el primer uso
  if (tasks.length === 0 && !localStorage.getItem('mistareas.seeded')) {
    localStorage.setItem('mistareas.seeded', '1');
    const now = Date.now();
    const iso = (offsetDays) => {
      const d = new Date(now + offsetDays * 86400000);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    tasks = [
      { id: uid(), text: 'Enviar la propuesta al cliente', done: false, created: now - 3600000, priority: 'alta', due: iso(1) },
      { id: uid(), text: 'Revisar el tablero del proyecto', done: false, created: now - 86400000, priority: 'media', due: iso(-1) },
      { id: uid(), text: 'Comprar café y pan para la semana', done: false, created: now - 7200000, priority: 'baja', due: '' },
      { id: uid(), text: 'Agendar reunión de equipo', done: true, created: now - 172800000, priority: 'media', due: iso(-2) },
    ];
    persist();
    renderTasks();
  }
})();
