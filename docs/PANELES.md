# Paneles, favoritos y búsqueda rápida

Diseño en `superpowers/specs/2026-11-10-paneles-ux-diseno.md`. Paquete 1.12.0.0 (38 listas).

## Resumen en cada pantalla

Todas las tablas (36) abren con una franja **Resumen** encima:

- **Cifras pulsables**: Total, Abiertos, Vencidos (si la lista tiene fecha límite), Míos (si tiene responsable), Favoritos y Esta semana. Pulsar una **filtra la tabla**; arriba aparece *Filtro: …* con una cruz para quitarlo. Algunas pantallas añaden las suyas: Pedidos (por aprobar, por llegar), Contratos (por renovar), Stock (bajo mínimo, pedidos con retraso) y Proveedores (con algo pendiente).
- **Estados** con su cuenta; pulsar uno filtra por ese estado.
- **Lo más usado**: gráficos de barras por los campos que se repiten en esa lista (categoría, proveedor, responsable, prioridad, gravedad, país, área; hasta dos). Pulsar una barra filtra.
- **Favoritos** (los tuyos en esa lista) y, en listas largas, **modificados hace poco**.
- Se pliega con el título y **se recuerda** por pantalla.

## Favoritos

La estrella de cada fila. Son **personales** (cada uno ve los suyos) y se guardan en **una sola lista**, `IT_38_Favorites`, para las 36 pantallas, así que los ves en cualquier equipo. El **Panel de inicio** tiene *Mis favoritos* de todas las pantallas: al pulsar uno se abre su pestaña ya buscándolo.

## Proveedores

Columna **Pendiente**: la cifra suma incidencias abiertas, contratos y garantías por renovar, seguimientos vencidos y compras por aprobar o por llegar (pasa el ratón por encima para ver el desglose). El Resumen añade *Con algo pendiente*, **Los más usados** (por cuántos registros de toda la aplicación lo mencionan: incidencias, contratos, compras, gastos, enlaces...) y **Con más pendiente**.

## Búsqueda rápida

**Ctrl+K** (o el botón *Buscar* de la cabecera) abre una caja: escribe para saltar a una pestaña o encontrar un registro por su título (ideas, proyectos, proveedores, contratos, pedidos, incidencias, notas...). Flechas y Enter. Al elegir un registro se abre su pestaña **con la búsqueda ya escrita**.

## Agilidad en las tablas

- Se recuerdan por pantalla el filtro de estado, *Mostrar cerrados* y el orden.
- La tecla **/** salta a la búsqueda.
- Una lista vacía ofrece *Nuevo* e *Importar CSV* en lugar de un texto.

## Límites

- Los favoritos son personales; lo "principal" para todos sale del reparto *Los más usados*.
- La búsqueda rápida abre la pestaña y filtra su lista, pero no abre el sub-apartado exacto cuando una pestaña tiene varios (por ejemplo Contratos dentro de Proveedores): la búsqueda queda esperando y se aplica al abrir ese apartado.
- El resumen se calcula en el navegador con lo ya cargado; no hay consultas nuevas.
- Pendiente de probar en tu sitio de SharePoint. La lista de favoritos hay que crearla con el aviso *Crear las listas que faltan*.
