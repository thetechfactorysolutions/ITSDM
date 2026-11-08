# Importar una reunión

La pestaña **Importar** convierte lo hablado en una reunión en ideas, iniciativas, proyectos, acciones y notas, cada cosa en su sitio.

**La aplicación no lee la transcripción ni llama a ninguna IA.** Lo hace tu propia IA (por ejemplo Microsoft Copilot) fuera de la app, y tú traes el resultado. Así la transcripción no sale de tu entorno si usas una IA corporativa.

## Paso a paso

1. En la pestaña **Importar**, pulsa **Copiar instrucción** (puedes elegir si la instrucción va en español o en inglés).
2. En tu IA, pega la instrucción y, debajo, la transcripción de la reunión. La IA responde con un bloque de datos.
3. Copia esa respuesta completa y pégala en **Resultado de la IA**. No importa que venga con texto antes o después, ni dentro de un bloque de código. Opcionalmente pega también la transcripción original: se guarda con la reunión.
4. Pulsa **Revisar lo que se va a crear**. Todavía no se crea nada.
5. Revisa la vista previa: desmarca lo que no quieras y lee los avisos (⚠) bajo cada elemento.
6. Pulsa **Crear N elementos**. Verás el progreso y un resumen. Si algo falla, **Reintentar los que fallaron** crea solo esos, sin duplicar lo ya creado ni la reunión.

## Qué va a cada sección

| Lo que se dijo | Dónde queda |
| --- | --- |
| Una tarea concreta con alguien que la hace | **Acciones** |
| Un trabajo con alcance propio | **Proyectos** |
| Un programa grande que agrupa proyectos | **Iniciativas** |
| Una propuesta todavía sin decidir | **Ideas** |
| Algo que podría salir mal | **Gobierno → Riesgos** |
| Una decisión ya tomada (con su motivo y quién la tomó) | **Gobierno → Decisiones** |
| Un aprendizaje para la próxima vez | **Gobierno → Lecciones aprendidas** |
| Información a tener en cuenta y seguimientos que no encajan en lo anterior | **Notas** |
| La reunión en sí (fecha, resumen, asistentes, transcripción) | **Reuniones** |

## Qué hace la aplicación con lo que recibe

- **Estados:** siempre los de partida (Nueva, Borrador, En planificación, Abierta, Abierto, Activa). La IA no decide estados. **Excepción: las decisiones** se crean ya como *Decidida*, con la fecha de la reunión, porque una decisión dicha en una reunión es algo ya tomado.
- **Responsables (y quién decidió):** si la IA da un email, se usa. Si da un nombre, la aplicación lo busca en el directorio; si hay una coincidencia clara lo asigna, y si no, lo asigna a ti y te avisa.
- **Vínculos:** un proyecto o una acción se vincula a una iniciativa o un proyecto por su **título**, buscando primero entre lo que viene en el mismo resultado y luego entre lo que ya existe (sin distinguir mayúsculas ni acentos). Si no lo encuentra, lo deja sin vincular y te avisa.
- **Fechas:** solo acepta días reales (`AAAA-MM-DD`). Si una fecha no es válida (por ejemplo "el viernes"), la deja vacía y te avisa.
- **Valores desconocidos** de prioridad, riesgo o categoría: usa el valor por defecto y te avisa. Acepta también palabras en español (alta, media, baja, crítica; decisión, riesgo, seguimiento).
- **Duplicados:** si ya existe algo con el mismo título, te avisa pero no lo bloquea.
- **Origen:** lo creado termina con `[Origen: MEET-…]` en la descripción, y la reunión guarda la lista de lo creado.

## Ejemplo para probar

Pega esto en **Resultado de la IA** para ver el funcionamiento sin usar ninguna IA:

