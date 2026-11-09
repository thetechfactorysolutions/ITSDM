# Módulos de servicio, stock, Genius y gestión: diseño

Fecha: 2026-11-09. Estado: aprobado por la usuaria ("primero los módulos nuevos"). Se construye en tres fases; versión del paquete 1.9.0.0. Implementado y probado con jsdom; sin probar en el tenant.

## Por qué

La usuaria acaba de asumir la gestión de TI de España y Portugal. Dos conversaciones (un traspaso y una revisión del servicio con el proveedor del kiosco) y el prompt "ITSDM Enterprise 1.0" muestran lo que le falta a la aplicación:

- **Servicio:** las cifras de España y Portugal no se pueden comparar (Portugal registra casi todo como interacción), el NPS tiene detractores a los que hay que llamar, y el equipo quiere un catálogo interno para clasificar interacciones.
- **Dispositivos:** hay pedidos grandes (portátiles, unos 270 iPads para Atalaya/Augmented BI) y un aviso manual "cuando queden unos 100 portátiles en stock".
- **Genius Help Desk:** rediseñar el kiosco al estilo de un servicio de atención de referencia, con formaciones y sesiones cortas (rincones, consejos, retos).
- **Gestión:** objetivos estratégicos, casos de negocio (iPads, Augmented BI) y una revisión semanal estructurada.

## Objetivos

- Registrar y seguir el **NPS** por respuesta, con la lista de detractores a los que llamar y su resultado.
- Guardar las **cifras mensuales del servicio** por país (incidencias, interacciones, peticiones, llamadas, SLA, NPS, pendientes) y compararlas de forma justa.
- Un **catálogo de clasificación** (qué es incidencia, interacción o petición, con palabras clave) y un probador de frases.
- **Stock de dispositivos** con mínimo, pedido en curso y aviso de stock bajo.
- **Sesiones Genius** (rincón, consejo, formación, reto, "pregunta a TI") con asistencia, satisfacción e impacto.
- **Objetivos estratégicos** y **casos de negocio** (con ROI, recuperación y aprobación) enlazados a iniciativas y proyectos.
- **Revisión semanal** de gestión.
- Todo con el mismo patrón que lo anterior: reglas puras con pruebas, EN/ES, datos de ejemplo, aprovisionamiento y paquete.

## No objetivos

- No sustituye a ServiceNow: las cifras mensuales se escriben (o importan por CSV) desde los informes; no hay conexión.
- No hay inventario de equipos uno a uno: el stock es por tipo de producto (cantidad), no por número de serie.
- No se promete que una sesión Genius "evita" interacciones: solo se miden participación, satisfacción y los temas que la motivaron.
- No se cambian las listas existentes (no hay migración de esquemas): lo nuevo va en listas nuevas.

## Antiobjetivos

- Que el NPS de España y el de Portugal se comparen sin avisar de que Portugal registra de otra manera (la pantalla de cifras muestra el reparto interacción/incidencia y el contactos por cada 100 usuarios).
- Que un detractor se quede sin llamar sin que se vea (el Panel lo avisa pasado el plazo).
- Que los datos reales se suban al repositorio (se guardan fuera de Git).

## Diseño

### Fase A: servicio

| Lista | Contenido |
| --- | --- |
| `IT_27_NpsResponses` | Una respuesta: puntuación 0 a 10, fecha, canal, país, comentario, referencia del ticket, estado del seguimiento (`NOT_REQUIRED`, `PENDING`, `CONTACTED`, `CLOSED`), fecha del contacto y qué dijo la persona. |
| `IT_28_ServiceMonths` | Cifras de un mes y un país: incidencias, interacciones, peticiones, llamadas, usuarios, SLA %, NPS, respuestas del NPS, pendientes y notas. |
| `IT_29_Catalog` | Entradas del catálogo: título, categoría, tipo (incidencia, interacción, petición), palabras clave, guía y artículo relacionado. |

Reglas: promotor 9-10, pasivo 7-8, detractor 0-6; NPS = % promotores - % detractores. Un detractor nuevo entra en `PENDING` (los demás en `NOT_REQUIRED`); está **vencido** a los 7 días sin llamar (`AppConfig.service.npsFollowUpDays`). SLA bajo si baja de 95 (`AppConfig.service.slaTarget`). Contactos por cada 100 usuarios = (incidencias + interacciones) / usuarios x 100. El probador del catálogo busca las palabras clave (sin mayúsculas ni acentos) en una frase y propone tipo y categoría.

### Fase B: stock y Genius

| Lista | Contenido |
| --- | --- |
| `IT_30_Stock` | Un producto: categoría, ubicación, en stock, mínimo, en uso, pedido en curso y fecha prevista, coste unitario, propiedad (alquiler o compra), proveedor. |
| `IT_31_GeniusSessions` | Una sesión: tipo, tema, estado, fecha, público, quien la da, invitados, asistentes, satisfacción 0-5, material, artículo relacionado y qué la motivó. |

Reglas: **stock bajo** si en stock es menor o igual que el mínimo; **proyección** = en stock + pedido en curso; **cobertura** = en stock / mínimo. Asistencia = asistentes / invitados; satisfacción media de las sesiones dadas.

### Fase C: gestión

| Lista | Contenido |
| --- | --- |
| `IT_32_Objectives` | Objetivo estratégico: responsable, patrocinador, fechas, estado, prioridad, meta y un KPI. |
| `IT_33_BusinessCases` | Caso de negocio: problema, opciones, recomendación, coste, beneficio anual, riesgos, objetivo, iniciativa, proyecto, estado y decisión. Con aprobación (regla `case.approve`) cuando el coste llega al umbral de gasto alto. |
| `IT_34_WeeklyReviews` | La revisión semanal: qué pasó, qué fue bien y mal, atención, decisiones, riesgos, prioridades, qué dejar y qué empezar. |

Reglas: ROI = (beneficio anual - coste) / coste; recuperación en meses = coste / (beneficio anual / 12); sin coste o sin beneficio no se calcula. Las relaciones van **desde el caso hacia el objetivo, la iniciativa y el proyecto**, porque no se pueden añadir columnas a las listas ya creadas.

### Dónde se ve

Pestaña **Operaciones**: NPS, cifras mensuales y catálogo. **Dispositivos** y **Genius** son pestañas nuevas. **Estrategia** (objetivos y casos) y **Revisión semanal** también. El Panel suma casillas y líneas de atención (detractores sin llamar, SLA bajo, stock bajo, casos por decidir).

## Decisiones tomadas por mí (a revisar)

- NPS por respuesta **y** cifras mensuales agregadas, porque a veces solo se tiene el dato del informe.
- El catálogo de interacciones es una lista aparte; no se añade columna "categoría" a las interacciones (no se puede migrar). Las interacciones nuevas pueden citar la entrada del catálogo en el resumen.
- El stock es por tipo de producto, no por serie.
- Los umbrales (7 días, SLA 95) están en `AppConfig.ts`.
- Los datos reales se cargan **sin pasar por Git**: ficheros en `Loreal/Datos/` (fuera del repositorio) para el botón *Importar CSV* y un fichero de datos para el modo local.

## Lo que queda para el futuro

Movimientos de stock con histórico, enlace automático de iPads a un caso de negocio, importación del informe del proveedor, estrategia con objetivos jerárquicos y un "qué ha cambiado" global.
