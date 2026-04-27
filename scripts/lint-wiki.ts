import { promises as fs } from "node:fs";
import path from "node:path";

import { RAW_DIR, getAllPages } from "../lib/content";
import { normalizeLookupKey, resolveWikiLinkTarget } from "../lib/links";
import type { LintFinding, WikiPage } from "../lib/types";
import { appendLogEntry, getBacklinks } from "../lib/wiki";
import { rebuildIndex } from "./build-index";

function formatFinding(finding: LintFinding): string {
  const prefix = finding.level === "error" ? "ERROR" : "WARN";
  const file = finding.file ? ` [${finding.file}]` : "";
  return `${prefix} ${finding.code}${file}: ${finding.message}`;
}

function chooseCanonicalPage(pages: WikiPage[]): WikiPage {
  return [...pages].sort((left, right) => {
    const leftScore = (left.sources.length > 0 ? 4 : 0) + (left.outgoingLinks.length > 0 ? 2 : 0) + (left.updated ? 1 : 0);
    const rightScore = (right.sources.length > 0 ? 4 : 0) + (right.outgoingLinks.length > 0 ? 2 : 0) + (right.updated ? 1 : 0);

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    if ((right.updated || "") !== (left.updated || "")) {
      return (right.updated || "").localeCompare(left.updated || "");
    }

    return left.relativePath.localeCompare(right.relativePath);
  })[0];
}

async function quarantineDuplicate(page: WikiPage): Promise<string> {
  const destination = path.join(RAW_DIR, "duplicates", "wiki", page.relativePath);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.rename(page.absolutePath, destination);
  return path.relative(process.cwd(), destination);
}

async function quarantineDuplicatePages(pages: WikiPage[]): Promise<{ canonical: WikiPage; moved: Array<{ from: string; to: string }> }> {
  const canonical = chooseCanonicalPage(pages);
  const duplicates = pages.filter((page) => page.absolutePath !== canonical.absolutePath);
  const moved: Array<{ from: string; to: string }> = [];

  for (const duplicate of duplicates) {
    const target = await quarantineDuplicate(duplicate);
    moved.push({
      from: duplicate.relativePath,
      to: target,
    });
  }

  return { canonical, moved };
}

async function main() {
  const findings: LintFinding[] = [];
  const pages = await getAllPages();
  const titleIndex = new Map<string, WikiPage[]>();
  const slugIndex = new Map<string, WikiPage[]>();
  const duplicateMoves: Array<{ canonical: string; from: string; to: string; key: string }> = [];
  const removedPaths = new Set<string>();

  for (const page of pages) {
    for (const field of ["title", "type", "slug", "updated"] as const) {
      if (!page.frontmatter[field]) {
        findings.push({
          code: "missing-frontmatter",
          file: page.relativePath,
          level: "error",
          message: `Missing required frontmatter field "${field}".`,
        });
      }
    }

    if (!["overview", "source", "system"].includes(page.type) && page.sources.length === 0) {
      findings.push({
        code: "missing-sources",
        file: page.relativePath,
        level: "warning",
        message: "Curated page has no source references.",
      });
    }

    for (const link of page.outgoingLinks) {
      if (!resolveWikiLinkTarget(link, pages)) {
        findings.push({
          code: "broken-link",
          file: page.relativePath,
          level: "error",
          message: `Unresolved wiki link: [[${link}]].`,
        });
      }
    }

    const backlinks = getBacklinks(page, pages);
    if (!["overview", "source", "system"].includes(page.type) && backlinks.length === 0) {
      findings.push({
        code: "orphan-page",
        file: page.relativePath,
        level: "warning",
        message: "Page has no backlinks.",
      });
    }

    const normalizedTitle = normalizeLookupKey(page.title);
    if (normalizedTitle) {
      const current = titleIndex.get(normalizedTitle) ?? [];
      current.push(page);
      titleIndex.set(normalizedTitle, current);
    }

    const normalizedSlug = normalizeLookupKey(page.slug);
    if (normalizedSlug) {
      const current = slugIndex.get(normalizedSlug) ?? [];
      current.push(page);
      slugIndex.set(normalizedSlug, current);
    }
  }

  const duplicateGroups = new Map<string, WikiPage[]>();
  for (const [key, matches] of [...titleIndex.entries(), ...slugIndex.entries()]) {
    const uniqueMatches = [...new Map(matches.map((page) => [page.absolutePath, page])).values()];
    if (uniqueMatches.length > 1) {
      duplicateGroups.set(key, uniqueMatches);
    }
  }

  for (const [key, pagesForKey] of duplicateGroups.entries()) {
    const activePages = pagesForKey.filter((page) => !removedPaths.has(page.absolutePath));
    if (activePages.length <= 1) {
      continue;
    }

    const { canonical, moved } = await quarantineDuplicatePages(activePages);
    findings.push({
      code: "duplicate-key",
      file: canonical.relativePath,
      level: "warning",
      message: `Kept "${canonical.relativePath}" as canonical for "${key}" and quarantined duplicates.`,
    });

    for (const duplicate of moved) {
      removedPaths.add(path.join(process.cwd(), duplicate.from));
      findings.push({
        code: "duplicate-removed",
        file: duplicate.from,
        level: "warning",
        message: `Moved duplicate page to ${duplicate.to}`,
      });
      duplicateMoves.push({
        canonical: canonical.relativePath,
        from: duplicate.from,
        key,
        to: duplicate.to,
      });
    }
  }

  if (duplicateMoves.length > 0) {
    await rebuildIndex();
    await appendLogEntry(
      "lint",
      "duplicate cleanup",
      duplicateMoves.map((move) => `Removed duplicate \`${move.from}\` for key "${move.key}" and kept \`${move.canonical}\``),
    );
  }

  if (findings.length === 0) {
    console.log("Wiki lint passed with no findings.");
    return;
  }

  findings
    .sort((left, right) => left.level.localeCompare(right.level) || (left.file || "").localeCompare(right.file || ""))
    .forEach((finding) => console.log(formatFinding(finding)));

  const errorCount = findings.filter((finding) => finding.level === "error").length;
  const warningCount = findings.length - errorCount;
  console.log(`\n${errorCount} error(s), ${warningCount} warning(s)`);
  process.exit(errorCount > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
