import { promises as fs } from "node:fs";
import path from "node:path";

import { extractWikiLinks, slugify } from "./links";
import type { WikiFrontmatter, WikiHeading, WikiPage, WikiPageType } from "./types";

export const ROOT_DIR = process.cwd();
export const RAW_DIR = path.join(ROOT_DIR, "raw");
export const WIKI_DIR = path.join(ROOT_DIR, "wiki");

const MARKDOWN_EXTENSIONS = new Set([".md", ".mdx"]);
const SPECIAL_PAGE_TYPES = new Map<string, WikiPageType>([
  ["overview.md", "overview"],
  ["index.md", "system"],
  ["log.md", "system"],
]);

function coerceFrontmatterValue(value: string): string {
  return value.replace(/^["']|["']$/g, "").trim();
}

export function parseFrontmatter(source: string): { content: string; frontmatter: WikiFrontmatter } {
  if (!source.startsWith("---\n")) {
    return { content: source, frontmatter: {} };
  }

  const end = source.indexOf("\n---\n", 4);
  if (end === -1) {
    return { content: source, frontmatter: {} };
  }

  const rawFrontmatter = source.slice(4, end);
  const content = source.slice(end + 5).replace(/^\n+/, "");
  const frontmatter: WikiFrontmatter = {};
  let currentArrayKey: string | null = null;

  for (const line of rawFrontmatter.split("\n")) {
    if (!line.trim()) {
      continue;
    }

    const arrayMatch = line.match(/^\s*-\s+(.*)$/);
    if (arrayMatch && currentArrayKey) {
      const currentValue = frontmatter[currentArrayKey];
      const values = Array.isArray(currentValue) ? currentValue : [];
      values.push(coerceFrontmatterValue(arrayMatch[1]));
      frontmatter[currentArrayKey] = values;
      continue;
    }

    const pairMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!pairMatch) {
      continue;
    }

    const [, key, rawValue] = pairMatch;
    if (!rawValue) {
      frontmatter[key] = [];
      currentArrayKey = key;
      continue;
    }

    frontmatter[key] = coerceFrontmatterValue(rawValue);
    currentArrayKey = null;
  }

  return { content, frontmatter };
}

export function stringifyFrontmatter(frontmatter: WikiFrontmatter): string {
  const lines = Object.entries(frontmatter)
    .filter(([, value]) => value !== undefined && value !== "")
    .flatMap(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return [`${key}: []`];
        }

        return [`${key}:`, ...value.map((item) => `  - ${item}`)];
      }

      return [`${key}: ${value}`];
    });

  return lines.length > 0 ? `---\n${lines.join("\n")}\n---\n\n` : "";
}

export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[\[([^[\]]+)\]\]/g, (_match, token: string) => {
      const [, label] = token.split("|");
      return label?.trim() || token.split("|")[0]?.trim() || "";
    })
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[>*_~]/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractSummary(markdown: string, explicitSummary?: string): string {
  if (explicitSummary) {
    return explicitSummary;
  }

  for (const block of markdown.split(/\n{2,}/)) {
    const candidate = block.trim();
    if (!candidate || candidate.startsWith("#")) {
      continue;
    }

    const text = stripMarkdown(candidate);
    if (text) {
      return text.slice(0, 220);
    }
  }

  return "No summary available yet.";
}

export function extractHeadings(markdown: string): WikiHeading[] {
  const headings: WikiHeading[] = [];
  let inFence = false;

  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }

    if (inFence) {
      continue;
    }

    const match = line.match(/^(#{1,6})\s+(.*)$/);
    if (!match) {
      continue;
    }

    const depth = match[1].length;
    const text = stripMarkdown(match[2].replace(/\s+#*$/, ""));
    if (!text) {
      continue;
    }

    headings.push({
      depth,
      id: slugify(text),
      text,
    });
  }

  return headings;
}

export function inferPageType(relativePath: string): WikiPageType | string {
  const basename = path.basename(relativePath);
  const special = SPECIAL_PAGE_TYPES.get(basename);
  if (special) {
    return special;
  }

  const [topLevelDir] = relativePath.split(path.sep);
  switch (topLevelDir) {
    case "analyses":
      return "analysis";
    case "concepts":
      return "concept";
    case "entities":
      return "entity";
    case "sources":
      return "source";
    case "topics":
      return "topic";
    default:
      return "system";
  }
}

export function pageTypeDirectory(pageType: string): string {
  switch (pageType) {
    case "analysis":
      return "analyses";
    case "concept":
      return "concepts";
    case "entity":
      return "entities";
    case "source":
      return "sources";
    case "topic":
      return "topics";
    default:
      return "";
  }
}

export function routePathFromRelativePath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/").replace(/\.(md|mdx)$/i, "");
  if (normalized === "overview") {
    return "/";
  }

  return `/${normalized}`;
}

async function collectMarkdownFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const results = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectMarkdownFiles(absolutePath);
      }

      if (!entry.isFile()) {
        return [];
      }

      if (!MARKDOWN_EXTENSIONS.has(path.extname(entry.name)) || entry.name.startsWith(".")) {
        return [];
      }

      return [absolutePath];
    }),
  );

  return results.flat().sort();
}

export async function readWikiPageFromFile(filePath: string): Promise<WikiPage> {
  const absolutePath = path.resolve(filePath);
  const source = await fs.readFile(absolutePath, "utf8");
  const { content, frontmatter } = parseFrontmatter(source);
  const relativePath = path.relative(WIKI_DIR, absolutePath);
  const routePath = routePathFromRelativePath(relativePath);
  const routeSegments = routePath === "/" ? [] : routePath.replace(/^\//, "").split("/");
  const inferredType = inferPageType(relativePath);
  const slug = frontmatter.slug || slugify(path.basename(relativePath, path.extname(relativePath)));
  const title =
    frontmatter.title ||
    path
      .basename(relativePath, path.extname(relativePath))
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

  return {
    absolutePath,
    aliases: Array.isArray(frontmatter.aliases) ? frontmatter.aliases : [],
    content,
    filePath,
    frontmatter,
    headings: extractHeadings(content),
    outgoingLinks: extractWikiLinks(content),
    rawBody: content,
    relativePath,
    routePath,
    routeSegments,
    slug,
    sources: Array.isArray(frontmatter.sources) ? frontmatter.sources : [],
    status: typeof frontmatter.status === "string" ? frontmatter.status : undefined,
    summary: extractSummary(content, typeof frontmatter.summary === "string" ? frontmatter.summary : undefined),
    title,
    type: frontmatter.type || inferredType,
    updated: typeof frontmatter.updated === "string" ? frontmatter.updated : undefined,
  };
}

export async function getAllPages(): Promise<WikiPage[]> {
  const files = await collectMarkdownFiles(WIKI_DIR);
  const pages = await Promise.all(files.map((file) => readWikiPageFromFile(file)));

  return pages.sort((left, right) => left.title.localeCompare(right.title));
}

export async function getPageByRouteSegments(routeSegments: string[]): Promise<WikiPage | undefined> {
  const pages = await getAllPages();
  const routePath = routeSegments.length > 0 ? `/${routeSegments.join("/")}` : "/";
  return pages.find((page) => page.routePath === routePath);
}

export async function getOverviewPage(): Promise<WikiPage | undefined> {
  return getPageByRouteSegments([]);
}

export async function writeMarkdownPage(
  absolutePath: string,
  frontmatter: WikiFrontmatter,
  content: string,
): Promise<void> {
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, `${stringifyFrontmatter(frontmatter)}${content.trim()}\n`, "utf8");
}
