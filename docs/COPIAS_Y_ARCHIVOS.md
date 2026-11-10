# Copias, traslado a otro sitio y archivos enlazados

Paquete 1.14.0.0 (39 listas). Diseño en `superpowers/specs/2026-11-10-fase1-identidad-copias-diseno.md`.

## Copia completa y traslado a otro SharePoint

**Ayuda → Copia de seguridad y traslado a otro sitio.**

1. **Descargar copia completa**: un único archivo `itsdm-backup-AAAA-MM-DD.json` con todas las listas (registros, favoritos y archivos enlazados). Tiene el mismo formato que el archivo del modo local: una copia hecha en SharePoint se abre en el modo local y al revés (sirve también para pasar del modo local a SharePoint).
2. **En el sitio nuevo**: instala el `.sppkg`, abre la aplicación y pulsa *Crear las listas que faltan*.
3. **Ayuda → Restaurar desde un archivo de copia**: eliges el archivo, ves qué lista se copia y cuántos registros, y pulsas *Copiar*.

Reglas:

- **Nada se duplica**: una lista que ya tiene registros se deja como está. Restaurar dos veces no cambia nada.
- **Los números internos cambian** en el sitio nuevo. Los favoritos y los archivos enlazados siguen a su registro; si apuntaban a un registro que ya no existe se descartan (el resultado lo cuenta).
- Una lista con error no detiene a las demás: se informa de cuál falló.
- **No incluye**: los archivos adjuntos dentro de SharePoint (cópialos desde el sitio antiguo) ni el historial de versiones. Las fechas de creación y el autor originales tampoco se conservan: los registros nuevos llevan la fecha y la persona de quien restaura.
- Las listas se leen y escriben con tu propio permiso: hace falta poder crear elementos en el sitio nuevo.

## Archivos enlazados (OneDrive y otros)

En el formulario de cualquier registro, sección **Archivos enlazados**: guarda el archivo en tu OneDrive, *Compartir → Copiar vínculo*, pégalo, y (si quieres) escribe un nombre. Se muestra con el emoji de su tipo (📕 PDF, 📗 Excel, 📘 Word, ✉️ correo…) y se abre en una pestaña nueva. Para el adjunto de un correo: guárdalo en OneDrive y enlaza el archivo.

- Solo se guarda **el enlace y el nombre** (lista `IT_39_FileLinks`); el archivo sigue en tu OneDrive. No hacen falta permisos de administrador ni de Microsoft Graph.
- Solo se aceptan enlaces `http(s)`; se rechaza todo lo demás (por ejemplo `javascript:`).
- Los ve quien pueda ver el registro, pero **abrirlos depende de los permisos del archivo** en OneDrive: comparte el enlace con las personas que lo necesiten.
- Las tarjetas muestran un 📎 con el número de archivos enlazados.
- Quedó fuera a propósito: elegir el archivo desde un selector de OneDrive y leer los correos de Outlook (necesitan permisos de Graph aprobados por un administrador). Se puede añadir más adelante.

## Aspecto

- **Tarjetas por defecto** en todas las listas; la elección (*Tabla / Tarjetas*) se recuerda por lista y la última elegida pasa a ser la de las demás. Cada tarjeta lleva el emoji de su lista sobre un cuadro de color, una barra de color arriba, las etiquetas de estado, prioridad y vencimiento, el responsable y hasta tres datos más de la lista.
- **Cada módulo tiene identidad propia** (emoji y color): en las pestañas, en la cabecera de cada pantalla (con *N en total · N abiertos*), en las tarjetas, en las listas vacías y en la búsqueda rápida. Todo en `src/config/identity.ts`.
