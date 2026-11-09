# Aprobaciones

Algunos cambios no deberían hacerse sin el visto bueno de otra persona. La aplicación los **bloquea** hasta que exista una aprobación, te ayuda a **pedirla** por email o por Teams y **registra** quién decidió, cuándo y con qué comentario.

## Reglas incluidas

| Regla | Se aplica a | Necesita aprobación cuando | Estado |
| --- | --- | --- | --- |
| `idea.validate` | Ideas | la idea pasa a **Validada** | Activa |
| `project.overBudget` | Proyectos | la previsión supera el presupuesto en **más de un 10 %** y el cambio introduce o aumenta ese exceso | Activa |
| `project.highBudgetStart` | Proyectos | un proyecto con presupuesto de **100.000 o más** pasa a **Activo** | Activa |
| `capex.commit` | CAPEX | un gasto de **50.000 o más** pasa a **Comprometido** o **Pagado** | Activa |
| `opex.commit` | OPEX | un gasto cuyo importe **anual** (importe x 12, 4 o 1 según la frecuencia) es de 50.000 o más pasa a Comprometido o Pagado | Activa |
| `contract.activate` | Contratos | un contrato de **50.000 o más** de importe anual pasa a **Activo** (también al renovarlo) | Activa |
| `change.approve` | Cambios | un cambio de **riesgo alto** o de **emergencia** pasa a **Aprobado** | Activa |
| `article.publishPolicy` | Base de conocimiento | un artículo de categoría **Política** pasa a **Publicado** | Activa |
| `initiative.activate` | Iniciativas | una iniciativa pasa a **Activa** | **Desactivada** (ejemplo) |

Los umbrales (10 %, 100.000 y 50.000) están en `spfx/src/config/AppConfig.ts`, en `approvals` (`overBudgetRatio`, `highBudget` y `highSpend`).

## Cómo funciona, paso a paso

Ejemplo: un proyecto con presupuesto 100.000 y previsión 100.000, y quieres subir la previsión a 120.000.

1. Edita el proyecto, cambia la previsión y pulsa **Guardar**. No se guarda: el panel explica *"Este cambio necesita aprobación: Previsión por encima del presupuesto…"*.
2. Elige **quién debe aprobarlo** (la aplicación recuerda el último) y pulsa **Solicitar aprobación**. Se guarda la solicitud como **Pendiente**, **sin** aplicar el cambio.
3. Pulsa **Abrir email** o **Abrir Teams**: se abre el mensaje ya redactado (qué, por qué, quién lo pide y dónde verlo). Tú lo envías; la aplicación no envía nada.
4. Cuando te respondan, registra la decisión con **Aprobar** o **Rechazar** (con comentario opcional), desde el propio elemento o desde el **Panel**, que muestra las aprobaciones pendientes y el contador.
5. Si se aprobó, vuelve a guardar el cambio: ahora sí se aplica, y la aprobación **se consume** (sirve una sola vez, para ese cambio). Si se rechazó, el cambio sigue bloqueado y puedes pedir una nueva.

La tabla marca con "Pendiente" los elementos con una aprobación en espera.

## Por dónde no se puede saltar la regla

- **El formulario:** bloquea el guardado.
- **El cambio rápido de estado en la tabla** y **Archivar:** si el cambio necesita aprobación, avisa de que hay que abrir el elemento.
- **Importar CSV:** una fila en un estado protegido no se importa.
- **Crear un elemento ya en un estado protegido:** se bloquea con el aviso de crearlo primero en un estado normal y pedir la aprobación después, porque la aprobación vive en un elemento que ya existe.
- **Importar una reunión:** siempre crea en el estado inicial, así que no la activa.

## Cómo añadir una regla nueva

Todo está en **un solo archivo**: `spfx/src/rules/approvals.ts`, lista `APPROVAL_RULES`.

1. Añade una entrada:

   ```ts
   rule({
     id: 'action.criticalClose',          // único; no lo cambies una vez en uso
     entity: 'actions',                   // ideas | initiatives | projects | actions | capex | opex | contracts | changes
     enabled: true,
     // true cuando ESTE cambio necesita aprobación. `current` es undefined si el elemento es nuevo.
     requires: (current, next) =>
       next.status === ActionStatus.DONE && next.priority === ActionPriority.CRITICAL &&
       (!current || current.status !== ActionStatus.DONE)
   })
   ```

   Si la regla usa enums que `approvals.ts` aún no importa (en este ejemplo `ActionStatus` y `ActionPriority`), añádelos a la línea `import { … } from '../models'` de ese archivo.

2. Añade sus dos textos en `spfx/src/i18n/en.ts` y `es.ts`:

   ```
   'approval.rule.action.criticalClose.title': 'Close a critical action',
   'approval.rule.action.criticalClose.why': 'A critical action must be approved before it is closed.',
   ```

3. Ejecuta `npm test`. Un test falla si a una regla le falta el texto en algún idioma, o si hay dos reglas con el mismo id.

No hay que tocar pantallas: el formulario, el cambio rápido, el CSV y el Panel leen esa lista.

**Para activar una regla ya escrita** (como `initiative.activate`), cambia `enabled: false` por `true`.

Una regla debería comparar `current` y `next` para disparar solo cuando el cambio *introduce* la situación; si no, cada edición posterior del mismo elemento volvería a pedir aprobación. Mira `project.overBudget` como modelo.

## Qué queda registrado

En cada elemento: la regla aprobada, el estado (Sin aprobación, Pendiente, Aprobada, Rechazada), a quién se pidió, cuándo, quién decidió, cuándo y el comentario. Con el historial de versiones activado (pestaña Ayuda), SharePoint conserva además cada cambio.

## Límites

- **Una sola aprobación activa por elemento.** Si un cambio dispara dos reglas a la vez, se pide una cada vez.
- **Quién puede decidir:** cualquiera con permiso de edición en la lista. La aplicación anota quién y cuándo, pero no lo impide. Si hace falta separar funciones, se hace con permisos de SharePoint.
- **Los avisos los envías tú.** Si quieres que los recordatorios salgan solos, mira el flujo 4 de `docs/POWER_AUTOMATE.md`.
- **Los enlaces de email y de Teams** dependen de tener un programa de correo y Teams configurados en el equipo; no se han probado contra tu tenant.
- Las listas ya creadas no se migran: las columnas de aprobación aparecen al volver a añadir la aplicación al sitio, o con los scripts de `spfx/scripts/`.

También protege **aprobar un caso de negocio** de importe alto (regla `case.approve`, el mismo umbral de gasto alto que los contratos y los gastos). Ver `ASUNTOS.md` y el diseño de los módulos nuevos en `superpowers/specs/2026-11-09-modulos-servicio-diseno.md`.
