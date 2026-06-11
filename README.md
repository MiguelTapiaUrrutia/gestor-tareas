# Mis Tareas

Gestor de tareas personal en JavaScript vanilla (ES Modules, sin dependencias).
Crear, completar, editar y eliminar tareas; prioridades, fechas de vencimiento,
búsqueda, filtros, ordenación, reordenamiento por arrastre, tema claro/oscuro y
perfil con avatar. Todo persiste en `localStorage`.

## Ejecutar

Los módulos ES no cargan con `file://`, así que hace falta un servidor local:

```bash
python -m http.server
# http://localhost:8000/index.html
```

## Estructura

```
index.html        Marcado de la app
tests.html        Runner de tests en el navegador (verde/rojo + resumen)
css/styles.css    Estilos (neo-brutalista)
js/app.js         Orquestador: estado, acciones y conexión de eventos
js/ui.js          Render, editor inline, modal, toasts, tema, parallax
js/logica.js      Lógica pura: filtro, búsqueda, orden, vencidas
js/fechas.js      Formateo de fechas
js/storage.js     Persistencia en localStorage (load/save/persist)
js/tests.js       Tests de caracterización de la lógica pura
```

## Tests

En el navegador: `http://localhost:8000/tests.html`. En consola:

```bash
node js/tests.js
```

## Limitaciones conocidas

- **El reordenamiento por arrastre no funciona en pantallas táctiles ni con
  teclado.** Usa la API HTML5 Drag and Drop (`dragstart`/`dragover`/`dragend`),
  que los navegadores móviles no disparan con gestos táctiles, y el asa de
  arrastre no ofrece ninguna alternativa de teclado (no hay forma de mover una
  tarea sin ratón). Mientras tanto, las ordenaciones automáticas (vencimiento,
  prioridad, recientes, A–Z) sí funcionan en cualquier dispositivo. Se abordará
  en la extensión del proyecto.
