# ITSDM — Listas restantes, fase 2 (dinero y proveedores): diseño

Fecha: 2026-11-08. Tercer bloque del roadmap. Igual que en la fase 1, **todos los campos y reglas son decisión mía**, pensados para ajustarse después.

## 1. Alcance

Cinco listas: **presupuestos** (`IT_06_Budgets`), **CAPEX** (`IT_07_CAPEX`), **OPEX** (`IT_08_OPEX`), **proveedores** (`IT_09_Vendors`) y **contratos** (`IT_10_Contracts`). Quedan para otras fases: servicio y operación; personas y conocimiento.

## 2. Objetivos y no objetivos

**Objetivos**
1. Una pantalla por lista con todo lo común (búsqueda, filtros, orden, detalle, archivar, borrar, CSV, idiomas).
2. Ver **cuánto se ha comprometido de cada presupuesto** sumando sus gastos CAPEX y OPEX, y avisar cuando se acerca o se pasa.
3. Ver **qué contratos hay que renovar** antes de que venzan.
4. Que los gastos y contratos grandes **necesiten aprobación**, usando el motor de aprobaciones que ya existe.
5. Que proyectos y proveedores muestren sus gastos y contratos en el detalle.

**No objetivos:** conversión de divisas (los importes no llevan moneda, como en los proyectos), contabilidad real o conciliación con facturas, imputación de gasto a meses, importar estos datos desde reuniones, comparación de ofertas entre proveedores.

## 3. Decisiones (mías, ajustables)

### Presupuestos (`IT_06_Budgets`)
- Campos: título, ID, ejercicio (año), descripción, estado, importe previsto, responsable.
- Estados: Borrador → Aprobado → Cerrado (un presupuesto cerrado se puede reabrir como Aprobado).
- **Cifras calculadas** (no se guardan), sumando los gastos que lo apuntan por su ID y no están Cancelados: **comprometido** (CAPEX por su importe + OPEX por su importe anualizado), **pagado** (solo los Pagados), **restante** y **% usado**.
- Niveles: **Correcto** hasta el 90 %, **Cerca del límite** del 90 % al 100 %, **Superado** por encima del 100 %.

### CAPEX (`IT_07_CAPEX`) y OPEX (`IT_08_OPEX`)
- Comunes: título, ID, descripción, estado, importe, fecha, responsable, y vínculos a presupuesto, proyecto y proveedor (y contrato en OPEX).
- Estados de gasto: Previsto → Comprometido → Pagado, o Cancelado (se puede volver a Previsto).
- CAPEX añade referencia de factura. OPEX añade **frecuencia** (Único, Mensual, Trimestral, Anual): el importe es por ocurrencia y el **anualizado** es importe × 1, 12, 4 o 1. El presupuesto cuenta el anualizado.

### Proveedores (`IT_09_Vendors`)
- Campos: nombre (título), ID, descripción, estado, categoría (Software, Hardware, Servicios, Telecomunicaciones, Cloud, Otra), contacto (nombre y email), web, responsable de la relación.
- Estados: Activo, En revisión, Inactivo (libre entre ellos). Inactivo se oculta por defecto.

### Contratos (`IT_10_Contracts`)
- Campos: título, ID, proveedor (selector), descripción, estado, fecha de inicio y de fin, **días de preaviso** (90 por defecto), importe anual, renovación automática (Sí/No), responsable, proyecto.
- Estados: Borrador → Activo → Vencido o Rescindido (un contrato Vencido puede volver a Activo al renovarse; Rescindido es final).
- **Alerta calculada:** un contrato Activo está **por renovar** cuando faltan menos días que su preaviso, y **vencido sin cerrar** si su fecha de fin ya pasó. El Panel cuenta los que requieren atención.

### Aprobaciones de gasto (reutilizan el motor de aprobaciones)
Umbral `highSpend` = 50.000 en `AppConfig`. Reglas nuevas, activas:
| Regla | Necesita aprobación cuando |
| --- | --- |
| `capex.commit` | un gasto CAPEX de 50.000 o más pasa a Comprometido o Pagado |
| `opex.commit` | un gasto OPEX cuyo importe **anualizado** es 50.000 o más pasa a Comprometido o Pagado |
| `contract.activate` | un contrato de 50.000 o más de importe anual pasa a Activo |

CAPEX, OPEX y contratos reciben las siete columnas de aprobación. El Panel incluye sus aprobaciones pendientes.

### Pestañas y Panel
- **Finanzas** (Presupuestos, CAPEX, OPEX) y **Proveedores** (Proveedores, Contratos).
- Panel: tarjetas "Contratos por renovar" y "Presupuestos superados", mensajes en "Requiere atención" y un gráfico de **previsto frente a comprometido** por presupuesto.
- Detalles: el presupuesto muestra sus cifras y sus gastos; el proveedor, sus contratos y gastos; el proyecto, sus gastos CAPEX y OPEX.

## 4. Esquema

Cinco listas nuevas en el paquete con datos de ejemplo: un presupuesto cerca del límite, otro superado, un contrato por renovar y un gasto con aprobación pendiente. Versión 1.5.0.0.

## 5. Riesgos

Sin probar contra el tenant. Importes sin moneda. Los umbrales y las fórmulas (anualización, niveles) son los primeros candidatos a cambiar.
