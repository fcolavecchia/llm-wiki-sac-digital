# Codex Workflows

Usá este repo así:

- `raw/` guarda las fuentes crudas y queda local por defecto.
- `wiki/` guarda el conocimiento curado.
- la web renderiza `wiki/`.
- Codex mantiene `wiki/` siguiendo [AGENTS.md](../AGENTS.md).

## Recomendación

Usá un repo derivado por dominio de conocimiento. No mezcles dominios disjuntos en el mismo `wiki/`.

## Flujo Base

1. Levantá la web:

   ```bash
   npm run dev
   ```

2. Agregá archivos a `raw/inbox/`.

3. Pedile a Codex que los ingiera y actualice el wiki.

4. Refrescá la web para ver el resultado.

## Prompt de Ingesta

```text
Ingerí los archivos nuevos de `raw/inbox/` siguiendo `AGENTS.md`.

Para cada fuente:
- crear o actualizar una página en `wiki/sources/`
- actualizar páginas relacionadas en `wiki/concepts/`, `wiki/entities/`, `wiki/topics/` o `wiki/analyses/`
- evitar duplicados
- actualizar `wiki/index.md`
- agregar una entrada en `wiki/log.md`
```

## Prompt de Consulta

```text
Respondé esta pregunta usando primero `wiki/index.md` y luego las páginas relevantes de `wiki/`.

Si la respuesta genera conocimiento durable, guardala en `wiki/analyses/` y actualizá `wiki/index.md` y `wiki/log.md`.

Pregunta: <tu pregunta>
```

## Prompt de Lint

```text
Hacé un lint del wiki siguiendo `AGENTS.md`.

Buscá:
- páginas huérfanas
- links rotos
- páginas sin fuentes
- duplicados conceptuales
- contradicciones
- conceptos mencionados sin página propia

Arreglá lo razonable y registrá el pass en `wiki/log.md`.
```

## Modelo Mental

El LLM no contesta releyendo todo `raw/` cada vez.

Primero compila conocimiento en `wiki/`.
Después responde desde esa capa persistente.

La web reemplaza a Obsidian como visor del wiki. Codex sigue siendo quien escribe y mantiene los archivos.
