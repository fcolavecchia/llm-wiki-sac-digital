# Technical Specification

This document turns the product brief into an implementable repository design for the first version of the template.

## Scope for v1

The first version should deliver:

- a GitHub template repository
- a file-based wiki under `wiki/`
- a Next.js frontend that renders the same wiki on the web
- a small set of Node/TypeScript scripts for setup, ingest, indexing, and linting
- strong agent instructions in `AGENTS.md`

The first version should not require:

- embeddings
- vector databases
- authentication
- web editing
- OCR-heavy pipelines
- background workers

## Architecture

### Source of Truth

`wiki/` is the canonical knowledge layer.

Both product surfaces consume the same files:

- Obsidian reads the wiki directory directly.
- Next.js reads the same Markdown files and renders routes from them.

### Conceptual Layers

1. `raw/`: immutable input documents, stored locally by default.
2. `wiki/`: persistent synthesized knowledge.
3. `scripts/` and repository instructions: deterministic maintenance tools and agent rules.

## Repository Strategy

Recommended model:

- this repository acts as a reusable engine template
- each derived repository represents one knowledge domain
- `raw/` stays local and is ignored by Git by default
- `wiki/` stays versioned and powers both review and deployment

## Repository Layout

```text
.
├─ AGENTS.md
├─ README.md
├─ package.json
├─ tsconfig.json
├─ next.config.ts
├─ .env.example
├─ .gitignore
├─ raw/
│  ├─ inbox/
│  ├─ processed/
│  └─ assets/
├─ wiki/
│  ├─ overview.md
│  ├─ index.md
│  ├─ log.md
│  ├─ sources/
│  ├─ entities/
│  ├─ concepts/
│  ├─ topics/
│  └─ analyses/
├─ scripts/
│  ├─ setup.ts
│  ├─ ingest.ts
│  ├─ lint-wiki.ts
│  ├─ build-index.ts
│  ├─ normalize-links.ts
│  └─ ingest-all.ts
├─ app/
│  ├─ layout.tsx
│  ├─ page.tsx
│  ├─ activity/page.tsx
│  ├─ sources/page.tsx
│  └─ [[...slug]]/page.tsx
├─ components/
├─ lib/
│  ├─ content.ts
│  ├─ markdown.ts
│  ├─ wiki.ts
│  ├─ links.ts
│  └─ metadata.ts
└─ docs/
```

## Wiki File Conventions

### Page Schema

Markdown should be the default. MDX support can be added without changing the core model.

Recommended frontmatter:

```yaml
title: Persistent Synthesis
type: concept
slug: persistent-synthesis
status: active
sources:
  - 2026-04-21-karpathy-llm-wiki-gist
updated: 2026-04-21
aliases:
  - compiled knowledge
summary: Durable knowledge layer built from multiple sources over time.
```

Required fields for v1:

- `title`
- `type`
- `slug`
- `updated`

Recommended fields:

- `sources`
- `aliases`
- `summary`
- `status`

### Supported Page Types

- `overview`
- `source`
- `entity`
- `concept`
- `topic`
- `analysis`

### Naming Rules

- Store files in lowercase kebab-case.
- Keep the filename identical to `slug`.
- Use predictable directory placement by page type.
- Prevent duplicate pages by checking both filename and alias collisions.

## Raw Source Handling

### Directories

- `raw/inbox/`: newly added files awaiting ingestion.
- `raw/processed/`: ingested files or metadata snapshots.
- `raw/assets/`: binary attachments, PDFs, images, and auxiliary files.

### Rules

- Raw source files are immutable inputs.
- Raw source files are local by default and do not need to be committed.
- The ingest flow may move files from `raw/inbox/` to `raw/processed/`.
- Curated summaries belong in `wiki/sources/`, not in `raw/`.

## Index and Log

### `wiki/index.md`

Purpose:

- catalog all wiki pages
- provide one-line descriptions
- expose category structure
- give both humans and agents a fast entry point into the knowledge graph

Generation strategy:

- script-generated from frontmatter plus extracted summary
- grouped by page type
- ordered alphabetically within each group

### `wiki/log.md`

Purpose:

- maintain a chronological audit trail
- make recent activity visible on both the filesystem and the web
- provide a simple structured input for "recent changes" UI

Format:

- append-only Markdown
- one heading per event
- bullets for pages added or updated

Supported event labels:

- `bootstrap`
- `ingest`
- `analysis`
- `lint`
- `reorg`

