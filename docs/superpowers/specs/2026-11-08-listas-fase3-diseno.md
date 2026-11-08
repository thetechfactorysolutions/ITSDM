# ITSDM — Listas restantes, fase 3 (servicio y operación): diseño

Fecha: 2026-11-08. Cuarto bloque del roadmap. Igual que en las fases anteriores, **todos los campos y reglas son decisión mía**, pensados para ajustarse después.

## 1. Alcance

Cuatro listas: **KPIs** (`IT_05_KPIs`), **incidentes** (`IT_13_Incidents`), **interacciones** (`IT_14_Interactions`) y **cambios** (`IT_15_ChangeRequests`). Queda para la última fase: personas y conocimiento.

## 2. Objetivos y no objetivos

**Objetivos**
1. Una pantalla por lista con todo lo común (búsqueda, filtros, orden, detalle, archivar, borrar, CSV, idiomas).
2. Saber de un vistazo **qué incidentes han superado su plazo**, qué **KPIs están fuera de objetivo** y qué **seguimientos de interacciones están vencidos**.
3. Que los cambios de riesgo alto o de emergencia **necesiten aprobación** antes de aprobarse, con el motor que ya existe.
4. Que el Panel resuma el estado del servicio.

**No objetivos:** historial de mediciones de un KPI (solo se guardan el valor actual y el anterior), cálculo automático de KPIs desde otras listas, medición de plazos en horas (las fechas son días), integración con herramientas de tickets, importar estos datos desde reuniones.

## 3. Decisiones (mías, ajustables)

### Incidentes
- Campos: título, ID, descripción, estado, **gravedad** (Baja, Media, Alta, Crítica), categoría (Aplicación, Infraestructura, Red, Seguridad, Accesos, Otra), quién lo comunicó, **asignado a**, fecha de comunicación, fecha de resolución, resolución, causa raíz, proyecto y proveedor relacionados.
- Estados: Nuevo → En curso ⇄ En espera → Resuelto → Cerrado (un incidente resuelto o cerrado se puede reabrir como En curso).
- **Plazo (SLA) por gravedad, en días:** Crítica 1, Alta 3, Media 7, Baja 14, contados desde la fecha de comunicación (`AppConfig.service.slaDays`). Un incidente no resuelto **supera el plazo** cuando hoy es posterior a su fecha límite. Se calculan la fecha límite y los días abierto.
- Al pasar a Resuelto se rellena la fecha de resolución (hoy) si estaba vacía; al reabrir se vacía. Resuelto y Cerrado se ocultan por defecto.

### Cambios (`IT_15_ChangeRequests`)
- Campos: título, ID, qué cambia, motivo, estado, tipo (Estándar, Normal, Emergencia), riesgo (Bajo, Medio, Alto), fecha prevista, fecha de implantación, plan de vuelta atrás, solicitante, proyecto.
- Estados: Borrador → Enviado → Aprobado o Rechazado → Implantado (final). Un rechazado puede volver a Borrador; un enviado puede devolverse a Borrador.
- **Aprobación (regla nueva `change.approve`):** pasar a *Aprobado* un cambio de **riesgo alto** o de **emergencia** necesita una aprobación registrada (el visto bueno del comité o de quien corresponda). Los de riesgo bajo o medio y tipo estándar o normal no.
- Al pasar a Implantado se rellena la fecha de implantación (hoy) si estaba vacía.

### Interacciones (`IT_14_Interactions`)
- Registro de contactos con partes interesadas: asunto, ID, tipo (Reunión, Llamada, Email, Taller, Otra), fecha, persona de contacto y su email, organización, resumen, siguientes pasos, **fecha de seguimiento**, responsable, proyecto, proveedor y reunión.
- Estados: Registrada → Seguimiento pendiente → Hecha (libre entre ellas, salvo que Hecha vuelve a Seguimiento pendiente o Registrada).
- Un **seguimiento vencido** es una interacción en Seguimiento pendiente cuya fecha de seguimiento ya pasó.

### KPIs (`IT_05_KPIs`)
- Campos: nombre (título), ID, descripción, categoría (Servicio, Entrega, Finanzas, Personas, Otra), estado (Activo, Retirado), unidad (texto libre: %, días, número…), **sentido** (cuanto más alto mejor, cuanto más bajo mejor), objetivo, valor actual, valor anterior, fecha de la medición, responsable, proyecto.
- **Salud (calculada):** *En objetivo* si el valor actual cumple el objetivo; *En riesgo* si está dentro del 10 % de margen; *Fuera de objetivo* si no. Para "más alto mejor": actual ≥ objetivo, o ≥ 90 % del objetivo. Para "más bajo mejor": actual ≤ objetivo, o ≤ 110 % del objetivo.
- **Tendencia (calculada):** *Mejora*, *Empeora* o *Estable* al comparar el valor actual con el anterior según el sentido; sin valor anterior no hay tendencia.
- Al **cambiar el valor actual** al guardar, el valor anterior pasa a ser el que había y la fecha de la medición es hoy.
- Retirado se oculta por defecto.

### Pestaña y Panel
- Pestaña **Operación** con cuatro vistas: Incidentes, Cambios, Interacciones y KPIs.
- Panel: tarjetas de **incidentes abiertos** y **fuera de plazo**, **KPIs fuera de objetivo** y **seguimientos vencidos**; los mismos avisos en "Requiere atención"; las aprobaciones pendientes de cambios en su lista.

## 4. Esquema

Cuatro listas nuevas en el paquete con datos de ejemplo que muestran cada caso (un incidente fuera de plazo, un KPI en cada salud, un seguimiento vencido y un cambio de riesgo alto esperando aprobación). Versión 1.6.0.0. La lista de cambios recibe las siete columnas de aprobación.

## 5. Riesgos

Sin probar contra el tenant. Plazos en días, sin horas. Los márgenes y los plazos por gravedad son los primeros candidatos a cambiar.
