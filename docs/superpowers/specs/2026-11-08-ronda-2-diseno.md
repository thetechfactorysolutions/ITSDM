# ITSDM — Ronda 2: diseño

Fecha: 2026-11-08. Estado: aprobado de palabra por el responsable del proyecto ("dejalo todo documentado y después empieza").

## 1. Intención

La versión 1 permite crear y editar ideas, iniciativas, proyectos y acciones, pero:

- los vínculos entre ellos son texto que hay que pegar a mano;
- no se puede borrar, buscar, filtrar ni ordenar;
- no hay un sitio donde guardar "cosas a tener en cuenta" de una reunión;
- está pensada para una sección normal de página, no para ancho completo.

Esta ronda lo convierte en una herramienta de trabajo diario y añade la entrada principal de datos nueva: **importar el resultado de una IA sobre la transcripción de una reunión** y repartirlo por las secciones que correspondan.

## 2. Objetivos, no objetivos y fracasos

**Objetivos**

1. Poder pegar el resultado de una IA y que se creen, en su sitio, proyectos, iniciativas, ideas, acciones y notas, previa vista previa y confirmación.
2. Trabajar sin pegar IDs: elegir iniciativa, proyecto o idea desde un selector.
3. Borrar, archivar, buscar, filtrar y ordenar.
4. Encajar en una sección de **ancho completo** de SharePoint y verse bien en pantallas pequeñas.
5. Disponible en español e inglés.

**No objetivos de esta ronda** (apuntados en `docs/ROADMAP.md`)

- Integraciones con Planner, Power Automate y Microsoft Graph.
- Roles y aprobaciones propios (se usan los permisos de SharePoint).
- Las 16 listas sin interfaz (`IT_05` a `IT_20`).
- Migración automática de esquemas de listas ya creadas.
- Llamar a una IA desde la app. **La app no envía nada a ningún servicio de IA**; solo recibe un resultado ya generado.

**Fracasos aunque "funcione"**

- Que la importación cree cosas que el usuario no vio ni confirmó.
- Que un fallo a medias deje datos sin que el usuario lo sepa.
- Que se pierda la transcripción original o no se sepa de qué reunión salió cada elemento.

## 3. Restricciones

- SPFx 1.23.2, React 17, Fluent UI 8, PnPjs, Node 22. Sin nuevas dependencias pesadas (los gráficos son SVG propio).
- Las 4 listas existentes **no cambian de columnas** (no hay migración). Las listas nuevas se crean con el paquete.
- La app no puede probarse desde aquí contra el tenant: todo lo que dependa de SharePoint real se verifica con servicios simulados y queda marcado como "por probar".
- Todo texto visible sale de diccionarios en español e inglés.

## 4. Decisiones de diseño

### 4.1 Modelo de datos

| Cambio | Detalle |
| --- | --- |
| Lista nueva `IT_21_Meetings` | `Title`, `MeetingId`, `MeetingDate` (fecha), `Summary`, `Attendees`, `Transcript` (texto multilínea), `ImportedItems` (resumen de lo creado) |
| Lista nueva `IT_22_Notes` | `Title`, `NoteId`, `Body`, `Category` (DECISION, RISK, INFO, FOLLOW_UP), `Status` (ACTIVE, ARCHIVED), `MeetingId`, `InitiativeId`, `ProjectId` |
| Vínculos | Se siguen guardando como **texto con el ID** (`InitiativeId`, `ProjectId`, `SourceIdeaId`), pero se eligen con un selector. No se usan columnas de búsqueda de SharePoint para no cambiar las listas existentes. |
| Archivar | Mover a **CANCELLED**, que ya existe en las cuatro listas. Un filtro "mostrar cerradas" las oculta por defecto. Así no hace falta columna nueva. |
| Origen de lo importado | Se añade al final de la descripción: `[Origen: MEET-…]`. La reunión guarda la lista de lo creado. |
| Fecha de cierre | Al pasar una acción a DONE se rellena `CompletedDate` con hoy si estaba vacía; al reabrirla se vacía. |
| Reglas de estado | Mapas de transición para iniciativas, proyectos y acciones, como ya existen para ideas. Se permite reabrir lo completado y lo cancelado. |

### 4.2 Entradas y salidas de la importación de transcripciones

La pestaña **Import** hace cuatro cosas:

1. **Plantilla e instrucción.** Muestra un texto listo para copiar que explica a la IA qué formato devolver, en el idioma de la interfaz.
2. **Pegar el resultado.** Un cuadro de texto, más uno opcional para la transcripción original (se guarda con la reunión).
3. **Vista previa.** Cada elemento detectado aparece en su sección con una casilla para incluirlo o excluirlo, y avisos: propietario no reconocido, fecha inválida, estado desconocido, vínculo sin resolver, posible duplicado.
4. **Confirmar.** Crea primero la reunión y luego lo demás, mostrando el progreso. Si algo falla, informa de qué se creó y qué no, y permite reintentar solo lo fallido. No se deshace lo ya creado.

**Formato que devuelve la IA** (JSON, mi decisión; la app lo acepta dentro de un bloque de código o con texto alrededor):

