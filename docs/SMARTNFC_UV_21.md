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
