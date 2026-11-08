# ITSDM — Aprobaciones: diseño

Fecha: 2026-11-08. Primer bloque de lo aplazado en el roadmap ("Roles y aprobaciones").

## 1. Intención

Quien gestiona (hoy una sola persona) necesita que ciertos cambios no se hagan sin el visto bueno de otra persona, y que ese visto bueno quede registrado y se pueda pedir por email o por Teams. **Los casos irán creciendo**, así que añadir uno nuevo debe costar una entrada en una lista de reglas, no tocar pantallas.

## 2. Objetivos, no objetivos y fracasos

**Objetivos**
1. Definir reglas de aprobación como datos (una lista), no como código repartido por las pantallas.
2. Bloquear el cambio protegido hasta que exista una aprobación de esa regla.
3. Pedir la aprobación desde la propia pantalla, con un mensaje ya redactado (email o Teams).
4. Registrar quién la pidió, a quién, quién decidió, cuándo y con qué comentario.
5. Ver lo pendiente en el Panel y poder aprobar o rechazar desde ahí.

**No objetivos**
- Roles propios dentro de la aplicación: mandan los permisos de SharePoint (se documenta cómo).
- Envío automático de avisos (queda para el bloque de Power Automate).
- Flujos de varios aprobadores o aprobaciones en cadena.
- Aprobar desde el correo o desde Teams sin abrir la aplicación.

**Fracasos aunque "funcione"**
- Que un cambio protegido se pueda hacer por una vía que se salta la regla (formulario, cambio rápido de estado en la tabla, importación CSV).
- Que una aprobación concedida para una cosa sirva para otra, o se pueda reutilizar indefinidamente.

## 3. Decisiones de diseño

### 3.1 Reglas como datos

`src/rules/approvals.ts` tiene una lista `APPROVAL_RULES`. Cada regla indica a qué lista se aplica, un título y una explicación (claves de texto traducibles), si está activa y una función `requires(actual, siguiente)` que dice si **ese cambio** necesita aprobación. Para añadir un caso: una entrada en la lista y sus dos textos en español e inglés. Un test comprueba que cada regla tiene sus textos en los dos idiomas.

**Reglas iniciales (mi elección)**

| Regla | Se aplica a | Necesita aprobación cuando |
| --- | --- | --- |
| `idea.validate` | Ideas | la idea pasa a Validada |
| `project.overBudget` | Proyectos | la previsión supera el presupuesto en más de un 10 % y el cambio introduce o aumenta ese exceso |
| `project.highBudgetStart` | Proyectos | un proyecto con presupuesto de 100.000 o más pasa a Activo |
| `initiative.activate` | Iniciativas | una iniciativa pasa a Activa. **Desactivada por defecto**, como ejemplo de regla que se activa con un cambio |

Los umbrales (10 %, 100.000) están en `AppConfig`.

### 3.2 Estado de aprobación en el elemento

Cada elemento (ideas, iniciativas, proyectos y acciones) tiene una única aprobación activa, con columnas `ApprovalRule`, `ApprovalStatus` (NONE, PENDING, APPROVED, REJECTED), `Approver`, `ApprovalRequestedOn`, `ApprovalDecidedOn`, `ApprovalDecidedBy` y `ApprovalComment`. El historial de cambios lo da el control de versiones de SharePoint.

### 3.3 Cómo se aplica

- Al guardar o cambiar el estado, se calcula qué reglas exige ese cambio. Se permite solo si el elemento tiene una aprobación **APPROVED de esa misma regla**.
- Al guardarse el cambio protegido, la aprobación se **consume** (vuelve a NONE): sirve una sola vez.
- Si hay varias reglas a la vez, se pide una cada vez (una sola aprobación activa por elemento).
- Un elemento que se **crea** ya en un estado protegido se bloquea con el aviso "créalo primero y pide la aprobación", porque la aprobación vive en un elemento que ya existe.
- Vías cubiertas: formulario, cambio rápido de estado en la tabla e importación CSV. La importación desde reuniones siempre crea en estado inicial.

### 3.4 Pedir y decidir

- Al bloquearse un cambio, el panel muestra el motivo, un selector de aprobador (recuerda el último) y **Solicitar aprobación**. Se guarda la solicitud (Pendiente) sin aplicar el cambio protegido.
- Después aparecen **Abrir email** y **Abrir Teams**, con el mensaje redactado (título, motivo, quién lo pide, referencia). Lo envía el usuario; la aplicación no envía nada.
- **Aprobar / Rechazar** con comentario opcional, desde el elemento o desde el Panel. Se registra quién y cuándo. Puede decidir quien tenga permiso de edición en la lista.
- El Panel muestra el contador de aprobaciones pendientes y la lista con sus botones. La tabla marca los elementos con aprobación pendiente.

### 3.5 Esquema

Siete columnas nuevas en las cuatro listas. Las listas ya creadas no se migran: como solo hay datos de ejemplo, se recrean al volver a añadir la aplicación (o con los scripts de `scripts/`). Un proyecto de ejemplo queda con una aprobación pendiente para que se vea el flujo.

## 4. A criterio de quien construye

Textos exactos, aspecto de los avisos y de la lista del Panel.

## 5. Riesgos

- Lo nuevo no se ha probado contra el tenant (columnas nuevas en las listas, enlaces de email y Teams).
- Cualquiera con permiso de edición puede registrar una decisión: la aplicación lo anota pero no lo impide; si hace falta separar funciones, se hace con permisos de SharePoint.
