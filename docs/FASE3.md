# Fase 3: tablero, calendario, atajos, columnas y más

Paquete 1.16.0.0.

## Cuatro formas de ver cada lista

Junto a la búsqueda: **Tabla · Tarjetas · Tablero · Calendario**. Se recuerda por lista.

- **Tablero** (listas con estados): una columna por estado, en el orden de la lista. Arrastra una tarjeta a otra columna o usa *Mover a* en la tarjeta (sirve con teclado y en el móvil). Solo ofrece los estados permitidos desde el actual y respeta las aprobaciones, igual que el desplegable de la tabla; al soltar en uno no permitido sale un aviso. Los estados cerrados solo aparecen si tienen registros (activa *Mostrar cerrados*).
- **Calendario** (listas con fechas): el mes, con cada registro en su día de vencimiento y coloreado (rojo vencido, naranja hoy, azul esta semana). Flechas de mes y *Hoy*. Los registros sin fecha no se muestran (se indica cuántos).

## Teclado

n nuevo · e editar el seleccionado · j / k bajar y subir · / buscar · Ctrl+K búsqueda rápida. Solo actúan si no estás escribiendo y no hay un formulario o un diálogo abierto.

## Columnas

En la vista Tabla, el desplegable **Columnas** muestra u oculta columnas (siempre queda al menos una). Se recuerda por lista.

## Cambios sin guardar

Si cierras o cancelas un formulario con cambios, pregunta *¿Descartar los cambios?*. Sin cambios, cierra directamente.

## Carga por persona y calidad de los datos

- **Panel de inicio → Carga por persona**: registros abiertos por responsable en todas las listas (con 🔥 los vencidos), los 8 con más carga. No cuenta los que no tienen responsable.
- **Avisos → Calidad de los datos**: registros abiertos sin responsable (en listas que usan responsable), abiertos sin fecha (en listas que usan fechas), títulos repetidos y abiertos sin tocar desde hace más de 90 días. Pulsar una fila abre la lista buscando el primer ejemplo.

## No incluido (y por qué)

- **Modo oscuro**: SharePoint decide el tema de la página y los colores de la aplicación salen del tema de Fluent; forzar uno oscuro desde el elemento web puede afectar a otras partes de la página. Se puede hacer solo para el modo local si lo quieres.
- **Línea de tiempo (Gantt), informe en PDF/PowerPoint, importación de .xlsx, plantillas de registros, acceso de proveedores, presupuesto con alertas al 80 %/100 %** y **abrir con la búsqueda rápida el sub-apartado exacto**: quedan pendientes.