```json
{
  "meeting":     { "title": "", "date": "AAAA-MM-DD", "summary": "", "attendees": ["email o nombre"] },
  "ideas":       [ { "title": "", "description": "", "owner": "", "estimatedValue": 0, "targetDate": "", "tags": [] } ],
  "initiatives": [ { "title": "", "description": "", "owner": "", "targetDate": "" } ],
  "projects":    [ { "title": "", "description": "", "owner": "", "initiative": "título", "startDate": "", "endDate": "", "budget": 0, "forecast": 0, "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL" } ],
  "actions":     [ { "title": "", "description": "", "owner": "", "dueDate": "", "priority": "LOW|MEDIUM|HIGH|CRITICAL", "project": "título", "initiative": "título" } ],
  "notes":       [ { "title": "", "body": "", "category": "DECISION|RISK|INFO|FOLLOW_UP", "project": "título", "initiative": "título" } ]
}
```

**Reglas de interpretación**

- Las secciones que falten o estén vacías se ignoran.
- Un propietario con formato de email se usa tal cual. Un nombre se busca en el directorio: si hay una coincidencia única se usa; si no, se asigna al usuario que importa y se marca con aviso.
- Los vínculos `initiative` y `project` son **títulos**. Se resuelven primero contra lo que viene en el mismo resultado y después contra lo ya existente (sin distinguir mayúsculas). Si no se resuelve, se deja vacío con aviso.
- Valores desconocidos de prioridad, riesgo o categoría se sustituyen por el valor por defecto con aviso. Las fechas inválidas se descartan con aviso.
- Las ideas, iniciativas, proyectos y acciones pasan por las mismas validaciones que los formularios; lo que no las cumple no se puede incluir hasta corregirlo.
- Los estados iniciales son siempre los de partida (NEW, DRAFT, PLANNING, OPEN). La IA no decide estados.
- Posible duplicado: mismo título (sin distinguir mayúsculas) ya existente en la misma lista. Aviso, no bloqueo.

### 4.3 Pestañas

Dashboard · Ideas · Initiatives · Projects · Actions · **Notes** (con subvistas Notas y Reuniones) · **Import** · Help.

### 4.4 Comportamiento común de las tablas

- Búsqueda por texto, filtro por estado y "mostrar cerradas" (apagado por defecto).
- Ordenar haciendo clic en la cabecera de columna.
- Exportar a CSV lo que se ve (con filtros aplicados).
- Importar CSV en las cuatro listas principales (la cabecera usa los nombres de columna de SharePoint; vista previa y validación igual que en la importación de transcripciones).
- Acciones por fila: Editar, Archivar, Borrar (con confirmación). En acciones, además, cambio rápido de estado con los estados permitidos.
- Vista de detalle para iniciativas y proyectos: campos, origen, y sus proyectos y acciones relacionados.

### 4.5 Dashboard

Los contadores actuales, más "Mi trabajo" con las acciones propias (vencidas, de hoy, de esta semana) y cierre rápido, y gráficos propios en SVG: acciones por estado y presupuesto frente a forecast por proyecto. Cada gráfico tiene una tabla alternativa para lectores de pantalla.

### 4.6 Ancho completo y adaptación

- El manifiesto declara `supportsFullBleed`, lo que permite ponerlo en una sección de ancho completo.
- El contenedor ocupa el 100 % del ancho, con márgenes laterales y cuadrículas que se reorganizan por ancho: tarjetas KPI en rejilla, formularios en dos columnas en pantallas amplias y una en estrechas, paneles a ancho completo en móvil.

### 4.7 Idiomas

Diccionarios TypeScript `en` y `es` con claves tipadas (un test comprueba que tienen las mismas claves). Idioma por defecto: el de la interfaz del usuario en SharePoint; el panel de propiedades permite forzar español o inglés.

### 4.8 Historial

Botón en Help que intenta activar el control de versiones en las listas (requiere permisos de gestión de la lista) e informa de qué listas lo consiguieron. El detalle muestra quién modificó el elemento y cuándo.

### 4.9 Calidad

- Consultas con las columnas necesarias (`select`) en lugar de todas.
- Tests de componentes (formularios, tablas, vista previa de importación), de la lectura del resultado de la IA y de las reglas nuevas.
- Integración continua en GitHub Actions: instalar, lint, tests y empaquetado, guardando el `.sppkg` como artefacto.
- Documentación de arquitectura, modelo de datos, despliegue y seguridad actualizada al final.

## 5. Orden de construcción

1. **Base:** reglas de estado, entidades y vínculos, notas y reuniones (listas y pantallas), borrar y archivar, búsqueda, filtros, orden, detalle y CSV.
2. **Importación de transcripciones:** lectura y validación del resultado, resolución de propietarios y vínculos, vista previa, creación con progreso y reintento.
3. **Presentación:** ancho completo, idiomas, gráficos, accesibilidad, historial.
4. **Cierre:** tests de componentes, CI, documentación, paquete.

## 6. Lo que queda a criterio de quien construye

Estilos visuales concretos, textos exactos de avisos, nombres internos de componentes y la forma exacta de la rejilla responsive.

## 7. Riesgos conocidos

- Las listas nuevas y la instalación sobre listas ya existentes **no se han probado contra el tenant**. Para una instalación ya hecha, lo seguro es borrar las listas de ejemplo y volver a añadir la app.
- La búsqueda de usuarios para resolver propietarios depende de los permisos del usuario que importa.
- La calidad de la importación depende de lo bien que la IA siga el formato; por eso hay vista previa obligatoria.
