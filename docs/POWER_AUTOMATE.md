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
- Contratos por renovar (flujo 5).
- Certificaciones por caducar (`IT_16_TeamSkills`, filtro `Status eq 'ACTIVE' and CertificationExpiry le '@{addDays(utcNow(), 60, 'yyyy-MM-dd')}T12:00:00Z'`; los 60 días son `AppConfig.people.certificationWarningDays`).
- Artículos por revisar (`IT_18_KnowledgeBase`, filtro `Status eq 'PUBLISHED' and ReviewDate lt '@{concat(utcNow('yyyy-MM-dd'), 'T00:00:00Z')}'`).

Termina con un enlace a la pestaña **Panel** de la aplicación, que muestra lo mismo con más detalle.

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
