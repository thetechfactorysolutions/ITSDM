# Fase 1: identidad visual, tarjetas, copias y archivos enlazados

Fecha: 2026-11-10. Paquete 1.14.0.0 (39 listas).

## Pedido

Tarjetas en lugar de lista; iconos e imágenes más nuevos e identificativos; poder migrar las listas a otro SharePoint sin perder datos; relacionar adjuntos (de correos o guardados) con el OneDrive personal.

## Decisiones (de la persona usuaria)

- Archivos de OneDrive: **solo pegar enlaces**, sin permisos de administrador (descartados el selector con Graph y la lectura de correos).
- Entrega por fases con un commit cada una. Esta es la fase 1; la fase 2 son vistas guardadas, acciones en bloque y avisos; la fase 3, Kanban, calendario y el resto.

## Decisiones mías

- Identidad = emoji + degradado por módulo y por lista, en un solo fichero; no se añaden imágenes ni fuentes (compatible con la política de contenido de SharePoint y sin dependencias).
- Copia con el mismo formato que el modo local para poder pasar de uno a otro; restaurar solo rellena listas vacías (idempotente) y reapunta favoritos y archivos enlazados a los nuevos números.
- Los archivos enlazados van en una lista única `IT_39_FileLinks`, como los favoritos.
- Las tarjetas son la vista por defecto; la tabla sigue disponible.

## Fuera de alcance

Copiar los adjuntos de SharePoint, el historial de versiones y las fechas/autor originales; Graph.
