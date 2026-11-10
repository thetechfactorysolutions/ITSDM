# Fase 2: vistas guardadas, acciones en bloque y avisos

Paquete 1.15.0.0.

## Vistas guardadas

Junto a la búsqueda de cada lista: **Vistas** (desplegable), **Guardar esta vista…** y, cuando hay una vista elegida, la papelera. Una vista guarda la búsqueda, el estado, *Mostrar cerrados*, el orden y el filtro del resumen que estaba pulsado (por ejemplo *Vencidos* o una barra). Guardar con el mismo nombre la actualiza; hasta 20 por lista. Se guardan **en este navegador** (no se comparten entre equipos ni personas).

## Acciones en bloque

Interruptor **Seleccionar varios**: aparecen casillas (en la tabla y en las tarjetas) y una barra con *N seleccionados*:

- **Cambiar estado** de todos a la vez. Respeta las mismas reglas que el cambio individual: los que no pueden pasar a ese estado desde el suyo o necesitan una aprobación se **dejan como estaban** y el mensaje dice cuántos. Un cambio que consume una aprobación la gasta, igual que uno a uno.
- **Archivar**, **Exportar seleccionados** (CSV), **Seleccionar todos los mostrados**, **Quitar selección**.
- Tras un cambio o un archivado en bloque sale la barra **Deshacer** (9 s): devuelve cada registro a su estado anterior.
- No hay *Eliminar* en bloque a propósito: es definitivo.

## Avisos (pestaña 🔔)

Reúne de todas las listas lo **vencido**, lo que **vence hoy** y lo que **vence esta semana** (se ignoran los cerrados). Pulsar una fila abre su pestaña ya buscándola.

- **Enviármelo por correo**: abre tu programa de correo con el resumen (se recorta si es muy largo).
- **Copiar como texto**.
- **Power Automate**: la app no puede enviar correos sola. La pestaña explica dos opciones: (A) un flujo con *Periodicidad* + *Obtener elementos* de SharePoint con un filtro (se dan ejemplos) + correo o Teams; (B) un flujo con *Cuando se recibe una solicitud HTTP*: pegas su URL (https) y *Enviar el resumen al flujo ahora* le manda el texto y las listas en JSON. La URL se guarda solo en este navegador y no se envía a ningún otro sitio. Como el flujo no contesta a la página, la app solo puede decir «enviado»; se comprueba en el historial de ejecuciones de Power Automate.
- Para que se envíe solo cada mañana sin abrir la app, usa la opción A (no depende de la app).
