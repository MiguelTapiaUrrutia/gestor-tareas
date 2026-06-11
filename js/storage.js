/* ============================================================
   MIS TAREAS — Persistencia (localStorage)
   load/save serializan JSON; persist es el atajo para guardar
   la lista de tareas bajo su clave.
   ============================================================ */

export const LS = {
  tasks: 'mistareas.tasks',
  theme: 'mistareas.theme',
  profile: 'mistareas.profile',
  filter: 'mistareas.filter',
  sort: 'mistareas.sort',
};

export function load(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; }
  catch { return fallback; }
}

export function save(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

export function persist(tasks) {
  save(LS.tasks, tasks);
}
