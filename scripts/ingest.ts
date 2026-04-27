import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { RAW_DIR, WIKI_DIR, writeMarkdownPage } from "../lib/content";
import { slugify } from "../lib/links";
import { prepareSourceForIngestion } from "../lib/source-extraction";
import type { WikiFrontmatter } from "../lib/types";
import { appendLogEntry } from "../lib/wiki";
import { rebuildIndex } from "./build-index";

function buildSourceBody(input: {
  authors: string[];
  authorsConfidence?: string;
  excerpt: string | null;
  extractedPath?: string;
  relativeSourcePath: string;
  summary: string;
  titleConfidence?: string;
  warnings?: string[];
}): string {
  const sections = [
    `# Summary`,
    "",
    input.summary || "Add a concise summary for this source.",
    "",
    "## Extracted Metadata",
    "",
    `- Raw file: \`${input.relativeSourcePath}\``,
    `- Title confidence: ${input.titleConfidence || "n/a"}`,
    `- Author confidence: ${input.authorsConfidence || "n/a"}`,
  ];

  if (input.authors.length > 0) {
    sections.push(`- Authors: ${input.authors.join(", ")}`);
  } else {
    sections.push("- Authors: not confidently extracted");
  }

  if (input.extractedPath) {
    sections.push(`- Extracted text: \`${input.extractedPath}\``);
  }

  sections.push(
    "",
    "## Source Trace",
    "",
    `- Canonical source path: \`${input.relativeSourcePath}\``,
  );

  if (input.warnings && input.warnings.length > 0) {
    sections.push("", "## Warnings", "");
    for (const warning of input.warnings) {
      sections.push(`- ${warning}`);
    }
  }

  sections.push(
    "",
    "## Related Pages",
    "",
    "- Link this source to concepts, entities, topics, or analyses as they are created.",
  );

  if (input.excerpt) {
    sections.push("", "## Raw Excerpt", "", "```text", input.excerpt, "```");
  }

  return `${sections.join("\n").trim()}\n`;
}

async function moveToProcessed(filePath: string): Promise<string | null> {
  const inboxPath = path.join(RAW_DIR, "inbox");
  const relativeToInbox = path.relative(inboxPath, filePath);
  if (relativeToInbox.startsWith("..")) {
    return null;
  }

  const processedPath = path.join(RAW_DIR, "processed", relativeToInbox);
  await fs.mkdir(path.dirname(processedPath), { recursive: true });
  await fs.rename(filePath, processedPath);
  return path.relative(process.cwd(), processedPath);
}

export async function ingestSourceFile(filePath: string, options?: { move?: boolean }) {
  const absolutePath = path.resolve(filePath);
  const stats = await fs.stat(absolutePath);
  if (!stats.isFile()) {
    throw new Error(`Expected a file: ${filePath}`);
  }

  const now = new Date().toISOString().slice(0, 10);
  const basename = path.basename(absolutePath, path.extname(absolutePath));
  const sourceSlug = `${now}-${slugify(basename)}`;
  const prepared = await prepareSourceForIngestion(absolutePath, options);
  const isPdf = path.extname(absolutePath).toLowerCase() === ".pdf";
  const processedPath = !isPdf && options?.move !== false ? await moveToProcessed(absolutePath) : null;
  const sourcePathForPage = isPdf ? prepared.sourcePath : processedPath || prepared.sourcePath;
  const frontmatter: WikiFrontmatter = {
    authors: prepared.authors,
    authors_confidence: prepared.authorsConfidence,
    extracted_path: prepared.extractedPath,
    slug: sourceSlug,
    source_path: sourcePathForPage,
    status: "active",
    summary: prepared.summary,
    title: prepared.title,
    title_confidence: prepared.titleConfidence,
    type: "source",
    updated: now,
  };

  const destination = path.join(WIKI_DIR, "sources", `${sourceSlug}.md`);
  await writeMarkdownPage(
    destination,
    frontmatter,
    buildSourceBody({
      authors: prepared.authors,
      authorsConfidence: prepared.authorsConfidence,
      excerpt: prepared.excerpt,
      extractedPath: prepared.extractedPath,
      relativeSourcePath: sourcePathForPage,
      summary: prepared.summary,
      titleConfidence: prepared.titleConfidence,
      warnings: prepared.warnings,
    }),
  );

  const bullets = [`Added or updated source page: [[${prepared.title}]]`];
  if (processedPath) {
    bullets.push(`Moved raw file to \`${processedPath}\``);
  }
  if (prepared.extractedPath) {
    bullets.push(`Wrote extracted text to \`${prepared.extractedPath}\``);
  }

  await rebuildIndex();
  await appendLogEntry("ingest", basename.replace(/[-_]+/g, " "), bullets);

  return {
    destination,
    sourceSlug,
    summary: prepared.summary,
  };
}

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: npm run ingest -- <path/to/file>");
    process.exit(1);
  }

  const result = await ingestSourceFile(target);
  console.log(`Ingested ${result.sourceSlug} -> ${path.relative(process.cwd(), result.destination)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
