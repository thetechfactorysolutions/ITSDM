# Pedidos: solicitudes, aprobación, POs y roles

Pestaña **Pedidos**. Diseño en `superpowers/specs/2026-11-10-pedidos-diseno.md`. Paquete 1.11.0.0 (37 listas).

## El recorrido

```
Un usuario pide ──► SOLICITADO ──aprueba──► APROBADO ──pedido al proveedor──► PEDIDO ──llega──► RECIBIDO
                        │                       │
                        └─ rechaza / cancela ───┴─► RECHAZADO / CANCELADO
```

- **Solicitar:** *Pedidos → Nueva solicitud*: producto, cantidad, precio unitario (o importe), categoría, proveedor y motivo. Queda **Solicitado**.
- **Aprobar:** el aprobador ve arriba *Esperan tu aprobación* con **Aprobar** y **Rechazar** (con comentario opcional). Se anota quién decidió y cuándo. También lo ves en el **Panel**, que además avisa.
- **Seguir el pedido:** el pedido al proveedor sigue yendo por correo; en la app se cambia el estado (Pedido, Recibido) desde la tabla o editando. Al pasar a Pedido o a Recibido se pone la fecha de hoy si está vacía.
- **Proveedores:** Lyreco, Bechtle y los que quieras: se usan los de la pestaña *Proveedores*. Para añadir uno, créalo allí.
- **Categorías:** se escribe una nueva en el propio campo y queda disponible como sugerencia, igual que en los enlaces.

## POs y presupuesto

*Pedidos → Órdenes de compra*: escribes a mano el **número** y el **importe** de cada PO. El **restante** se calcula: importe de la PO menos lo de las solicitudes de esa PO que estén *Aprobadas, Pedidas o Recibidas*. Lo *Solicitado* con esa PO sale aparte como pendiente de aprobar. Naranja desde el 90 %, rojo si se pasa. Una solicitud no necesita PO al crearla: se la pone quien aprueba o gestiona.

En *Solicitudes* eliges una PO y un rango de fechas, y ves el importe total de lo mostrado y los números de esa PO.

## Roles

Pestaña *Pedidos → Roles* (solo aprobadores). Cuatro papeles:

| Rol | Qué puede hacer |
| --- | --- |
| **Aprobador** | Todo: aprobar o rechazar, editar cualquier campo, gestionar POs y roles, importar, borrar |
| **Gestor de pedidos** | Ve todo; cambia estado (Aprobado → Pedido → Recibido), fechas, PO y notas de lo ya aprobado. No aprueba ni toca importes |
| **Solicitante** | Crea solicitudes y ve **solo las suyas**; las edita o cancela hasta que se decidan. No ve POs ni roles |
| **Solo lectura** | Ve todo, no cambia nada (pensado para dar acceso a un proveedor más adelante) |

Reglas: **mientras no haya ningún aprobador en la lista, todos los que abren la app lo son** (tu caso hoy). Añádete a ti primero como aprobador, y luego a los demás. Quien no está en la lista es solicitante.

> **Ojo, es del lado de la aplicación.** Los roles ocultan botones y bloquean campos, pero no son seguridad: quien tenga permiso de edición en la lista de SharePoint podría cambiar datos desde SharePoint. Para restringir de verdad: en las listas `IT_36_Purchases`, `IT_35_PurchaseOrders` y `IT_37_PurchaseRoles`, *Configuración de la lista → Configuración avanzada → Permisos de nivel de elemento* (los solicitantes solo ven y editan los suyos) y *Detener la herencia de permisos* para las POs y los roles (solo aprobadores). Antes de dar acceso a un proveedor, consulta qué permite tu empresa para invitados externos.

## Meter los datos

1. **Importar CSV** (en *Solicitudes* y en *Órdenes de compra*; solo aprobadores): botón *Descargar una plantilla*, o usa `Datos/Plantillas/plantilla-Pedidos.csv`, que tiene **las columnas de tu app actual**: Cantidad, Producto, Usuario, Fecha Pedido, Importe, PO, Fecha Recibido, Notas y Recibido (Sí/No).
2. Importa **primero las POs** y **después los pedidos**.
3. Las fechas valen como `28/10/2026` o como las muestra la app actual (`Wed, Oct 28, 2026`). *Recibido = Sí* entra como Recibido; *No*, como Pedido. El importe se toma tal cual si no hay precio unitario; con precio unitario, es cantidad por precio.
4. Antes de importar ves la vista previa con lo que está bien y lo que no. Los datos reales van en `Datos/`, nunca en Git.

## Límites

- No envía ni lee correos: el pedido al proveedor se sigue haciendo por correo.
- No hay acceso de proveedor todavía (el rol de solo lectura y los permisos de SharePoint lo dejan preparado).
- Una PO se enlaza por su número (texto), no por identificador: si cambias el número de una PO, cambia también el de sus solicitudes (se puede con una importación nueva).
- Pendiente de probar en tu sitio de SharePoint.
