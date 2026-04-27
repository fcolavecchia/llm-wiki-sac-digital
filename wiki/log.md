---
title: Registro de actividad
type: system
slug: log
status: active
updated: 2026-04-27
summary: Registro cronológico de ingestas, análisis, revisiones y cambios estructurales.
---

# Registro de actividad

## [2026-04-27] bootstrap | wiki sac digital inicializado
- Se creó una instancia nueva del wiki a partir de la plantilla.
- Se reinició el contenido inicial y se prepararon los directorios locales de fuentes raw.

## [2026-04-27] bootstrap | dominio de cardiología digital inicializado
- Se reescribió [[overview|Panorama general]] para el dominio actual: salud digital en cardiología, centrada en material de consenso argentino.
- Se eliminó del punto de entrada curado la orientación irrelevante heredada de la plantilla.
- Se reconstruyó [[index|Índice del wiki]] como catálogo completo de la nueva estructura del wiki.

## [2026-04-27] ingest | consenso de salud digital
- Se incorporó la página fuente: [[2026-04-consenso-salud-digital]]
- Se agregaron páginas de tema y entidad: [[Salud Digital en Cardiología]], [[Sociedad Argentina de Cardiología]]
- Se agregaron páginas de concepto: [[Intervenciones de Salud Digital]], [[Inteligencia Artificial en Cardiología]], [[Teleconsulta Cardiológica]], [[Telemonitoreo Cardiovascular]], [[Digitalización de Imágenes Cardiovasculares]], [[Genómica en Salud Digital]], [[Redes Sociales Profesionales en Salud]], [[Gestión e Historia Clínica Electrónica]], [[Implicancias Médico-Legales y Éticas de la Medicina Digital]]
- Notas: se hizo la ingesta desde el artefacto Markdown extraído y no desde el binario PDF; los metadatos de extracción reportaron baja confianza para la extracción automática de autores; se movieron el PDF y los artefactos extraídos de `raw/inbox/` a `raw/processed/`.

## [2026-04-27] reorg | traducción al castellano del wiki
- Se tradujeron al castellano las páginas curadas de `wiki/`, con tono de documento de consulta médica.
- Se mantuvieron slugs, rutas y enlaces internos estables para preservar la navegación y la trazabilidad.
- Se actualizó [[index|Índice del wiki]] y este registro de actividad.

## [2026-04-27] reorg | traducción de la interfaz web
- Se tradujeron rótulos visibles de navegación, búsqueda, páginas recientes, actividad, fuentes y metadatos de página.
- Se agregó un helper de etiquetas para mostrar los tipos internos del wiki en castellano sin afectar slugs ni frontmatter.

## [2026-04-27] lint | mantenimiento del wiki
- Se revisaron enlaces internos, metadatos, fuentes, jerarquía, posibles duplicados, conceptos repetidos sin página y claims potencialmente stale.
- Se agregaron páginas de concepto para categorías repetidas de intervención digital: [[Teleinterconsulta]], [[Telegestión]] y [[Teleeducación en Salud]].
- Se actualizó la jerarquía de [[Salud Digital en Cardiología]] e [[Intervenciones de Salud Digital]], se agregó atribución de fuente a [[overview|Panorama general]] y se refrescó [[index|Índice del wiki]].
- Notas: no se detectaron enlaces internos rotos, duplicados evidentes, contradicciones internas ni páginas curadas sin fuente después de los cambios.