## Script Responsibilities

### `scripts/setup.ts`

Responsibilities:

- verify the required directory structure
- create missing base folders
- create starter files if missing
- validate environment assumptions

Expected CLI:

```bash
npm run setup
```

### `scripts/ingest.ts`

Responsibilities:

- accept a file path
- classify or identify the source
- extract basic metadata
- create or update a `source` page
- update related wiki pages
- trigger index rebuild
- append a log entry

Expected CLI:

```bash
npm run ingest -- raw/inbox/example.pdf
```

Implementation note:

The actual source understanding may be delegated to Codex or another agent, but the script should provide a stable invocation point and local validation.

### `scripts/ingest-all.ts`

Responsibilities:

- scan `raw/inbox/`
- process every supported file
- skip files already marked or moved

Expected CLI:

```bash
npm run ingest:all
```

### `scripts/build-index.ts`

Responsibilities:

- enumerate all wiki pages except special files when needed
- read frontmatter and summaries
- regenerate `wiki/index.md`

Expected CLI:

```bash
npm run build:index
```

### `scripts/lint-wiki.ts`

Responsibilities:

- detect orphan pages
- detect missing files for internal links
- detect missing required frontmatter
- detect pages without sources where sources should exist
- flag likely duplicate titles or aliases

Expected CLI:

```bash
npm run lint:wiki
```

### `scripts/normalize-links.ts`

Responsibilities:

- normalize wiki links
- ensure filename and slug consistency
- optionally update broken internal references after approved renames

## Web Application Design

### Framework Choice

Use Next.js App Router because it fits:

- filesystem-backed content
- static generation
- Vercel deployment
- future extensibility for search or APIs

### Rendering Strategy

Use build-time content loading:

1. scan `wiki/`
2. parse frontmatter and Markdown
3. build route params from file paths or slugs
4. render static pages

Prefer `.md` by default and enable `.mdx` as an extension point, not as the baseline requirement.

### Required Routes

- `/`: render `wiki/overview.md`
- `/activity`: render recent log activity from `wiki/log.md`
- `/sources`: list source pages
- `/<slug>` or nested catch-all route: render wiki pages by slug/path

### Required UI Features

- overview-driven home page
- left navigation or category index
- breadcrumbs
- table of contents per page
- backlinks
- related pages
- recent activity
- lightweight local search

### Content Library Responsibilities

`lib/content.ts`

- enumerate wiki files
- resolve slugs and file paths
- parse frontmatter

`lib/markdown.ts`

- compile Markdown or MDX
- support headings, code blocks, and internal link rewriting

`lib/wiki.ts`

- collect backlinks
- group pages by type
- resolve related pages

`lib/links.ts`

- convert `[[Wiki Link]]` syntax into route URLs
- validate internal link targets

`lib/metadata.ts`

- derive page metadata for SEO and navigation

## Search Strategy for v1

Keep search simple and local:

- precompute a small JSON index at build time
- include title, aliases, summary, type, slug, and plain-text body excerpt
- search client-side with a lightweight library or a simple scorer

Avoid external search services in v1.

## Agent Integration Expectations

The repository should assume an agent can:

- read `AGENTS.md` every turn
- inspect `wiki/index.md` before answering
- update pages and append logs as part of normal work

The repository should not assume:

- hidden memory outside Git
- database state
- mandatory background jobs

## Testing Strategy

The first implementation should include lightweight checks:

- unit tests for link parsing and slug resolution
- fixtures for sample wiki pages
- script-level validation for index generation and lint output

A full end-to-end test suite is optional for v1.

## Implementation Sequence

Recommended order:

1. scaffold directories and starter wiki files
2. implement content loading utilities
3. implement the catch-all page renderer
4. implement `build-index`
5. implement `lint-wiki`
6. add setup and ingest entry points
7. polish navigation, backlinks, and search

## Risks to Guard Against

- diverging web routes from filesystem structure
- hidden assumptions in scripts that break template portability
- duplicate concepts caused by unstable naming
- source summaries without clear traceability
- overengineering ingestion before the file model is solid

## Definition of Done for v1

v1 is complete when:

- a user can clone the template
- add files to `raw/inbox/`
- initialize the wiki
- browse the resulting Markdown locally
- run a Next.js site that renders the same wiki
- inspect an index and append-only log
- rely on `AGENTS.md` for consistent agent behavior
