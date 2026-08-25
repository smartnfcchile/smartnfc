# Revisión UX: Smart NFC Local

Fecha de revisión: 17 de agosto de 2026  
Alcance: acceso al producto Local, creación y publicación de campañas, gestión de suscriptores y soporte operativo.

## Resumen ejecutivo

La imposibilidad de crear campañas no nace en el formulario: el acceso se bloquea antes. La única empresa con licencia Local registrada tiene una licencia cuyo inicio y vencimiento son el mismo día (15 de agosto de 2026). Como la plataforma exige que `expiresAt` sea posterior al momento actual, la licencia se considera vencida y Smart NFC Local queda fuera del menú para el cliente.

Hay un segundo problema crítico: el superadministrador ve Smart NFC Local en la navegación, pero al entrar se valida la licencia de su propia empresa y aparece “Smart NFC Local no disponible”. Esto impide que soporte revise, configure o diagnostique la cuenta del cliente desde la experiencia normal.

## Hallazgos priorizados

### P0 — El cliente Local no puede entrar ni crear su primera campaña

- Evidencia: la empresa `sarcarnico` tiene producto `LOCAL`, plan `LOCAL_FUNDADOR`, estado `ACTIVE`, inicio `2026-08-15` y vencimiento `2026-08-15`.
- Resultado: la función de acceso considera la licencia vencida; el enlace Local desaparece y las páginas redirigen o muestran indisponibilidad.
- Impacto: bloqueo total del valor principal del producto.
- Acción inmediata: corregir la fecha de vencimiento de la licencia y añadir validación administrativa que impida guardar `expiresAt <= startsAt`.

### P0 — Superadministración no puede dar soporte a Local

- Evidencia: el menú fuerza Local como visible para `SUPERADMIN`, pero `/dashboard/local` consulta la licencia de la empresa del superadministrador.
- Resultado: enlace visible que conduce a un callejón sin salida.
- Acción recomendada: incorporar selección o suplantación segura de empresa para soporte, o permitir que el superadministrador elija la empresa Local antes de abrir el módulo.

### P1 — El formulario puede crear un registro parcial sin informarlo

- El flujo ejecuta dos operaciones consecutivas: crea la campaña y luego guarda identidad comercial.
- Si la segunda operación falla, queda una campaña borrador creada, pero el usuario ve un error genérico y puede intentar nuevamente.
- Acción recomendada: crear campaña, identidad inicial y touchpoint en una única transacción de servidor.

### P1 — Un resultado inesperado puede dejar el botón sin respuesta

- La interfaz solo redirige si recibe `success` y `campaign`; no muestra mensaje cuando la respuesta no cumple esa condición.
- Acción recomendada: manejar explícitamente todos los estados y mostrar confirmación o error persistente.

### P1 — El límite del plan se comunica demasiado tarde

- El botón “Crear Campaña” se muestra aunque el cupo esté agotado; el usuario descubre el límite en la siguiente pantalla.
- Acción recomendada: mostrar “1 de 1 campañas utilizadas” en el dashboard y reemplazar el CTA por “Plan sin cupo” con explicación y contacto.

### P2 — Terminología inconsistente

- Se alternan “Crear Campaña” y “Registrar Nueva Campaña”.
- Acción recomendada: usar “Crear campaña” para la acción y “Campaña” para el objeto en toda la experiencia.

### P2 — El slug exige conocimiento técnico

- “Identificador URL (Slug)” es correcto técnicamente, pero no para un usuario de comercio local.
- Acción recomendada: etiquetar “Dirección web de la campaña” y generar automáticamente una propuesta desde el nombre comercial, permitiendo edición.

### P2 — El primer uso no guía hacia la publicación

- El dashboard vacío no explica la secuencia crear → completar → publicar → grabar/compartir enlace.
- Acción recomendada: mostrar una lista de progreso de cuatro pasos y un CTA único.

## Flujo objetivo recomendado

1. Verificar licencia y cupo antes de mostrar el CTA.
2. Crear campaña con nombre comercial, nombre del club y dirección web sugerida.
3. Abrir el editor con un indicador de avance y campos obligatorios claramente marcados.
4. Guardar automáticamente como borrador y reservar “Publicar” para hacer visible la campaña.
5. Tras publicar, mostrar el enlace principal, el enlace del punto NFC/QR y una acción clara para copiarlos.
6. Conectar el siguiente paso con “Ver suscriptores” y “Exportar contactos”.

## Criterios de aceptación mínimos

- Una empresa con licencia Local activa y cupo disponible crea una campaña en un intento.
- La creación inicial es atómica: no quedan borradores huérfanos si falla el guardado.
- Los errores de licencia, cupo, slug duplicado y validación aparecen junto al CTA o campo correspondiente.
- El superadministrador puede seleccionar una empresa Local y revisar su módulo sin alterar datos.
- El estado vacío explica el recorrido completo y muestra un único CTA principal.
- El usuario puede distinguir con claridad entre guardar borrador y publicar.

## Orden de intervención

1. Corregir la licencia de la empresa Local afectada.
2. Arreglar el acceso de soporte/superadministración.
3. Hacer atómica la creación de campaña.
4. Mejorar estados, cupos, mensajes y terminología.
5. Validar el recorrido completo con una cuenta Local real en escritorio y móvil.

