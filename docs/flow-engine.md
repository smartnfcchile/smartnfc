# Motor de preguntas progresivas (F0)

Base técnica reutilizable para las landing conversacionales de Personas, Empresas y Locales.

## Piezas

| Archivo | Rol |
|---|---|
| `lib/flow/types.ts` | Tipos: preguntas `single`, `multi`, `number`, `text`, `info`; estado y acciones |
| `lib/flow/engine.ts` | Motor puro (sin React, red ni almacenamiento): ramificación (`next`), preguntas condicionales (`when`), opciones condicionales (`showIf`), validación, avance, retroceso, `goto` hacia pasos ya recorridos, progreso y **respuestas efectivas** (solo las del recorrido vigente y válidas) |
| `components/flow/useFlow.ts` | Une el motor con React y con el historial del navegador |
| `components/flow/FlowShell.tsx` | Barra (Atrás, progreso, salida visible), pantalla de pregunta, vista previa progresiva y resultado |
| `components/flow/QuestionScreen.tsx` | Una pregunta por pantalla, con controles nativos accesibles |
| `content/flows/*.ts` | Contenido de cada experiencia (separado del motor) |

## Privacidad

- Las respuestas viven solo en la memoria del navegador. No hay `fetch`, `localStorage` ni analítica de respuestas.
- La URL solo lleva el identificador del paso (`?paso=<id>`), nunca respuestas. Usa `window.history.pushState`, integrado con el router de Next 16 (ver `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`, "Native History API").
- Al recargar se pierde el avance (por diseño): el flujo vuelve al inicio.

## Accesibilidad

- Controles nativos (radio, checkbox, number, text) con `fieldset` asociado al título.
- Al cambiar de pantalla, el foco va al título nuevo (no en la carga inicial).
- El avance automático (`autoAdvance`) solo ocurre con clic o toque; con teclado, las flechas cambian la opción y Enter confirma.
- Errores con `role="alert"`; progreso con `role="progressbar"`; transiciones desactivadas con `prefers-reduced-motion`.

## Demo interna `/dev/flujo-demo`

Flujo **ficticio** (`content/flows/demo.ts`) para revisar el motor. No se enlaza desde el sitio y lleva `noindex`.

- **Desarrollo** (`next dev`): disponible en `http://localhost:3000/dev/flujo-demo`.
- **Producción** (`next build` + `next start`, Vercel): responde **404 por defecto**.
- **Habilitar solo en un entorno autorizado** (por ejemplo, un despliegue de vista previa interno): definir la variable `FLOW_DEMO_ENABLED=1` **al compilar**. La página se genera de forma estática durante `next build`, así que definirla solo en tiempo de ejecución no la habilita. Nunca definirla en el entorno de producción.
- Para quitarla definitivamente: borrar `app/dev/flujo-demo/`, `components/flow/demo/` y `content/flows/demo.ts` (las pruebas de `scripts/tests/flow-engine.test.ts` también usan `DEMO_FLOW`; ajustar esa importación).

## Pruebas

- `npm run test:flow`: pruebas unitarias del motor (ramificación, avance, retroceso, persistencia durante la navegación, descarte de respuestas que dejan de aplicar, validación, progreso, inmutabilidad).
- La interfaz se verificó con Playwright y axe (WCAG 2.1 AA) sobre la demo. Ese script de QA no forma parte del repositorio.

## Build y cliente Prisma

- Procedimiento oficial: `npm ci` y luego `npm run build` (`prisma generate && next build`). `prisma generate` descarga el motor de Prisma desde `binaries.prisma.sh`.
- En entornos sin acceso a ese dominio, `npm ci` deja en `node_modules/.prisma/client` un cliente **sin generar** (sin tipos ni enums). En ese caso `tsc` y `next build` fallan en archivos que no pertenecen a este bloque.
- Durante el desarrollo de F0 en la nube se usó, solo localmente y fuera de Git, un cliente generado en otro equipo para poder ejecutar `tsc`, pruebas y build. **No forma parte del repositorio ni del commit.**
- La reproducción del build oficial desde un entorno limpio debe confirmarse en un entorno con acceso a `binaries.prisma.sh` (Vercel, GitHub Actions o la laptop de desarrollo).
