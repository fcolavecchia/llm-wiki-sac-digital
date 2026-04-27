# Sac Digital Wiki

`llm-wiki-sac-digital` is an LLM-maintained wiki for the knowledge domain "Sac Digital".

This repository is a concrete wiki instance:

- local source files go in `raw/`
- curated knowledge lives in `wiki/`
- the web app renders the current state of `wiki/`
- Codex maintains the wiki following `AGENTS.md`

## Instance Workflow

1. Add source files to `raw/inbox/`.
2. Start the site with `npm run dev`.
3. Ask Codex to ingest the new sources.
4. Review the updated pages in the web UI.
5. Commit and push the curated changes in `wiki/`.

## First Run

```bash
npm install
npm run setup
npm run dev
```

Then add source files to `raw/inbox/` and ask Codex to initialize or ingest the wiki.

Use Codex with a writable sandbox, otherwise it will not be able to update `wiki/`:

```bash
codex -s workspace-write -a on-request
```

For prompt files, use non-interactive mode:

```bash
codex exec -s workspace-write - < prompts/init-domain.md
codex exec -s workspace-write - < prompts/ingest-new-sources.md
codex exec -s workspace-write - < prompts/lint-wiki.md
```

For PDF-heavy inboxes, preprocess them first:

```bash
npm run preprocess:pdf:all
```

That writes extracted text and metadata into `raw/processed/` so ingestion can use text instead of reasoning over the PDF binary.

Recommended prompt:

```text
Initialize this repository as a new llm-wiki for Sac Digital.

- rewrite `wiki/overview.md` for this domain
- ingest the files currently in `raw/inbox/`
- create or update the necessary pages in `wiki/`
- rebuild `wiki/index.md`
- append the corresponding entries to `wiki/log.md`

Follow `AGENTS.md` and avoid irrelevant template content.
```

## What To Commit

- commit `wiki/`, docs, scripts, and app changes
- do not commit `raw/` unless you explicitly want the raw sources in Git

## Publishing

This wiki can be deployed as a static site from the current repository after the curated pages in `wiki/` are ready.

### Vercel CLI

First time only:

```bash
npm run vercel:login
npm run vercel:link
```

Production deploy:

```bash
npm run publish:vercel
```

Preview deploy:

```bash
npm run publish:vercel:preview
```
