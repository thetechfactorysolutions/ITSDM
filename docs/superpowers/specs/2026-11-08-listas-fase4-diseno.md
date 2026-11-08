# ITSDM — Listas restantes, fase 4 (personas y conocimiento): diseño

Fecha: 2026-11-08. Último bloque de listas del roadmap. Igual que en las fases anteriores, **campos y reglas son decisión mía**, pensados para ajustarse después. Con esta fase las 22 listas tienen pantalla.

## 1. Alcance

Tres listas: **habilidades del equipo** (`IT_16_TeamSkills`), **planes de formación** (`IT_17_TrainingPlans`) y **base de conocimiento** (`IT_18_KnowledgeBase`).

## 2. Objetivos y no objetivos

**Objetivos**
1. Una pantalla por lista con todo lo común (búsqueda, filtros, orden, detalle, archivar, borrar, CSV, idiomas).
2. Ver **dónde faltan habilidades** (nivel por debajo del deseado) y **qué certificaciones caducan** pronto.
3. Ver **qué formaciones van tarde**.
4. Una base de conocimiento donde **buscar** artículos y saber **cuáles hay que revisar**, con la publicación de políticas bajo aprobación.

**No objetivos:** matriz de habilidades gráfica, recomendaciones automáticas de formación, evaluación de rendimiento, gestión de vacaciones, versiones de artículos más allá del historial de SharePoint, ficheros adjuntos, importar estos datos desde reuniones.

## 3. Decisiones (mías, ajustables)

### Habilidades (`IT_16_TeamSkills`)
- Cada registro es **una persona y una habilidad**: habilidad (título), ID, persona, categoría (Técnica, Proceso, Herramienta, Blanda, Otra), **nivel actual** y **nivel deseado** (Básico 1, Intermedio 2, Avanzado 3, Experto 4), fecha de la última evaluación, certificación (nombre) y su **fecha de caducidad**, notas, estado (Activa, Archivada).
- **Brecha** = nivel deseado − nivel actual, si es positiva. El Panel cuenta las brechas de habilidades activas.
- **Alerta de certificación:** *caducada* si su fecha ya pasó; *por caducar* si faltan 60 días o menos (`AppConfig.people.certificationWarningDays`). Solo cuentan las habilidades activas con certificación y fecha.

### Formación (`IT_17_TrainingPlans`)
- Campos: título, ID, estado, tipo (Curso, Certificación, Taller, Autoestudio, Mentoría), persona, proveedor (texto), habilidad que trabaja (selector sobre las habilidades), proveedor registrado (selector sobre proveedores), fecha de inicio y de fin prevista, fecha de finalización, coste, notas.
- Estados: Prevista → En curso → Completada, o Cancelada (se puede reabrir: una completada vuelve a En curso; una cancelada, a Prevista).
- Una formación **va tarde** si no está completada ni cancelada y su fecha de fin prevista ya pasó. Al completarla se rellena la fecha de finalización (hoy) si estaba vacía; al reabrirla se vacía.
- El coste **no** se suma a los presupuestos (esos solo cuentan CAPEX y OPEX); es un dato informativo.

### Base de conocimiento (`IT_18_KnowledgeBase`)
- Campos: título, ID, resumen, contenido, categoría (Guía, Procedimiento operativo, Preguntas frecuentes, Política, Referencia), estado, responsable, etiquetas, fecha de publicación, **fecha de próxima revisión**, y vínculos a proyecto, proveedor e incidente de origen.
- Estados: Borrador → En revisión → Publicado → Archivado (un archivado vuelve a Borrador).
- Al pasar a **Publicado** se rellena la fecha de publicación (hoy) y la **próxima revisión a 180 días** (`AppConfig.knowledge.reviewDays`), si estaban vacías. Un artículo publicado cuya fecha de revisión ya pasó **necesita revisión**.
- **Aprobación (regla nueva `article.publishPolicy`):** publicar un artículo de categoría *Política* necesita una aprobación registrada. El resto se publica sin ella.
- La búsqueda cubre título, resumen, contenido y etiquetas.

### Pestaña y Panel
- Pestaña **Equipo y conocimiento** con tres vistas: Habilidades, Formación y Conocimiento.
- Panel: tarjetas de **brechas de habilidades**, **certificaciones por caducar**, **formaciones con retraso** y **artículos por revisar**; los mismos avisos en "Requiere atención"; las aprobaciones pendientes de artículos en su lista.

## 4. Esquema

Tres listas nuevas en el paquete, con datos de ejemplo que muestran cada caso (una brecha, una certificación por caducar y otra caducada, una formación con retraso, un artículo por revisar y una política esperando aprobación). Versión 1.7.0.0. La lista de conocimiento recibe las siete columnas de aprobación.

## 5. Riesgos

Sin probar contra el tenant. Cada habilidad es un registro por persona: con mucha gente y muchas habilidades la lista crece rápido, y la búsqueda y los filtros son la forma de moverse por ella.
