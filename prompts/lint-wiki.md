Run a wiki maintenance pass following `AGENTS.md`.

Check for:

- orphan pages
- broken internal links
- missing required metadata
- curated pages without sources
- duplicate concepts or naming drift
- concepts that are referenced repeatedly but do not yet have their own page
- contradictions or stale claims

Fix what is straightforward and safe.

Then:

- update `wiki/index.md` if needed
- append a `lint` entry to `wiki/log.md`
- summarize the findings and changes
