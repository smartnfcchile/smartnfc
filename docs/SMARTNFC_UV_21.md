# SmartNFC UV 2.1

## Evidencia de laboratorio

El ensayo del 26 de noviembre consultó coordenadas de referencia en Chiloé (-41.87, -73.81) y el fiordo de Aysén (-45.40, -72.69). Open-Meteo respondió 200 en ambos puntos con 24 valores horarios y máximos estimados de 8,55 y 8,3. Son estimaciones para una celda del modelo, no mediciones de un centro. OpenWeather 4.0 respondió 401 sin clave. El servicio histórico JSON UVB documentado por la DMC devolvió 404. El pronóstico oficial de la DMC sigue disponible como enlace de respaldo.

## Diseño del bloque dinámico

- Configurar coordenadas del centro y zona IANA en la plantilla o variante por sede, con el mismo control de protección que los demás bloques. El identificador público de sede no puede elegir coordenadas arbitrarias de otra empresa.
- Resolver la sede desde el punto y la versión publicada. El adaptador entrega hora local, índice horario estimado, máximo diario, serie de horas y fecha de consulta. El normalizador mantiene cero como un dato válido y evita rellenar horas faltantes.
- Caché compartida por proveedor, coordenadas del centro y zona horaria. TTL inicial de 60 minutos, errores con reintento corto y último pronóstico acompañado de fecha si sigue correspondiendo a la jornada local. Fin de jornada o datos vencidos muestran un estado de indisponibilidad.
- La ubicación del teléfono se pide solo al pulsar «Usar mi ubicación». Mantener la selección de centro si se rechaza. Para un primer piloto, comparar la ubicación localmente con puntos configurados y ofrecer el centro más cercano con su nombre. Para pronóstico en la posición del teléfono, diseñar un flujo separado con cuadrícula pública, sin persistir coordenadas personales ni incorporarlas a URL, analítica, logs o caché personal.
- Mostrar «Pronóstico para la hora» y «Máximo diario previsto», con fuente, hora de consulta y gráfico compacto. No confundir fecha de consulta con corrida del modelo. La recomendación debe corresponder al nivel y a las medidas del centro.
- No hay rutas públicas de consulta meteorológica ni geolocalización del teléfono en este PR. El prototipo normaliza los datos y deja separada la futura decisión contractual.

## Uso y costos

Open-Meteo fue el único proveedor con datos de pronóstico comprobados en las dos coordenadas. La API abierta es para evaluación no comercial. El plan comercial Standard ofrece un presupuesto mensual de 1 millón de llamadas. La cadencia se rige por el modelo, no por la granularidad horaria de la respuesta.

One Call 4.0 requiere clave y alta del servicio. La tarifa pública muestra 1.000 llamadas diarias incluidas y USD 0,0015 por llamada adicional. Validar con credencial autorizada la forma del máximo diario y condiciones comerciales antes de seleccionarlo. La DMC publica observaciones por estación (documentación histórica de cinco minutos), sin prueba de una API de pronóstico por coordenadas, SLA o cuota para este uso.

Ejemplo conservador sin aciertos de caché adicionales: 20 centros × 24 renovaciones = 480 consultas/día si basta una consulta por centro, o 960 si la hora y el día exigen dos endpoints. No se crearon suscripciones ni claves. Los costos reales dependen del contrato, cuota y tráfico.


## MET Norway · integración sin suscripción meteorológica

MET Locationforecast 2.0 complete respondió HTTP 200 para Chiloé, Queullín y el fiordo de Aysén, con 60 muestras UV de cielo despejado por punto. Atribución visible a MET Norway, CC BY 4.0. El adaptador usa un User-Agent identificable, cuatro decimales, Expires e If-Modified-Since. La caché usa PostgreSQL existente y agrupa por coordenadas de centro, nunca por trabajador. Un bloqueo transaccional y un intervalo global de al menos un segundo limitan las consultas; los fallos tienen espera antes de reintentar. Datos antiguos solo se muestran con su hora de actualización, por un periodo acotado. Un máximo se etiqueta como máximo entre las horas disponibles del día.

El editor permite configurar un bloque Pronóstico UV y adaptar sus coordenadas por sede. El render público consulta únicamente bloques de una versión publicada vigente. Se requiere autorizar y aplicar la migración aditiva de caché antes de habilitar SMARTNFC_MET_UV_ENABLED=1. El Preview estático ilustra el bloque con una respuesta archivada del ensayo, identificada como tal. Sin clave, cobros meteorológicos ni uso de ubicación del teléfono.


### Límites operativos y pausa

PostgreSQL impone 500 cupos únicos numerados y un máximo de 16 KiB por JSON normalizado; el tope lógico de JSON es 7,81 MiB, más el costo físico de índices, páginas, metadatos y registros muertos. La aplicación limita el cuerpo recibido a 512 KiB y acepta hasta 300 muestras antes de normalizar. Guarda exclusivamente marca de actualización y pares de hora/índice UV. La actividad por centro se registra como máximo una vez por hora. La primera consulta que necesita refrescar activa la limpieza si corresponde, hasta una vez por hora, sin tareas programadas. Un registro se conserva al menos siete días desde su último uso; la precisión horaria y la llegada del siguiente tráfico condicionan el instante de limpieza. Con 500 ubicaciones recientes, una ubicación nueva queda temporalmente sin pronóstico.

Todas las consultas al proveedor comparten un bloqueo de PostgreSQL y un plazo persistente. Tras un fallo se usa espera exponencial de dos minutos a una hora y se respeta Retry-After cuando llega, incluso para otros centros. La espera visible de la consulta tiene un presupuesto de dos segundos. Las landings pueden presentar el mensaje de indisponibilidad y cargar su resto habitual.

Además de la habilitación de entorno inicialmente apagada, la fila id=1 de CampaignUvProviderState contiene paused. Un operador de base autorizado puede colocar paused=true usando INSERT ... ON CONFLICT DO UPDATE si la fila aún no existe. La próxima solicitud omite incluso los datos almacenados, sin redeploy. La operación inversa reanuda el pronóstico. Esta configuración no modifica campañas ni puntos.
