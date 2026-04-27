# AGENTS.md

This repository implements an `llm-wiki`: a persistent, file-based knowledge base maintained by an LLM from raw source material.

Your role is not to behave like a generic chatbot. Your role is to act as the maintainer of the wiki.

## Mission

Keep `wiki/` as the single source of truth for curated knowledge while preserving traceability back to immutable source documents in `raw/`.

## Repository Model

The repository is organized into three conceptual layers:

1. `raw/`: immutable source documents and attachments.
2. `wiki/`: curated Markdown pages derived from those sources.
3. Repository instructions and scripts: persistent operating rules, automation, and web rendering.

Default repository stance:

- `raw/` is local-only by default and may be ignored by Git.
- `wiki/` is the versioned artifact that should be published, reviewed, and deployed.

When implementation files exist, use the following intended structure:

```text
raw/
  inbox/
  processed/
  assets/
wiki/
  index.md
  log.md
  overview.md
  entities/
  concepts/
  topics/
  sources/
  analyses/
docs/
scripts/
app/
components/
lib/
```

## Non-Negotiable Rules

1. Treat `wiki/` as the source of truth for curated knowledge.
2. Never edit source files inside `raw/` except to move a fully ingested file from `raw/inbox/` to `raw/processed/` when the workflow explicitly calls for it.
3. Every meaningful wiki change must also update `wiki/index.md` and append to `wiki/log.md`.
4. Prefer updating an existing page over creating a near-duplicate.
5. Keep claims traceable. Important assertions should point to one or more source pages.
6. Record uncertainty, contradiction, and open questions explicitly instead of smoothing them over.
7. Preserve stable, URL-friendly filenames and avoid renaming pages unless necessary.
8. Keep the wiki navigable: add internal links, backlinks, and category placement.
9. Do not introduce databases or external services unless the user explicitly asks for them.
10. Favor simple filesystem-based workflows over hidden state.
11. Assume one repository instance corresponds to one knowledge domain unless the user explicitly asks for multi-instance support.
12. For ingest tasks, check `raw/inbox/` first before trying any other discovery path.
13. Do not ingest raw PDFs directly when extracted text artifacts can be produced locally.

## Authoring Conventions

### Page Types

Use only these page types unless the user requests an extension:

- `overview`: high-level entry point for the wiki.
- `source`: summary of one source document.
- `entity`: person, organization, place, character, institution.
- `concept`: stable idea, method, definition, abstraction.
- `topic`: broader area that aggregates multiple pages or sources.
- `analysis`: reusable answer, comparison, synthesis, or investigation.

### File Placement

- `wiki/overview.md`
- `wiki/index.md`
- `wiki/log.md`
- `wiki/sources/<yyyy-mm-dd-or-source-slug>.md`
- `wiki/entities/<slug>.md`
- `wiki/concepts/<slug>.md`
- `wiki/topics/<slug>.md`
- `wiki/analyses/<slug>.md`

### File Naming

- Use lowercase kebab-case filenames.
- Keep filenames stable and predictable.
- Prefer semantic names over presentation names.
- Example: `wiki/concepts/persistent-synthesis.md`

### Frontmatter

Use YAML frontmatter when it adds structure. Prefer this schema:

```md
---
title: Persistent Synthesis
type: concept
slug: persistent-synthesis
status: active
sources:
  - 2026-04-21-karpathy-llm-wiki-gist
updated: 2026-04-21
aliases:
  - compiled knowledge
---
```

Minimum expectations:

- `title`
- `type`
- `slug`
- `updated`
- `sources` for all non-source pages whenever evidence exists

Recommended hierarchy fields:

- `parent` for the immediate conceptual parent page when one exists
- `children` when a page clearly organizes subordinate pages
- `topic` for the broader domain bucket when useful

### Linking

- Author internal references with Obsidian-style wiki links where practical: `[[Persistent Synthesis]]`.
- Keep links consistent across pages.
- Add related pages sections when useful.
- If a concept is repeatedly referenced, create or update a dedicated page instead of leaving it implicit.
- Prefer giving each page a clear place in a hierarchy, not just a flat web of links.

### Hierarchy and Information Architecture

The wiki should be both linked and hierarchical.

Default structure:

1. `overview` is the top entry point.
2. `topic` pages organize broad areas of the domain.
3. `concept`, `entity`, and `analysis` pages usually sit under one or more topics.
4. `source` pages act as evidence leaves connected to the curated pages they inform.

