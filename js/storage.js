/* ============================================================
   MIS TAREAS — Persistencia (localStorage) y migración de esquema
   load/save serializan JSON; persist/persistProjects son los
   atajos para guardar cada colección bajo su clave.
   ============================================================ */

export const LS = {
  tasks: 'mistareas.tasks',
  theme: 'mistareas.theme',
  profile: 'mistareas.profile',
  filter: 'mistareas.filter',
  sort: 'mistareas.sort',
  projects: 'mistareas.projects',
  project: 'mistareas.project',
  schema: 'mistareas.schemaVersion',
};

export const SCHEMA_VERSION = 2;

// Id FIJO del proyecto por defecto: al ser una constante conocida (y no
// un id aleatorio), la migración puede asignarlo a las tareas viejas sin
// necesitar buscar ni crear antes el proyecto, y es estable entre
// dispositivos, recargas y versiones del código.
export const GENERAL_ID = 'general';

const GENERAL = { id: GENERAL_ID, nombre: 'General', color: '#6F7785' };

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

export function persistProjects(projects) {
  save(LS.projects, projects);
}

/* ============================================================
   MIGRACIÓN DE ESQUEMA (v1 → v2)
   v1: tareas sin projectId, sin proyectos.
   v2: projects con 'General' y toda tarea con projectId.
   migrateTasks/ensureGeneral son puras e IDEMPOTENTES:
   aplicarlas sobre datos ya migrados no cambia nada.
   ============================================================ */

// Toda tarea sin projectId pasa a 'general'. Devuelve un array nuevo;
// las tareas que ya tienen projectId se conservan tal cual.
export function migrateTasks(tasks) {
  return tasks.map(t => (t.projectId ? t : { ...t, projectId: GENERAL_ID }));
}

// Garantiza que 'General' exista (al frente). Devuelve un array nuevo
// sólo si falta; si ya está, devuelve el mismo.
export function ensureGeneral(projects) {
  return projects.some(p => p.id === GENERAL_ID) ? projects : [{ ...GENERAL }, ...projects];
}

// Corre al cargar. La guarda de versión evita reescribir localStorage en
// cada arranque; las migraciones en sí son idempotentes, así que correr
// esto de más nunca daña los datos.
export function migrate() {
  if (load(LS.schema, 1) >= SCHEMA_VERSION) return;
  save(LS.tasks, migrateTasks(load(LS.tasks, [])));
  save(LS.projects, ensureGeneral(load(LS.projects, [])));
  save(LS.schema, SCHEMA_VERSION);
}

/* ---------- Carga con migración ---------- */

export function loadTasks() {
  migrate();
  // Cinturón y tirantes: aunque la versión ya sea 2, normalizar otra vez
  // es gratis (idempotente) y cubre datos tocados a mano.
  return migrateTasks(load(LS.tasks, []));
}

export function loadProjects() {
  migrate();
  return ensureGeneral(load(LS.projects, []));
}
