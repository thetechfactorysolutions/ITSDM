# Asuntos, bandeja, agenda y enlaces

Una sola herramienta para ver todo lo pendiente, venga del correo, de Teams o de tu cabeza, y para consultar lo que ya cerraste. Diseño en `superpowers/specs/2026-11-09-asuntos-bandeja-diseno.md`. Versión del paquete: 1.8.0.0.

## El recorrido de un asunto

```
Correo marcado ─┐
Mensaje de Teams ├─►  BANDEJA  ──clasificar (eliges un área)──►  ABIERTOS  ──hecho o descartado──►  HISTÓRICO
Añadir rápido ──┘   (sin clasificar)                      (abierto, en curso, en espera)        (se consulta, no estorba)
```

- **Bandeja:** lo que llega solo (con los flujos de `POWER_AUTOMATE.md`) o lo que añades a mano **sin área**. Abre un elemento con *Editar* ("Clasificar"), elige un **área** y pasa solo a *Abierto*. Una cifra en la pestaña dice cuántos esperan, y el Panel avisa si alguno lleva más de 3 días.
- **Abiertos:** estados *Abierto*, *En curso* y *En espera*. Se ordenan por fecha límite; lo vencido sale en rojo.
- **Histórico:** *Hecho* y *Descartado*, con su fecha de cierre. Se busca por texto, se filtra por estado y se puede reabrir un asunto.
- **Áreas:** pestaña *Áreas*. Se instalan diez de ejemplo (Budget, Peticiones de usuarios, Renovaciones, Edificio, Logística Orange, Retail, Europa y corporación, Incidencias de red, Proyectos e ideas, Proveedores). Renómbralas, archívalas o añade las tuyas: no hay que tocar código.

Cada asunto tiene prioridad, origen (manual, correo, Teams, otro), remitente, fecha de recepción, fecha límite, notas, adjuntos y, si quieres, un vínculo a un **contrato, proyecto, incidencia o proveedor** que ya exista.

**Añadir rápido** (botón de la cabecera, en cualquier pestaña): título, área, fecha y notas. Sin área va a la bandeja; con área, directo a abiertos.

## Agenda

La pestaña **Agenda** reúne todas las fechas de la aplicación: asuntos, acciones, plazos de incidencias, **decisión de renovar y fin** de contratos y de garantías o licencias, seguimientos, revisiones, riesgos, cambios previstos, fines de proyecto, formaciones, certificaciones y artículos por revisar. Arriba, lo atrasado, lo de hoy y los próximos 7 días; debajo, un calendario del mes (pulsa un día para ver qué vence) y lo que viene después. El desplegable filtra por tipo. Lo cerrado no aparece.

## Enlaces

Pestaña **Enlaces**: las páginas que usas (Lenovo, Oracle, la consola de Microsoft 365...), agrupadas por categoría. Las que marques como **fijadas** salen en el Panel. Solo se aceptan direcciones `http` y `https`, y se abren en otra pestaña. Si quieres, enlaza cada una a un proveedor.

## Garantías y licencias

Dentro de la pestaña **Proveedores**. Igual que los contratos: fecha de fin, **días de preaviso** y aviso naranja cuando toca decidir si renovar, rojo cuando terminó y sigue activa. Tipos: garantía, licencia, soporte y suscripción. **No escribas claves de licencia**: solo números de serie o referencias de pedido.

## Adjuntos

En el panel de edición de cualquier lista (contratos, presupuestos, asuntos, proyectos...) hay una sección **Adjuntos**: subir (hasta 25 MB), abrir y quitar ficheros. Se guardan en SharePoint junto al elemento, así que un flujo de Power Automate también puede adjuntar el correo original o sus ficheros (receta en `POWER_AUTOMATE.md`).

- Si una lista dice que los adjuntos están desactivados, la pestaña **Ayuda** tiene un botón para activarlos en todas (hace falta permiso para administrar las listas).
- **En el modo local no hay adjuntos** (ver `MODO_LOCAL.md`).

## Plantillas de proyecto

En **Proyectos**, *Crear desde plantilla* crea el proyecto (en Planificación) y las acciones habituales, con fechas contadas desde la fecha de inicio que elijas. Hay tres: **renovar el helpdesk al estilo de un servicio de referencia**, **app para otro equipo (como una gestión de taquillas)** y **renovación de contrato o licencia**. Después editas lo que quieras. Para añadir otra plantilla: `src/config/projectTemplates.ts` y sus textos en `src/i18n/en.ts` y `es.ts`.

## Compartir algo, como el presupuesto

La aplicación no tiene un botón de compartir; se hace con los permisos de SharePoint, que son los que manda tu empresa:

1. En el sitio, abre la lista (por ejemplo `IT_06_Budgets`) → **Configuración de la lista → Permisos para esta lista**.
2. **Detener la herencia de permisos** y concede **Lectura** solo a las personas que quieras.
3. Esas personas ven **esa lista** en SharePoint (no la aplicación entera, que carga todas las listas). Si quieres enseñar solo una parte, crea una **vista** de la lista con las columnas y filtros que quieras.

Otras vías: el botón **Exportar CSV** de cada pantalla, o un informe de solo lectura (pendiente, ver `ROADMAP.md`). Consulta antes qué permite tu empresa para datos de costes.

## Cómo actualizar una instalación que ya tienes

Las listas nuevas (`IT_23_Matters`, `IT_24_Areas`, `IT_25_Links`, `IT_26_Entitlements`) solo se crean al **añadir la aplicación al sitio**:

1. Sube el `.sppkg` 1.8.0.0 al catálogo y **quita la aplicación del sitio y vuelve a añadirla**. Las listas que ya existen se respetan; no está comprobado en tu tenant qué hace con los datos de las existentes, así que haz antes una copia (CSV de cada lista, o una plantilla del sitio).
2. O ejecuta `scripts/Provision-ItsdmLists.ps1` o pega `scripts/provision-lists.browser.js` en la consola de una página del sitio: crean solo lo que falta y añaden las diez áreas de ejemplo si la lista de áreas está vacía.

## Límites

- Los flujos de entrada (correo y Teams) los creas tú en Power Automate; no van en el paquete ni se han podido probar en tu tenant.
- La agenda muestra las fechas pero no abre el elemento al pulsarlo.
- Las reglas de clasificación (por ejemplo "si el remitente es Lenovo, área Proveedores") van en el flujo, no en la aplicación.
- Un asunto descartado desde la bandeja sin área no puede reabrirse como abierto desde la tabla: ábrelo y elige un área.