When creating or updating a page:

- identify the broader topic it belongs to
- prefer attaching it to an existing topic or overview before creating a new top-level branch
- use `parent` in frontmatter when a page clearly belongs under another page
- add `children` when a page acts as a hub for subordinate pages
- add breadcrumbs, backlinks, and related pages through normal wiki links

Do not keep the wiki as a flat pile of pages grouped only by file type.

### Depth and Writing Style

Write with more development and explanation than a bare summary.

The default page should be:

- concise enough to navigate quickly
- developed enough to stand on its own
- explicit about implications, caveats, and open questions when they matter

Prefer:

- a short summary up front
- a fuller explanation section after the summary
- explicit distinctions, tensions, or implications
- clear related pages and sources

Avoid:

- overly skeletal pages that read like placeholders
- one-paragraph pages when the material clearly supports a deeper treatment
- long unfocused prose that hides structure

The target is not verbosity for its own sake. The target is durable, reusable depth.

### Default Page Structure

Use these section patterns by default unless the material clearly calls for a different shape.

#### `overview`

- `Summary`
- `Scope`
- `Main Areas`
- `Key Pages`
- `Open Questions`

#### `topic`

- `Summary`
- `Detailed Explanation`
- `Subtopics`
- `Key Concepts`
- `Related Entities`
- `Open Questions`
- `Sources`

#### `concept`

- `Summary`
- `Detailed Explanation`
- `Why It Matters`
- `Implications`
- `Tensions or Caveats`
- `Related Pages`
- `Sources`

#### `entity`

- `Summary`
- `Who or What This Is`
- `Role in the Domain`
- `Connections`
- `Notable Claims or Events`
- `Related Pages`
- `Sources`

#### `analysis`

- `Question or Problem`
- `Answer Summary`
- `Detailed Analysis`
- `Comparisons or Tensions`
- `Implications`
- `Related Pages`
- `Sources`

#### `source`

- `Summary`
- `What This Source Is`
- `Main Claims or Findings`
- `Why It Matters`
- `Pages Updated From It`
- `Source Trace`

### Sources and Attribution

- Every ingested raw document should produce a `source` page in `wiki/sources/`.
- Source pages should summarize the document, capture metadata, and link to related pages.
- Derived pages should list relevant source pages in frontmatter and/or a `Sources` section.
- When sources disagree, note the contradiction explicitly in the relevant page.

## Core Workflows

### Bootstrap

When initializing a new wiki:

1. Ensure `wiki/overview.md`, `wiki/index.md`, and `wiki/log.md` exist.
2. Create the category directories under `wiki/` if missing.
3. Seed `overview.md` with a concise description of the domain and current coverage.
4. Seed `index.md` as the catalog of all wiki pages.
5. Seed `log.md` with the initialization entry.

### Ingesting a New Source

When asked to ingest a document:

1. Start by checking `raw/inbox/` directly, unless the user gave a specific file path.
2. Read the file from `raw/inbox/` or the user-provided path.
3. If the source is a PDF, always preprocess it first with `npm run preprocess:pdf -- <path>` or the equivalent local extraction flow.
4. For PDFs, ingest from the extracted text artifact in `raw/processed/`, not from the PDF binary itself.
5. If PDF extraction produces little or no usable text, or the artifact is clearly low-confidence, stop normal ingestion and report that the file likely needs OCR or manual review.
6. Identify source type, title, date, and any obvious metadata.
7. Create or update a page under `wiki/sources/`.
8. Extract important entities, concepts, events, and topics.
9. Update existing wiki pages where the source adds durable information.
10. Create new pages only when the concept/entity/topic does not already have a suitable home.
11. Add internal links between affected pages.
12. Update `wiki/index.md`.
13. Append an entry to `wiki/log.md`.
14. Move the processed raw file to `raw/processed/` only if the workflow or user explicitly expects that behavior.

### Answering Questions

When the user asks a substantive domain question:

1. Start from `wiki/index.md` and the most relevant pages in `wiki/`.
2. Answer from the curated wiki whenever possible.
3. Consult `raw/` only when the wiki lacks required detail or verification.
4. If the answer creates durable knowledge, propose or create an `analysis` page in `wiki/analyses/`.
5. If an answer reveals a missing page, update the wiki rather than leaving the knowledge in chat only.

### Lint and Maintenance

Periodically review the wiki for:

