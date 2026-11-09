# Avisos automáticos con Power Automate

La aplicación **no envía nada por sí sola** (ver `APROBACIONES.md`): calcula los avisos en pantalla y, para pedir una aprobación, te deja el email o el mensaje de Teams redactado. Si quieres que los avisos **salgan solos**, se hace con flujos de Power Automate que leen las mismas listas de SharePoint.

## Qué es esto y qué no es

- Son **recetas**: los flujos se crean en Power Automate, en tu tenant, con tu cuenta. No van dentro del `.sppkg` (un paquete de SPFx no puede instalar flujos) y yo no los he podido probar en tu tenant.
- La aplicación no depende de ellos: si no creas ninguno, todo sigue funcionando. No hace falta tocar el código ni ampliar permisos de la aplicación.
- Cada flujo usa solo conectores estándar incluidos en Microsoft 365: **SharePoint**, **Outlook** y, si quieres, **Teams**.
- Las reglas son las mismas que usa la aplicación (están en `DATA_MODEL.md`). Si cambias un plazo en `AppConfig.ts`, cámbialo también aquí.

## Antes de empezar (una vez)

1. Crea los flujos con una cuenta estable (de servicio, si puedes). Los correos salen **con la cuenta de la conexión de Outlook**, y si esa persona se va, los flujos dejan de funcionar.
2. Esa cuenta necesita leer las listas `IT_*` del sitio.
3. En cada acción **Obtener elementos** (Get items), en **Configuración → Paginación**, activa la paginación con un umbral de 5000. Por defecto solo devuelve 100.
4. Las fechas se guardan como **mediodía UTC** del día (`2026-11-08T12:00:00Z`). Para "antes de hoy" se compara con el inicio del día de hoy en UTC (primera expresión de abajo).
5. Las columnas de elección (Estado, Gravedad…) se pueden filtrar por texto (`Status eq 'DONE'`), pero en una expresión se leen con `item()?['Status']?['Value']`.
6. Los nombres internos de las columnas son los de `SHAREPOINT_SCHEMA.md` (`OwnerUPN`, `DueDate`…). Se crean así al añadir la aplicación al sitio.

Expresiones que se repiten (se escriben en la pestaña **Expresión** del contenido dinámico):

| Para | Expresión |
| --- | --- |
| Inicio de hoy (UTC) para el filtro OData | `concat(utcNow('yyyy-MM-dd'), 'T00:00:00Z')` |
| Enlace a un elemento | `concat('https://TU-TENANT.sharepoint.com/sites/TU-SITIO/Lists/NOMBRE_DE_LA_LISTA/DispForm.aspx?ID=', item()?['ID'])` |
| Enlace a la aplicación | la dirección de la página donde está el elemento web |

## Flujo 1: acciones vencidas, un correo por responsable

**Cuándo:** Recurrencia, cada día laborable a las 08:00 (con tu zona horaria).
**Qué hace:** avisa a cada responsable de sus acciones vencidas. Una acción está vencida si su fecha límite es anterior a hoy y no está Hecha ni Cancelada (igual que en el Panel).

1. **Obtener elementos** de `IT_04_Actions`, con *Consulta de filtro*:
   `Status ne 'DONE' and Status ne 'CANCELLED' and DueDate lt '@{concat(utcNow('yyyy-MM-dd'), 'T00:00:00Z')}'`
2. **Condición:** `length(outputs('Obtener_elementos')?['body/value'])` es mayor que 0. Si no, el flujo termina.
3. **Seleccionar** (Select), *De* = `body/value`, *Asignar* = `item()?['OwnerUPN']`. Después **Redactar** (Compose) con `union(body('Seleccionar'), body('Seleccionar'))`: es la lista de responsables **sin repetir**.
4. **Aplicar a cada uno** sobre ese Redactar (variable `owner` = `items('Aplicar_a_cada_uno')`):
   - **Filtrar matriz** (Filter array), *De* = `body/value` del paso 1, condición `item()?['OwnerUPN']` es igual a `items('Aplicar_a_cada_uno')`.
   - **Crear tabla HTML** con las columnas `ActionId`, `Title` y `DueDate` (formato `formatDateTime(item()?['DueDate'], 'yyyy-MM-dd')`).
   - **Enviar un correo (V2)** a `items('Aplicar_a_cada_uno')`, asunto *"Tienes N acciones vencidas"* (con `length(body('Filtrar_matriz'))`) y la tabla en el cuerpo.

