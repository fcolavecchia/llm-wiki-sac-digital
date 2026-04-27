import { promises as fs } from "node:fs";
import path from "node:path";

import { ROOT_DIR, WIKI_DIR } from "../lib/content";
import { rebuildIndex } from "./build-index";

const DIRECTORIES = [
  "raw/inbox",
  "raw/processed",
  "raw/assets",
  "raw/duplicates",
  "wiki/sources",
  "wiki/entities",
  "wiki/concepts",
  "wiki/topics",
  "wiki/analyses",
  "docs",
];

async function ensureDirectory(relativePath: string) {
  await fs.mkdir(path.join(ROOT_DIR, relativePath), { recursive: true });
}

async function ensureFile(relativePath: string, content: string) {
  const absolutePath = path.join(ROOT_DIR, relativePath);
  try {
    await fs.access(absolutePath);
  } catch {
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content, "utf8");
  }
}

async function main() {
  await Promise.all(DIRECTORIES.map((directory) => ensureDirectory(directory)));

  await ensureFile(
    "wiki/overview.md",
    `---
title: Overview
type: overview
slug: overview
status: active
updated: 2026-04-21
summary: Starting point for the wiki.
---

# Overview

Seed this page with the domain overview for the wiki.
`,
  );

  await ensureFile(
    "wiki/log.md",
    `---
title: Activity Log
type: system
slug: log
status: active
updated: 2026-04-21
summary: Chronological record of ingests, analyses, lint passes, and structural changes.
---

# Activity Log

## [2026-04-21] bootstrap | initial scaffold
- Created the initial wiki scaffold.
`,
  );

  await ensureFile(path.join("wiki", "sources", ".gitkeep"), "");
  await ensureFile(path.join("wiki", "entities", ".gitkeep"), "");
  await ensureFile(path.join("wiki", "concepts", ".gitkeep"), "");
  await ensureFile(path.join("wiki", "topics", ".gitkeep"), "");
  await ensureFile(path.join("wiki", "analyses", ".gitkeep"), "");

  if (!(await fs.readdir(WIKI_DIR)).includes("index.md")) {
    await ensureFile(
      "wiki/index.md",
      `---
title: Wiki Index
type: system
slug: index
status: active
updated: 2026-04-21
summary: Generated catalog of the wiki tree for humans and agents.
---

# Wiki Index
`,
    );
  }

  await rebuildIndex();
  console.log("Repository scaffold verified.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