```json
{
  "meeting": {
    "title": "Revisión semanal de TI",
    "date": "2026-11-06",
    "summary": "Se revisó la oleada 1 de portátiles y el despliegue de telefonía.",
    "attendees": ["ana@empresa.com", "Luis García"]
  },
  "initiatives": [
    { "title": "Puesto de trabajo digital", "description": "Modernizar el puesto de trabajo", "owner": "ana@empresa.com", "targetDate": "2027-06-30" }
  ],
  "projects": [
    { "title": "Renovación de portátiles oleada 1", "initiative": "Puesto de trabajo digital", "owner": "ana@empresa.com",
      "startDate": "2026-12-01", "endDate": "2027-02-28", "budget": 200000, "forecast": 210000, "riskLevel": "MEDIUM" }
  ],
  "ideas": [
    { "title": "Portal de autoservicio para restablecer contraseñas", "estimatedValue": 25000, "tags": ["service-desk"] }
  ],
  "actions": [
    { "title": "Enviar la petición de compra", "owner": "ana@empresa.com", "dueDate": "2026-11-13", "priority": "HIGH", "project": "Renovación de portátiles oleada 1" },
    { "title": "Revisar el contrato del proveedor", "owner": "Luis García", "dueDate": "2026-11-20", "priority": "media" }
  ],
  "risks": [
    { "title": "El proveedor de telefonía podría retrasarse", "owner": "Luis García", "probability": "alta", "impact": "HIGH",
      "mitigation": "Acordar una fecha firme", "dueDate": "2026-11-20", "project": "Renovación de portátiles oleada 1" }
  ],
  "decisions": [
    { "title": "Comprar los portátiles en dos oleadas", "description": "Un solo pedido superaría el presupuesto trimestral.",
      "rationale": "El presupuesto se libera por oleada.", "decidedBy": "ana@empresa.com", "project": "Renovación de portátiles oleada 1" }
  ],
  "lessons": [
    { "title": "Confirmar plazos con el proveedor antes de fijar fechas", "recommendation": "Pedirlos por escrito", "category": "proveedor" }
  ],
  "notes": [
    { "title": "Compartir el nuevo catálogo de servicios", "body": "Pendiente de enviar antes de la próxima reunión.", "category": "FOLLOW_UP" }
  ]
}
```

Resultado esperado en la vista previa: 1 reunión, 1 iniciativa, 1 proyecto vinculado a la iniciativa, 1 idea, 2 acciones (la primera vinculada al proyecto y a su iniciativa) , 1 riesgo (puntuación 9, nivel alto, vinculado al proyecto), 1 decisión (ya Decidida, con la fecha de la reunión), 1 lección y 1 nota de seguimiento, con un aviso en la segunda acción y en el riesgo si "Luis García" no se encuentra en tu directorio.

## Formato que espera la aplicación

Todos los apartados son opcionales; los que falten o estén vacíos se ignoran.

```json
{
  "meeting":     { "title": "", "date": "AAAA-MM-DD", "summary": "", "attendees": ["email o nombre"] },
  "ideas":       [ { "title": "", "description": "", "owner": "", "estimatedValue": 0, "targetDate": "", "tags": [] } ],
  "initiatives": [ { "title": "", "description": "", "owner": "", "targetDate": "" } ],
  "projects":    [ { "title": "", "description": "", "owner": "", "initiative": "título", "startDate": "", "endDate": "", "budget": 0, "forecast": 0, "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL" } ],
  "actions":     [ { "title": "", "description": "", "owner": "", "dueDate": "", "priority": "LOW|MEDIUM|HIGH|CRITICAL", "project": "título", "initiative": "título" } ],
  "risks":       [ { "title": "", "description": "", "owner": "", "probability": "LOW|MEDIUM|HIGH", "impact": "LOW|MEDIUM|HIGH", "mitigation": "", "dueDate": "", "project": "título", "initiative": "título" } ],
  "decisions":   [ { "title": "", "description": "contexto", "rationale": "por qué", "decidedBy": "", "project": "título", "initiative": "título" } ],
  "lessons":     [ { "title": "", "description": "qué pasó", "recommendation": "", "category": "PROCESS|TECHNOLOGY|PEOPLE|VENDOR|OTHER", "owner": "", "project": "título", "initiative": "título" } ],
  "notes":       [ { "title": "", "body": "", "category": "DECISION|RISK|INFO|FOLLOW_UP", "project": "título", "initiative": "título" } ]
}
```

También reconoce los nombres de campo en español más habituales (`acciones`, `proyectos`, `responsable`, `fechaLimite`, `prioridad`...).

**No se importan** presupuestos, gastos, proveedores, contratos, revisiones, incidentes, cambios, interacciones ni KPIs: no son cosas que se mencionen en una reunión, sino registros propios.

## Límites conocidos

- La calidad depende de lo bien que la IA siga el formato; por eso la vista previa es obligatoria.
- Los elementos con un error que no se puede corregir en la vista previa (por ejemplo un título vacío) se omiten o aparecen bloqueados.
- No se deshace lo ya creado si algo falla a medias: el resumen indica qué se creó y qué no.
- La búsqueda de personas depende de los permisos de quien importa.
- No se ha probado contra el SharePoint real; sí con un servicio simulado (`tests/importScreen.test.tsx`).