*Si una acción no tiene responsable (`OwnerUPN` vacío), el correo no tiene destinatario: añade una condición que lo salte o redirígelo a ti.*

**Escalado (opcional):** repite el flujo 1 con `DueDate lt` de hace 7 días (`addDays(utcNow(), -7, 'yyyy-MM-dd')` en lugar de hoy) y envía el correo a tu responsable, no al de la acción.

## Flujo 2: proyectos en riesgo

**Cuándo:** Recurrencia, lunes a las 08:00.
**Regla de la aplicación:** un proyecto está en riesgo si su estado es *En riesgo* o si la previsión supera el presupuesto en más de un 10 % (con presupuesto mayor que 0). OData no puede comparar dos columnas, así que se filtra en dos pasos.

1. **Obtener elementos** de `IT_03_Projects`, filtro: `Status ne 'COMPLETED' and Status ne 'CANCELLED'`.
2. **Filtrar matriz** sobre `body/value`, en modo avanzado:
   `@or(equals(item()?['Status']?['Value'], 'AT_RISK'), and(greater(item()?['BudgetAmount'], 0), greater(div(sub(item()?['ForecastAmount'], item()?['BudgetAmount']), item()?['BudgetAmount']), 0.1)))`
3. Si hay resultados: **Crear tabla HTML** (`ProjectId`, `Title`, `OwnerUPN`, `BudgetAmount`, `ForecastAmount`) y **Enviar un correo** a quien dirige TI. Si prefieres Teams: **Publicar un mensaje en un chat o canal**.

## Flujo 3: incidentes fuera de plazo

**Cuándo:** Recurrencia, cada hora en horario laboral (o cada día, según lo estricto que seas).
**Regla:** el plazo es el día en que se comunicó más los días de su gravedad: Crítica 1, Alta 3, Media 7, Baja 14. Está fuera de plazo si ese día ya pasó y el incidente no está Resuelto ni Cerrado.

1. **Obtener elementos** de `IT_13_Incidents`, filtro: `Status ne 'RESOLVED' and Status ne 'CLOSED'`.
2. **Filtrar matriz**, modo avanzado:
   `@less(addDays(item()?['ReportedOn'], if(equals(item()?['Severity']?['Value'], 'CRITICAL'), 1, if(equals(item()?['Severity']?['Value'], 'HIGH'), 3, if(equals(item()?['Severity']?['Value'], 'MEDIUM'), 7, 14)))), startOfDay(utcNow()))`
3. Aviso a la persona asignada (`AssignedTo`) o a ti, con `IncidentId`, `Title`, `Severity`.

## Flujo 4: aprobaciones pendientes que nadie decide

**Cuándo:** Recurrencia, cada día a las 09:00.
**Qué hace:** recuerda a quien debe aprobar. Las listas con aprobaciones son: `IT_01_Ideas`, `IT_02_Initiatives`, `IT_03_Projects`, `IT_04_Actions`, `IT_07_CAPEX`, `IT_08_OPEX`, `IT_10_Contracts`, `IT_15_ChangeRequests` e `IT_18_KnowledgeBase`.

1. **Obtener elementos** de cada una (en paralelo, o un flujo por lista con *Guardar como*), filtro:
   `ApprovalStatus eq 'PENDING' and ApprovalRequestedOn lt '@{addDays(utcNow(), -2, 'yyyy-MM-dd')}T00:00:00Z'` (pendiente desde hace más de 2 días).
2. Un correo a `Approver` con `Title`, `ApprovalRule` y `ApprovalRequestedOn`, y el enlace a la aplicación para decidir.

*La decisión (Aprobar / Rechazar) se sigue registrando en la aplicación; el flujo solo recuerda.*

## Flujo 5: contratos por renovar

**Cuándo:** Recurrencia, lunes a las 08:00.
**Regla:** un contrato **Activo** está por renovar cuando los días que le quedan hasta `EndDate` son menos o iguales que sus `NoticeDays`; y "vencido sin cerrar" cuando esa cifra es negativa.

1. **Obtener elementos** de `IT_10_Contracts`, filtro: `Status eq 'ACTIVE'`.
2. **Filtrar matriz**, modo avanzado:
   `@lessOrEquals(div(sub(ticks(startOfDay(item()?['EndDate'])), ticks(startOfDay(utcNow()))), 864000000000), item()?['NoticeDays'])`
3. Correo al responsable (`OwnerUPN`) con `ContractId`, `Title`, `EndDate` y `AnnualValue`.