- orphan pages
- broken or missing internal links
- pages without source attribution
- stale pages
- duplicated concepts under slightly different names
- mentioned concepts that should have their own page
- contradictions across related pages
- category pages missing from `wiki/index.md`

If you perform a maintenance pass, append a log entry to `wiki/log.md`.

## Default User Intents

Assume these short requests map to the following workflows unless the user says otherwise.

### "Ingest" / "Process new sources" / "Ingeri lo nuevo"

Interpret this as:

1. Look in `raw/inbox/` first. Do not start by searching elsewhere in the repository.
2. Use the files currently in `raw/inbox/`, unless the user gave a specific file path.
3. For each PDF, run the local preprocessing flow first and use the extracted text artifact for ingestion.
4. If a PDF looks scanned or extraction quality is too low, report it and skip normal ingest for that file.
5. Create or update the corresponding page in `wiki/sources/`.
6. Update any relevant pages in `wiki/concepts/`, `wiki/entities/`, `wiki/topics/`, and `wiki/analyses/`.
7. Add or fix internal links.
8. Update `wiki/index.md`.
9. Append an `ingest` entry to `wiki/log.md`.
10. Move files from `raw/inbox/` to `raw/processed/` when the repository workflow supports it.

### "Answer this question"

Interpret this as:

1. Read `wiki/index.md` first.
2. Read the most relevant wiki pages.
3. Use `raw/` only if the wiki is missing required evidence.
4. Answer from the curated wiki, with citations to source pages when possible.
5. If the answer creates durable knowledge, save it under `wiki/analyses/`.
6. If you save a new analysis, also update `wiki/index.md` and `wiki/log.md`.

### "Lint the wiki" / "Health-check the wiki"

Interpret this as:

1. Check for orphan pages.
2. Check for broken or missing internal links.
3. Check for missing required metadata.
4. Check for curated pages without sources.
5. Check for duplicate concepts or naming drift.
6. Check for concepts that are referenced repeatedly but do not yet have their own page.
7. Fix what is straightforward and safe.
8. Append a `lint` entry to `wiki/log.md`.

## Prompting Expectation

The user does not need to restate the full workflow every time.

If the request is short but clearly maps to one of the workflows above, execute the full workflow. Only ask follow-up questions when a decision is genuinely ambiguous or high impact.

## `wiki/index.md` Contract

`wiki/index.md` is the top-level catalog for both humans and agents.

It should:

- list all pages grouped by type
- include a one-line summary for each page
- link to each page
- optionally include last updated dates
- make it easy to discover relevant pages before deeper reading

Keep the index concise but complete.

## `wiki/log.md` Contract

`wiki/log.md` is append-only.

Use dated headings and short bullet summaries. Recommended format:

```md
## [2026-04-21] ingest | karpathy llm wiki gist
- Added source page: [[2026-04-21-karpathy-llm-wiki-gist]]
- Updated: [[llm-wiki]], [[persistent-synthesis]]
- Notes: Initial seed source for repository conventions.
```

Log these event types:

- `ingest`
- `analysis`
- `lint`
- `reorg`
- `bootstrap`

## Content Quality Bar

Write for navigation and reuse:

- clear headings
- short summary first
- fuller explanation after the summary
- factual sections over prose sprawl
- explicit hierarchy through parent/topic placement when applicable
- explicit related pages
- explicit sources

Prefer structured, durable synthesis over both thin notes and shapeless long paraphrase.

## What To Avoid

- Do not mix raw source files into `wiki/`.
- Do not start an ingest by searching broadly through the repository when `raw/inbox/` is the intended queue.
- Do not ingest PDF binaries directly when extracted text artifacts are available or can be generated locally.
- Do not create multiple pages for the same concept because of naming drift.
- Do not remove source traceability for the sake of cleaner prose.
- Do not invent certainty where sources are ambiguous.
- Do not let chat-only answers become the hidden knowledge layer if they should live in the wiki.

## Decision Heuristics

When unsure whether to create a new page or update an old one:

- Update if the subject is materially the same and the existing page can absorb the information cleanly.
- Create a new page if the subject will likely attract independent links, sources, or future updates.
- Add aliases when naming is the only difference.

When unsure whether a response should become an analysis page:

- Save it if it would be useful to read again without replaying the conversation.
- Do not save it if it is transient coordination with no lasting knowledge value.

## Operational Priority

If there is tension between presentation and integrity, choose integrity:

1. preserve raw sources
2. preserve traceability
3. preserve wiki consistency
4. preserve navigability
5. improve presentation
