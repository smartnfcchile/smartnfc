@AGENTS.md

# SmartNFC - Instrucciones permanentes para Claude Code

## Reglas de inicio

Antes de modificar codigo:

1. Leer `AGENTS.md` y este archivo.
2. Revisar `git status`, rama actual y commits recientes.
3. Leer la documentacion relacionada con el bloque afectado.
4. Inspeccionar la implementacion existente.
5. Entender el comportamiento actual antes de proponer cambios.

No reinterpretar silenciosamente decisiones comerciales documentadas. Si existe una contradiccion, explicarla antes de modificar comportamiento.

## Producto y stack

SmartNFC es una plataforma SaaS multiempresa para perfiles digitales, tarjetas fisicas NFC, QR, CRM, metricas, equipos, SmartNFC Local, Puntos Inteligentes, campanas y administracion Superadmin.

Stack principal: Next.js, React, TypeScript, Prisma, PostgreSQL, NextAuth, Vercel, Neon y Resend.

Revisar `package.json` para conocer las versiones reales.

Seguir las instrucciones Next.js de `AGENTS.md`.

En Windows preferir `npm.cmd` y `npx.cmd`.

No modificar PowerShell ExecutionPolicy como solucion a problemas de ejecucion.

## Git

Git es la fuente de verdad.

Nunca borrar, resetear, limpiar o sobrescribir cambios existentes sin autorizacion.

No usar `git reset --hard`, `git clean` ni force push salvo instruccion explicita.

No hacer automaticamente:

- commit
- push
- pull request
- merge
- deploy

Estas acciones requieren aprobacion del usuario.

No mezclar cambios no relacionados dentro del mismo bloque.

## Produccion y datos

REGLA CRITICA:

No utilizar Neon ni ninguna base de produccion para desarrollo, pruebas, migraciones experimentales o backfills.

Las pruebas que requieren PostgreSQL deben utilizar una base desechable.

Nunca:

- ejecutar migraciones productivas sin aprobacion;
- ejecutar backfills sobre produccion;
- borrar datos productivos;
- modificar o revelar secretos;
- introducir secretos en codigo, documentacion, fixtures o commits.

Antes de una migracion real evaluar version PostgreSQL, volumen de datos, bloqueos, compatibilidad y rollback.

## Arquitectura comercial

SmartNFC separa:

Producto fisico -> Derecho/Licencia -> Capabilities -> Limits

La autorizacion debe resolverse mediante la capa central de entitlements.

Funciones centrales:

- `getCompanyEntitlements(companyId)`
- `hasCapability(companyId, capability)`
- `getEntitlementLimit(companyId, limit)`

No introducir autorizacion dispersa mediante nombres de planes como `plan === "PRO"`.

La interfaz puede usar nombres comerciales. La autorizacion del servidor debe utilizar capabilities y limites.

## Perfil digital permanente

La compra de una tarjeta fisica puede otorgar un derecho permanente al perfil digital asociado.

El perfil basico debe continuar funcionando aunque Pro este inactivo.

El vencimiento de Pro no debe eliminar el perfil, QR, contacto, redes, enlaces ni otras capacidades basicas correspondientes al derecho permanente.

## SmartNFC Pro

Pro habilita funciones premium como CRM, prospectos, metricas y analiticas.

Cuando Pro vence o queda comercialmente inactivo:

- premium queda bloqueado;
- el perfil basico continua funcionando;
- prospectos se conservan;
- metricas se conservan;
- configuracion se conserva;
- la reactivacion recupera acceso a los mismos datos.

Ocultar enlaces de navegacion NO constituye autorizacion.

Paginas, APIs y server actions premium deben validar capabilities del lado servidor.

## Teams

Los planes Teams utilizan limites de identidades digitales.

Una identidad digital NO equivale necesariamente a una tarjeta fisica.

Las variantes Teams comparten capacidades y se diferencian principalmente mediante limites.

Los limites deben validarse en servidor y soportar concurrencia sin superar el cupo.

## SmartNFC Local

El soporte fisico y la licencia SaaS Local son conceptos separados.

Comprar un soporte fisico no concede por si mismo funcionamiento permanente del servicio Local.

`LocalLocation` representa locales o sucursales.

Los limites de puntos activos se aplican por ubicacion cuando corresponda.

## Suspension y reactivacion Local

Una suspension comercial Local:

- no elimina locales;
- no elimina campanas;
- no elimina puntos;
- no elimina codigos;
- no requiere reprogramar NFC;
- no requiere generar otro QR.

La administracion premium debe quedar restringida.

Los destinos publicos NFC/QR deben mostrar un estado neutral equivalente a:

`Punto Inteligente temporalmente inactivo`

No exponer publicamente deuda, licencia ni informacion administrativa.

No responder 404 unicamente porque la licencia esta comercialmente inactiva.

Al reactivar la licencia, el mismo punto y codigo deben recuperar su contenido.

Una suspension de seguridad es distinta de una suspension comercial.

Los overrides nunca deben saltarse una suspension de seguridad.

## Compatibilidad historica

No eliminar ni reinterpretar datos legacy solo porque exista un catalogo comercial nuevo.