## Flujo 6: resumen semanal

**Cuándo:** Recurrencia, lunes a las 08:00.
**Qué hace:** un solo correo a quien dirige TI con los números de la semana.

Combina los pasos de arriba en un solo flujo, sin los bucles por responsable, y escribe el cuerpo con `length(...)` de cada **Filtrar matriz**:

- Acciones vencidas (flujo 1).
- Proyectos en riesgo (flujo 2).
- Incidentes fuera de plazo (flujo 3).
- Aprobaciones pendientes (flujo 4).
- Contratos por renovar (flujo 5) y garantías o licencias por renovar (la variante de arriba).
- Elementos en la bandeja, con cuántos llevan más de 3 días (flujo 9).
- Certificaciones por caducar (`IT_16_TeamSkills`, filtro `Status eq 'ACTIVE' and CertificationExpiry le '@{addDays(utcNow(), 60, 'yyyy-MM-dd')}T12:00:00Z'`; los 60 días son `AppConfig.people.certificationWarningDays`).
- Artículos por revisar (`IT_18_KnowledgeBase`, filtro `Status eq 'PUBLISHED' and ReviewDate lt '@{concat(utcNow('yyyy-MM-dd'), 'T00:00:00Z')}'`).

Termina con un enlace a la pestaña **Panel** de la aplicación, que muestra lo mismo con más detalle.

## Flujo 7: correo marcado → bandeja

**Cuándo:** el disparador de Outlook **Cuando se marca un correo electrónico** (o, si prefieres, **Cuando llega un correo nuevo** limitado a una carpeta `ITSDM` a la que una regla de Outlook mueve lo que te interesa). Mi propuesta es **no** recoger todo el correo: solo lo que marcas o mueves, para que la bandeja no se llene de ruido.
**Qué hace:** crea un asunto en `IT_23_Matters` con estado `INBOX`, sin área, para que lo clasifiques en la aplicación. Si el correo tiene ficheros, los adjunta al asunto.

1. **Redactar** (`asuntoLimpio`): `replace(triggerOutputs()?['body/subject'], '''', '''''')` (dobla los apóstrofos para el filtro OData).
2. **Obtener elementos** de `IT_23_Matters`, *Recuento superior* 1, filtro, para **no duplicar** el mismo correo si lo vuelves a marcar:
   `Title eq '@{outputs('Redactar')}' and Sender eq '@{triggerOutputs()?['body/from']}' and ReceivedOn eq '@{concat(formatDateTime(triggerOutputs()?['body/receivedDateTime'], 'yyyy-MM-dd'), 'T12:00:00Z')}'`
   (`SourceRef` es de texto largo y no se puede filtrar, por eso se compara por asunto, remitente y día).
3. **Condición:** `length(outputs('Obtener_elementos')?['body/value'])` es igual a 0. Si no, el flujo termina.
4. En la rama **Sí**, **Crear elemento** en `IT_23_Matters`:
   - `Title`: `substring(triggerOutputs()?['body/subject'], 0, min(length(triggerOutputs()?['body/subject']), 250))`
   - `MatterId`: `concat('ASU-', utcNow('yyyyMMdd'), '-', toUpper(substring(replace(guid(), '-', ''), 0, 6)))`
   - `Description`: la vista previa del cuerpo (*Body Preview*).
   - `Status`: `INBOX` · `Priority`: `MEDIUM` (o `HIGH` si la importancia del correo es alta) · `Source`: `EMAIL`
   - `Sender`: el remitente (*From*).
   - `ReceivedOn`: `concat(formatDateTime(triggerOutputs()?['body/receivedDateTime'], 'yyyy-MM-dd'), 'T12:00:00Z')`
   - `SourceRef`: el enlace al mensaje. Si el conector lo ofrece, úsalo; si no, `concat('https://outlook.office.com/owa/?ItemID=', encodeUriComponent(triggerOutputs()?['body/id']), '&exvsurl=1&viewmodel=ReadMessageItem')`.
   - `OwnerUPN`: tu correo. `AreaId`: vacío (ver las reglas de abajo).
5. **Adjuntos** (solo si el correo los tiene): **Aplicar a cada uno** sobre los adjuntos del correo → SharePoint **Agregar archivo adjunto** con el *Id* del elemento creado, el nombre del fichero y su contenido. La lista debe tener los adjuntos activados (botón de la pestaña Ayuda).

