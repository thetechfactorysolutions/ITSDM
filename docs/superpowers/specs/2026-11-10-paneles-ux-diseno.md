# Paneles por pantalla, favoritos y búsqueda rápida

Fecha: 2026-11-10. Paquete 1.12.0.0 (38 listas).

## Para qué

Cada pantalla era una tabla. Se quiere que al abrirla se vea de un vistazo lo importante (lo principal, lo favorito, lo pendiente, lo más usado), todo pulsable, y que moverse por la aplicación sea ágil.

## Qué se hace

1. **Franja de resumen en todas las pantallas de lista (36)**, generada por la pantalla genérica, sin configurar cada una:
   - Cifras pulsables: total, abiertos, vencidos (si la lista tiene fecha límite), míos (si tiene responsable), favoritos y modificados esta semana. Pulsar una **filtra la tabla**; se ve el filtro activo y se quita con una cruz.
   - Estados con su cuenta (pulsar filtra por estado).
   - **Lo más usado**: hasta dos reparto automáticos por los campos que tenga la lista (categoría, proveedor, responsable, prioridad, gravedad, país), con barras pulsables.
   - **Favoritos** de la persona en esa lista y, si hay muchos elementos, **modificados hace poco**.
   - Se puede plegar y se recuerda.
2. **Favoritos**: una estrella en cada fila, y el filtro *Solo favoritos*. Se guardan **por persona** en **una sola lista nueva** (`IT_38_Favorites`: lista, elemento, usuario), así que sirve igual para las 36 pantallas y se ve en cualquier equipo. El Panel de inicio muestra **tus favoritos** de todas las pantallas.
3. **Proveedores**: columna **Pendiente** (incidencias abiertas, contratos y garantías por renovar, seguimientos vencidos, pedidos por aprobar o por llegar) y los reparto **Más usados** (por actividad en todos los módulos) y **Con algo pendiente**.
4. **Búsqueda rápida (Ctrl+K)**: una caja que salta a cualquier pestaña y busca por título en las listas principales.
5. **Agilidad en las tablas**: se recuerdan el filtro de estado, mostrar cerrados y el orden por pantalla; la tecla `/` va a la búsqueda; las listas vacías ofrecen *Nuevo* e *Importar* en lugar de solo un texto.

## No se hace (queda en la lista de ideas)

- Gráficos de evolución en el tiempo, vistas guardadas con nombre, edición en la propia tabla, notificaciones. Ver la lista en el informe final.

## Decisiones mías

- Los favoritos son **personales**, no de equipo: lo "principal" compartido (un proveedor clave para todos) se consigue con el reparto *Más usados*, que sale de la actividad real.
- El resumen se calcula en el navegador con lo ya cargado: no hay consultas ni columnas nuevas en las 36 listas.
- No se lee el contenido de las listas en la búsqueda rápida más que el título.
