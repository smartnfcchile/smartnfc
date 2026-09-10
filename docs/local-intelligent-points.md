# Puntos Inteligentes — segunda entrega

Rama `feat/local-intelligent-points`, basada en la entrega de reportes `feat/local-automatic-reports` (PR #7). Revisar y fusionar en orden, únicamente después de aprobación. No se modifica main ni se despliega producción en esta tarea.

## Comportamiento

Cada `LocalTouchpoint` tiene objetivo, soporte NFC/QR/NFC+QR, ubicación física, destino o lista de acciones, estado y versión de configuración. El código QR y el token de la tarjeta NFC permanecen estables cuando cambia el destino.

| Objetivo | Experiencia en esta entrega |
| --- | --- |
| GOOGLE_REVIEW | Redirección al enlace de reseñas de Google configurado por el negocio |
| WHATSAPP | Enlace wa.me al número del negocio, con mensaje opcional en el enlace |
| SOCIAL | Enlace al perfil social configurado |
| CLUB | Club publicado existente: formulario, consentimiento y beneficio |
| PROMOTION | Enlace HTTPS a la promoción vigente |
| MENU | Enlace HTTPS a un menú, PDF o catálogo público |
| SMART_LANDING | Página propia con hasta seis acciones configurables |

Menú y Promoción funcionan con destinos externos en este bloque; no se implementa todavía un editor de catálogo, motor de cupones o canjes. No se confirma la publicación de reseñas, nuevos seguidores, mensajes enviados o compras.

El administrador usa **Puntos Inteligentes → Crear punto**. Puede seleccionar una campaña o crear una agrupación nueva en el mismo formulario, sin completar un Club. Los puntos nuevos empiezan desactivados salvo que se marque explícitamente la casilla de activación. Los puntos de Club solo se activan si el Club está publicado.

Las campañas siguen siendo la relación de pertenencia al local. Para los objetivos distintos de Club, la activación es propia del punto y no depende de publicar el formulario de Club de esa campaña. Archivar una campaña detiene todos sus puntos. El sistema prohíbe cambiar un punto a otra campaña, incluso mediante actualización directa a la base.

## Resolución y analítica

- `/q/[code]` comprueba soporte QR y registra fuente QR.
- `/t/[token]` conserva las reglas físicas existentes y delega solo la rama Local al resolutor común; la rama Empresas se conserva.
- `/p/[code]` permite abrir el punto como acceso directo. Abrir desde el panel también genera una visita directa.
- El destino se resuelve en el servidor y las respuestas no se almacenan en caché. El visitante recibe el destino vigente sin regrabar el soporte.
- Cada visita conserva una copia del objetivo en ese momento. Cambiar el objetivo del punto no reclasifica el historial.
- Los informes agregan accesos por objetivo. La conversión del Club usa exclusivamente accesos al Club como denominador; visitas al menú o reseñas no alteran su porcentaje.
- Las redirecciones externas se miden como salidas al destino, no como resultados confirmados. WhatsApp conserva su evento específico.
- En SMART_LANDING se cuenta una visita con salida por cada visita, no cada clic individual en cada botón. Una página abierta con una versión anterior no redirige silenciosamente a una acción modificada: pide volver a abrir el punto.
- Los nuevos campos de métricas son opcionales al leer reportes guardados, de modo que el historial de la primera entrega continúa siendo legible.

## Seguridad y compatibilidad

Los cambios y las descargas de QR revalidan sesión, rol, licencia y pertenencia al local en el servidor. Se respetan cupos de campañas y puntos, se serializan las operaciones de capacidad y se rechazan ediciones con una versión obsoleta. Cambiar a solo QR requiere desvincular antes cualquier tarjeta NFC.

Los destinos aceptan HTTPS público, sin credenciales incrustadas, puertos alternativos ni direcciones locales. Google, WhatsApp y Social validan dominios previstos. No se consultan destinos externos desde el servidor. Las etiquetas de la página Smart se escapan y la página aplica restricciones de scripts y contenido.

Los QR se generan localmente con la librería existente y se descargan desde una ruta autenticada. El editor de campañas deja de enviar el enlace del punto a un servicio externo para generar su QR.

La migración `20260910140000_local_intelligent_points` conserva los puntos existentes como CLUB + NFC_QR y deja su ubicación pendiente de completar. Conserva códigos, asociaciones físicas y eventos. Debe aplicarse después de las migraciones de reportes y antes de publicar esta versión; no se ha aplicado en producción.

## Validación

Usar PostgreSQL descartable y `LOCAL_TEST_DATABASE_URL` loopback siguiendo `docs/local-automatic-reports.md`. Ejecutar `npm run test:local`, TypeScript, lint y build. La suite verifica siete objetivos, configuración incompleta, dominios impostores, soporte, pausa, cambio de destino, historial, cuotas, concurrencia, aislamiento, descarga de QR y página Smart, además de las pruebas de reportes y reglas de Empresas.

Los workflows admiten esta propuesta apilada sobre `feat/local-automatic-reports`; al revisar el diff se muestran solamente los cambios de este bloque. `vercel.json` omite la compilación de la rama de Puntos Inteligentes para no activar previews contra servicios reales. Los reportes y su programación permanecen pendientes de activación.