**Reglas de clasificación (opcional).** Antes del paso 4, un **Redactar** que adivine el área por el remitente o el asunto:
`if(contains(toLower(triggerOutputs()?['body/subject']), 'budget'), 'AREA-DEMO-001', if(contains(toLower(triggerOutputs()?['body/from']), '@lenovo.com'), 'AREA-DEMO-010', ''))`
Usa como `AreaId` ese resultado y como `Status`: `if(empty(outputs('Redactar_2')), 'INBOX', 'OPEN')`. Los identificadores de área son los de la pestaña *Áreas* (campo "ID del área"). Lo que no encaje cae en la bandeja, sin área.

## Flujo 8: mensaje de Teams → bandeja

**Cuándo:** el disparador de Teams **Para un mensaje seleccionado**. Aparece en Teams, en el menú ··· del mensaje → **Más acciones**, con el nombre del flujo.
**Qué hace:** guarda ese mensaje en la bandeja. Solo recoge lo que eliges, no todo Teams.

1. **Crear elemento** en `IT_23_Matters`:
   - `Title`: los primeros 120 caracteres del texto del mensaje (`substring(text, 0, min(length(text), 120))`).
   - `MatterId`: la misma expresión que en el flujo 7.
   - `Description`: el texto completo. `Status`: `INBOX` · `Priority`: `MEDIUM` · `Source`: `TEAMS`
   - `Sender`: quien lo escribió. `ReceivedOn`: `concat(utcNow('yyyy-MM-dd'), 'T12:00:00Z')`
   - `SourceRef`: el enlace al mensaje (*Message link*). `OwnerUPN`: tu correo.
2. Opcional: **Publicar una tarjeta/mensaje** de vuelta al chat diciendo "Guardado en la bandeja".

*Los nombres exactos de los campos del disparador los ves en el contenido dinámico; no los he podido probar en tu tenant.*

## Flujo 9: la bandeja se acumula

**Cuándo:** Recurrencia, cada día laborable a las 08:30.
**Regla:** un elemento de la bandeja es antiguo si lleva más de 3 días sin clasificar (`AppConfig.matters.inboxStaleDays`).

1. **Obtener elementos** de `IT_23_Matters`, filtro: `Status eq 'INBOX'`.
2. **Condición:** hay más de 0. Si no, termina.
3. **Filtrar matriz** sobre `body/value`: `@less(ticks(item()?['ReceivedOn']), ticks(addDays(utcNow(), -3)))` (los antiguos).
4. Correo a ti con *"Tienes N elementos en la bandeja, M con más de 3 días"* y una **tabla HTML** (`Title`, `Sender`, `ReceivedOn`), más el enlace a la aplicación.

## Garantías y licencias por renovar

Es el **flujo 5** cambiando la lista a `IT_26_Entitlements`, el filtro a `Status eq 'ACTIVE'` y el título del correo ("garantías y licencias por renovar"). La expresión de *Filtrar matriz* es la misma, porque `EndDate` y `NoticeDays` se llaman igual.

## Prueba antes de fiarte

1. Crea el flujo y pulsa **Probar → Manualmente**.
2. Las listas de ejemplo ya traen casos para ver cada aviso: una acción vencida, un proyecto por encima del presupuesto, un incidente fuera de plazo, un contrato por renovar, una certificación por caducar, un artículo para revisar y varias aprobaciones pendientes. Por eso conviene probar **antes** de borrar los datos de ejemplo.
3. Todos los datos de ejemplo tienen como responsable `demo.owner@example.com`, que no existe: en las pruebas cambia el destinatario por tu correo para no generar rebotes.
4. Si el flujo no devuelve nada, mira el resultado de **Obtener elementos**: casi siempre es el filtro de fecha o la paginación.

## Limitaciones

- Los flujos funcionan mientras la cuenta de la conexión siga activa y con acceso al sitio.
- No hay aviso en tiempo real al crear o cambiar algo; son revisiones periódicas. Para avisar al instante usa un disparador *Cuando se crea o modifica un elemento*, con el cuidado de no avisar dos veces por el mismo cambio.
- Si cambias nombres de columnas o los umbrales de `AppConfig.ts`, hay que actualizar los flujos a mano.
- `spfx/src/services/PowerAutomateService.ts` sigue siendo un esqueleto sin uso: la aplicación no llama a ningún flujo. Si algún día hace falta (por ejemplo, un botón "Enviar aviso ahora"), se haría con un flujo con disparador HTTP y una dirección aprobada por tu administrador.
