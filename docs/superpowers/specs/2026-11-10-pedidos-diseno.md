# Pedidos: solicitudes, aprobación, POs y roles

Fecha: 2026-11-10. Paquete 1.11.0.0. Sustituye a la app de Power Apps "Pedidos" que usa hoy para Bechtle.

## Para qué

Hoy se pide por correo, el proveedor contesta y no queda un sitio donde ver qué se pidió, cuánto costó, de qué PO sale y qué falta por llegar. Se quiere **una pestaña Pedidos** donde un usuario crea una solicitud, al responsable le llega como pendiente, la aprueba y el pedido sigue su camino hasta "recibido", descontando de la PO.

## Objetivos

- Solicitud sencilla para cualquier usuario del sitio.
- Pendientes de aprobar visibles de un vistazo (pestaña y panel de inicio).
- Varios proveedores (Lyreco, Bechtle, los que se añadan): se reutiliza la lista de **Proveedores** que ya existe.
- Presupuesto por **PO**: la PO y su importe se escriben a mano; el restante se **calcula** con lo que se va pidiendo.
- **Roles**: quien solo mira, quien solicita, quien gestiona el pedido (cambia estado y fechas) y quien aprueba.
- Meter datos con facilidad: **importar CSV** con plantilla descargable, con las columnas de la app actual.
- Categorías de **texto libre**, igual que en los enlaces (se escribe una nueva y queda disponible).

## No objetivos

- No envía correos al proveedor ni los lee: el pedido al proveedor sigue yendo por correo; la app apunta el estado.
- No hay acceso de proveedor todavía. Queda previsto el rol *solo lectura* y los permisos de SharePoint (invitados externos), sin construirlo.
- Los roles de la app **no sustituyen a los permisos de SharePoint**: ocultan botones y bloquean campos, pero quien tenga permiso de edición en la lista podría cambiar datos desde SharePoint. Para restringir de verdad, ver docs.

## Datos (3 listas nuevas, 34 → 37)

- `IT_35_PurchaseOrders`: PoId, Title (número de PO), VendorId, Amount, Status (OPEN, CLOSED), Notes.
- `IT_36_Purchases`: PurchaseId, Title (producto), Quantity, UnitPrice, Amount, Category (texto), VendorId, PoNumber (texto, el Title de una PO), Status (REQUESTED, APPROVED, ORDERED, RECEIVED, REJECTED, CANCELLED), RequestedBy, RequestedOn, OrderedOn, ReceivedOn, DecisionBy, DecisionDate, DecisionNotes, Reason, Notes.
- `IT_37_PurchaseRoles`: Title (nombre), UserUPN, Role (APPROVER, BUYER, REQUESTER, VIEWER), Notes.

## Reglas

- **Importe**: si hay precio unitario, importe = cantidad × precio; si no, se usa el importe escrito (así entra el histórico, que solo trae el importe total).
- **Restante de una PO** = importe de la PO − suma de los pedidos de esa PO en estado APPROVED, ORDERED o RECEIVED. Las solicitudes pendientes (REQUESTED) con esa PO se muestran aparte como "pendiente de aprobar". Aviso naranja a partir del 90 %, rojo si se pasa.
- **Estados**: REQUESTED → APPROVED o REJECTED (aprobador) o CANCELLED (el solicitante, la suya); APPROVED → ORDERED o CANCELLED; ORDERED → RECEIVED o CANCELLED; RECEIVED y REJECTED solo los reabre el aprobador (a ORDERED / REQUESTED). Al pasar a ORDERED o RECEIVED se rellena la fecha si está vacía; al decidir se anotan quién y cuándo.
- **Roles** (en la app):
  - Solicitante: crea solicitudes, ve **solo las suyas** y puede editarlas o cancelarlas mientras estén REQUESTED.
  - Gestor de pedidos: ve todo; cambia estado (APPROVED→ORDERED→RECEIVED), fechas, PO y notas. No aprueba ni toca importes.
  - Aprobador: todo, además de aprobar o rechazar con comentario, gestionar POs y roles.
  - Solo lectura: ve todo, no cambia nada (el futuro acceso de proveedor).
- **Arranque**: mientras no exista ningún aprobador en la lista de roles, todos los que abren la app son aprobadores (el caso de hoy, una sola persona). Al crear el primero, las reglas se aplican. Quien no está en la lista es solicitante.

## Pantallas

Pestaña **Pedidos** con tres apartados:

1. **Pedidos**: arriba, las solicitudes por aprobar con Aprobar y Rechazar (aprobador). Un resumen con elegir PO (importe, gastado, restante), fechas desde/hasta e **importe total** de lo que se ve. Debajo la tabla con buscar, estado, exportar e importar CSV.
2. **POs**: una tabla con importe, gastado, pendiente y restante por PO (aprobador edita).
3. **Roles**: quién puede qué (aprobador).

En el **panel de inicio**: tarjetas "Solicitudes por aprobar", "Pedidos sin recibir" y "POs cerca del límite", y avisos que abren la pestaña. En la **agenda**: nada nuevo.

## Importar

Plantilla con las columnas de la app actual: Quantity, Title (producto), RequestedBy (usuario), RequestedOn, Amount, PoNumber, ReceivedOn, Notes, Status (RECEIVED o ORDERED; Sí/No se acepta como RECEIVED/ORDERED). Los datos reales van en `Datos/`, nunca en Git.

## Decisiones mías (por revisar)

- Las categorías no tienen lista propia (texto libre, con sugerencias de las ya usadas).
- Una solicitud no necesita PO; la asigna quien aprueba o gestiona.
- RECEIVED no es "cerrado" en la tabla: los recibidos se siguen viendo; REJECTED y CANCELLED se ocultan con "Mostrar cerrados".
- Las POs se enlazan por texto (el número), no por identificador, para que el CSV de la app actual encaje tal cual.
