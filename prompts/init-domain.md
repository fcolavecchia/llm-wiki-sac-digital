Initialize this repository as a new llm-wiki for this domain.

Follow `AGENTS.md`.

Tasks:

- rewrite `wiki/overview.md` for the current domain
- inspect `raw/inbox/` and ingest the available files
- create or update the necessary pages in `wiki/`
- avoid keeping irrelevant template seed content
- rebuild `wiki/index.md`
- append the corresponding entries to `wiki/log.md`

Constraints:

- treat `wiki/` as the curated source of truth
- keep `raw/` immutable except for moving files from `raw/inbox/` to `raw/processed/` if appropriate
- avoid duplicate pages
- preserve source traceability
