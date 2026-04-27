import { promises as fs } from "node:fs";
import path from "node:path";

import { routePathFromRelativePath, WIKI_DIR } from "./content";
import { getTypeLabel } from "./labels";
import { resolveWikiLinkTarget } from "./links";
import type { LogEntry, WikiPage } from "./types";

export function groupPagesByType(pages: WikiPage[]): Map<string, WikiPage[]> {
  const groups = new Map<string, WikiPage[]>();

  for (const page of pages) {
    const type = page.type || "system";
    const current = groups.get(type) ?? [];
    current.push(page);
    groups.set(type, current);
  }

  return new Map([...groups.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

export function getBacklinks(targetPage: WikiPage, pages: WikiPage[]): WikiPage[] {
  return pages
    .filter((page) => page.absolutePath !== targetPage.absolutePath)
    .filter((page) =>
      page.outgoingLinks.some((link) => resolveWikiLinkTarget(link, pages)?.absolutePath === targetPage.absolutePath),
    )
    .sort((left, right) => left.title.localeCompare(right.title));
}

export function getRelatedPages(targetPage: WikiPage, pages: WikiPage[]): WikiPage[] {
  const resolvedOutgoing = targetPage.outgoingLinks
    .map((link) => resolveWikiLinkTarget(link, pages))
    .filter((page): page is WikiPage => Boolean(page))
    .filter((page) => page.absolutePath !== targetPage.absolutePath);
  const backlinks = getBacklinks(targetPage, pages);

  const unique = new Map<string, WikiPage>();
  for (const page of [...resolvedOutgoing, ...backlinks]) {
    unique.set(page.absolutePath, page);
  }

  return [...unique.values()].slice(0, 8);
}

export function getRecentPages(pages: WikiPage[], count = 6): WikiPage[] {
  return [...pages]
    .filter((page) => page.type !== "system")
    .sort((left, right) => (right.updated || "").localeCompare(left.updated || ""))
    .slice(0, count);
}

export function parseLogEntries(logMarkdown: string): LogEntry[] {
  const entries: LogEntry[] = [];
  let current: LogEntry | null = null;

  for (const line of logMarkdown.split("\n")) {
    const headingMatch = line.match(/^##\s+\[(.+?)\]\s+([^|]+)\|\s+(.+)$/);
    if (headingMatch) {
      if (current) {
        entries.push(current);
      }

      current = {
        bullets: [],
        date: headingMatch[1].trim(),
        label: headingMatch[2].trim(),
        subject: headingMatch[3].trim(),
      };
      continue;
    }

    if (current && line.startsWith("- ")) {
      current.bullets.push(line.slice(2).trim());
    }
  }

  if (current) {
    entries.push(current);
  }

  return entries;
}

export function buildIndexMarkdown(pages: WikiPage[]): string {
  const grouped = groupPagesByType(pages.filter((page) => page.routePath !== "/index"));
  const today = new Date().toISOString().slice(0, 10);
  const sections: string[] = [
    "---",
    "title: Índice del wiki",
    "type: system",
    "slug: index",
    "status: active",
    `updated: ${today}`,
    "summary: Catálogo generado del árbol del wiki para personas y agentes.",
    "---",
    "",
    "# Índice del wiki",
    "",
    "Este archivo se genera a partir del árbol actual de `wiki/` y funciona como catálogo para personas y agentes.",
    "",
  ];

  for (const [type, group] of grouped.entries()) {
    sections.push(`## ${getTypeLabel(type, true)}`);
    sections.push("");

    for (const page of group.sort((left, right) => left.title.localeCompare(right.title))) {
      const summary = page.summary || "Sin resumen disponible todavía.";
      const updated = page.updated ? ` | actualizado ${page.updated}` : "";
      sections.push(`- [${page.title}](${page.routePath}) - ${summary}${updated}`);
    }

    sections.push("");
  }

  return `${sections.join("\n").trim()}\n`;
}

export async function appendLogEntry(label: string, subject: string, bullets: string[]): Promise<void> {
  const logPath = path.join(WIKI_DIR, "log.md");
  const today = new Date().toISOString().slice(0, 10);
  const existing = await fs
    .readFile(logPath, "utf8")
    .catch(
      () => `---
title: Registro de actividad
type: system
slug: log
status: active
updated: ${today}
summary: Registro cronológico de ingestas, análisis, revisiones y cambios estructurales.
---

# Registro de actividad
`,
    );
  const withUpdatedDate = existing.replace(/^updated:\s+.*$/m, `updated: ${today}`);
  const entry = [`## [${today}] ${label} | ${subject}`, ...bullets.map((bullet) => `- ${bullet}`), ""].join("\n");
  await fs.writeFile(logPath, `${withUpdatedDate.trimEnd()}\n\n${entry}`, "utf8");
}

export function inferRouteFromWikiPath(relativePath: string): string {
  return routePathFromRelativePath(relativePath);
}