Entre las estructuras historicas relevantes pueden existir:

- `PlanType`
- `Company.plan`
- `maxIdentities`
- `licenseStatus`
- fechas y notas de licencia
- `CompanyProductLicense`

Los backfills deben ser aditivos, deterministas, idempotentes y conservadores.

No inventar compras historicas.

No modificar migraciones historicas ya aplicadas.

Crear una migracion nueva cuando corresponda.

## Multi-tenant y autorizacion

SmartNFC es multiempresa.

Toda accion sensible debe validar en servidor, segun corresponda:

- sesion;
- empresa;
- ownership;
- capability;
- limites;
- estado de seguridad.

No confiar solamente en IDs enviados por el cliente.

Ocultar botones en la UI no sustituye autorizacion del servidor.

## Prisma

Antes de modificar `prisma/schema.prisma`:

1. Revisar relaciones existentes.
2. Revisar migraciones relevantes.
3. Evaluar compatibilidad.
4. Preferir cambios aditivos.

Despues ejecutar las validaciones pertinentes de Prisma, TypeScript y tests.

Nunca modificar una migracion historica aplicada para acomodar un cambio nuevo.

## Pruebas y QA

Un cambio no esta terminado solamente porque compile.

Segun el alcance ejecutar:

- pruebas unitarias;
- pruebas de entitlements;
- integracion;
- backfill seguro;
- TypeScript;
- ESLint;
- build;
- secret scan;
- `git diff --check`.

Las pruebas de base de datos deben usar PostgreSQL desechable.

No ejecutar scripts historicos peligrosos contra una base real.

No modificar una prueba solamente para hacerla verde sin demostrar que su expectativa era incorrecta.

Para cambios de UI o autorizacion realizar QA funcional cuando corresponda, incluyendo escritorio, movil, navegacion, acceso directo por URL, APIs, server actions, estados activo/inactivo, persistencia, reactivacion y limites.

No afirmar que hardware NFC fue probado cuando solamente se verifico su ruta publica.

## Scope creep

Hacer el cambio minimo necesario.

Si aparece una mejora no necesaria para el objetivo actual:

1. Documentarla.
2. Explicar su impacto.
3. No implementarla automaticamente.

No aprovechar una tarea para refactorizar areas no relacionadas.

## Bloque 2 validado

El Bloque 2 implementa el catalogo comercial y la arquitectura de entitlements.

Rama de cierre:

`codex/commercial-catalog-entitlements`

Commit validado:

`202e0ac`

Documentacion obligatoria antes de modificar esta arquitectura:

- `docs/BLOCK_2_ENTITLEMENTS.md`
- `docs/BLOCK_2_VISUAL_VALIDATION.md`

Estado registrado al cierre:

- 52 pruebas aprobadas;
- 0 fallidas;
- 0 omitidas;
- TypeScript aprobado;
- build aprobado;
- ESLint sin errores;
- secret scan sin hallazgos;
- `git diff --check` aprobado;
- QA visual de Base, Pro, Teams, Local y Superadmin completado.

No alterar este comportamiento sin entender primero ambos documentos.

## Proxima linea funcional: reactivacion

Existe una decision de producto para una etapa posterior al Bloque 2.

Para Pro inactivo, la experiencia futura debe comunicar que:

- Pro esta inactivo;
- el perfil basico continua funcionando;
- CRM, metricas y analiticas estan temporalmente bloqueados;
- los datos permanecen guardados;
- el usuario puede reactivar.

Concepto:

`Reactivar SmartNFC Pro`

Mientras no exista integracion real de pagos, no simular un checkout inexistente.

Puede utilizarse inicialmente:

`Solicitar reactivacion`

SmartNFC Local debe adoptar posteriormente un patron equivalente:

`Reactivar SmartNFC Local`

La experiencia debe explicar que locales, campanas, puntos y codigos permanecen conservados.

La futura integracion de pagos debe conectarse a este flujo sin romper la arquitectura de entitlements.

## Protocolo de trabajo

Para tareas relevantes:

### A. Auditoria

Primero leer contexto, inspeccionar codigo, revisar Git e identificar archivos afectados y riesgos.

No modificar codigo todavia.

### B. Plan

Explicar comportamiento actual, comportamiento deseado, archivos previstos, cambios de datos o esquema, pruebas y riesgos.

Esperar aprobacion cuando el cambio sea relevante.

### C. Implementacion

Realizar el cambio minimo suficiente.

No modificar areas ajenas sin necesidad.

### D. Validacion

Ejecutar las pruebas pertinentes, revisar el diff y comprobar que no existan archivos temporales ni secretos.

### E. Informe

Entregar:

- que cambio;
- archivos modificados;
- pruebas ejecutadas;
- resultados;
- riesgos o pendientes;
- `git status`.

No hacer commit, push, PR, merge ni deploy sin autorizacion.

## Principio final

SmartNFC contiene decisiones comerciales deliberadas ademas de codigo.

Ante una duda: preservar datos, preservar compatibilidad, preservar seguridad y preguntar antes de destruir o reinterpretar comportamiento.