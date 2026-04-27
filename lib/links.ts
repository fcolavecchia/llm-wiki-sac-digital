import type { WikiPage } from "./types";

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function normalizeLookupKey(input: string): string {
  return slugify(input.replace(/\.(md|mdx)$/i, "").replace(/\//g, " "));
}

export function extractWikiLinks(markdown: string): string[] {
  const matches = markdown.matchAll(/\[\[([^[\]]+)\]\]/g);
  const links: string[] = [];

  for (const match of matches) {
    const target = match[1]?.split("|")[0]?.trim();
    if (target) {
      links.push(target);
    }
  }

  return links;
}

function buildLookup(pages: WikiPage[]): Map<string, WikiPage> {
  const lookup = new Map<string, WikiPage>();

  for (const page of pages) {
    const candidates = new Set<string>([
      page.slug,
      page.title,
      page.routePath,
      page.relativePath,
      page.relativePath.replace(/\.(md|mdx)$/i, ""),
      page.routeSegments.join("/"),
      page.routeSegments.at(-1) ?? "",
      ...page.aliases,
    ]);

    for (const candidate of candidates) {
      if (!candidate) {
        continue;
      }

      lookup.set(normalizeLookupKey(candidate), page);
    }
  }

  return lookup;
}

export function resolveWikiLinkTarget(target: string, pages: WikiPage[]): WikiPage | undefined {
  const [pageTarget] = target.split("#");
  const lookup = buildLookup(pages);
  return lookup.get(normalizeLookupKey(pageTarget.trim()));
}

export function rewriteWikiLinks(markdown: string, pages: WikiPage[]): string {
  let inFence = false;
  const lines = markdown.split("\n");

  return lines
    .map((line) => {
      const fenceMatch = line.trim().match(/^(```|~~~)/);
      if (fenceMatch) {
        inFence = !inFence;
        return line;
      }

      if (inFence) {
        return line;
      }

      return line.replace(/\[\[([^[\]]+)\]\]/g, (_match, token: string) => {
        const [rawTarget, rawLabel] = token.split("|").map((value) => value.trim());
        const [linkTarget, anchor] = rawTarget.split("#");
        const page = resolveWikiLinkTarget(linkTarget, pages);

        if (!page) {
          return rawLabel || rawTarget;
        }

        const label = rawLabel || page.title;
        const anchorSuffix = anchor ? `#${slugify(anchor)}` : "";
        return `[${label}](${page.routePath}${anchorSuffix})`;
      });
    })
    .join("\n");
}
