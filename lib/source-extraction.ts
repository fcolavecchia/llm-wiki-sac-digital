import { promises as fs } from "node:fs";
import path from "node:path";

import { RAW_DIR } from "./content";

type Confidence = "high" | "medium" | "low";

interface PdfLine {
  fontSize: number;
  pageNumber: number;
  text: string;
  y: number;
}

interface PdfTextPage {
  lines: PdfLine[];
  pageNumber: number;
  text: string;
}

export interface PdfExtractionResult {
  authors: string[];
  authorsConfidence: Confidence;
  excerpt: string | null;
  extractedMarkdownPath: string;
  extractedText: string;
  pageCount: number;
  processedPdfPath: string | null;
  relativeExtractedMarkdownPath: string;
  relativePdfPath: string;
  title: string;
  titleConfidence: Confidence;
  warnings: string[];
}

export interface PreparedSourceInput {
  authors: string[];
  authorsConfidence?: Confidence;
  excerpt: string | null;
  extractedPath?: string;
  sourcePath: string;
  summary: string;
  title: string;
  titleConfidence?: Confidence;
  warnings?: string[];
}

interface Candidate {
  confidence: Confidence;
  score: number;
  value: string;
}

function titleFromBasename(input: string): string {
  return input
    .replace(/\.(pdf|md|mdx|txt|json|csv)$/i, "")
    .split(/[-_]+/)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function summarizeText(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "Source page created from a file that needs manual summarization.";
  }

  return normalized.slice(0, 220);
}

function cleanInlineText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/[•]/g, " ")
    .replace(/[\u0000-\u001f]/g, "")
    .trim();
}

function sanitizeNameCandidate(input: string): string {
  return input
    .replace(/[*†‡§¶‖#0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function confidenceFromScore(score: number): Confidence {
  if (score >= 8) {
    return "high";
  }

  if (score >= 5) {
    return "medium";
  }

  return "low";
}

function looksLikeGarbageHeader(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("doi") ||
    lower.includes("issn") ||
    lower.includes("www.") ||
    lower.includes("http://") ||
    lower.includes("https://") ||
    lower.includes("copyright") ||
    lower.includes("all rights reserved") ||
    lower.includes("preprint") ||
    lower.includes("arxiv") ||
    lower.includes("journal") ||
    lower.includes("conference") ||
    lower.includes("proceedings")
  );
}

function looksLikeSectionHeading(text: string): boolean {
  const lower = text.toLowerCase().replace(/[:.]+$/, "");
  return ["abstract", "introduction", "keywords", "references", "acknowledgments"].includes(lower);
}

function looksLikeName(text: string): boolean {
  if (text.length < 4 || text.length > 60) {
    return false;
  }

  if (/@|\d/.test(text)) {
    return false;
  }

  const cleaned = sanitizeNameCandidate(text);
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length < 2 || parts.length > 5) {
    return false;
  }

  return parts.every((part) => /^[A-Z][A-Za-z'`.-]+$/.test(part) || /^[A-Z]\.$/.test(part));
}

function splitAuthors(text: string): string[] {
  return sanitizeNameCandidate(text)
    .split(/\s+(?:and|&)\s+|,|;/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter(looksLikeName);
}

function pickBestTitleCandidate(firstPageLines: PdfLine[], fallbackTitle: string): { confidence: Confidence; title: string } {
  const topLines = firstPageLines.slice(0, 18);
  const candidates: Candidate[] = [];

  for (let index = 0; index < topLines.length; index += 1) {
    const line = topLines[index];
    const text = cleanInlineText(line.text);
    if (!text || text.length < 12 || text.length > 220) {
      continue;
    }

    let score = 0;
    score += Math.min(4, line.fontSize / 4);
    score += Math.max(0, 5 - index) * 0.8;

    if (text.split(/\s+/).length >= 4) {
      score += 1.5;
    }

    if (text === text.toUpperCase() && text.length < 40) {
      score -= 2;
    }

    if (text.endsWith(".")) {
      score -= 1;
    }

    if (looksLikeGarbageHeader(text) || looksLikeSectionHeading(text) || text.includes("@")) {
      score -= 4;
    }

    if (/[,:;]/.test(text) && text.split(/\s+/).length < 4) {
      score -= 1.5;
    }

    candidates.push({
      confidence: confidenceFromScore(score),
      score,
      value: text,
    });
  }

  candidates.sort((left, right) => right.score - left.score);
  const best = candidates[0];
  if (!best || best.score < 4) {
    return { confidence: "low", title: fallbackTitle };
  }

  const bestIndex = topLines.findIndex((line) => cleanInlineText(line.text) === best.value);
  const nextLine = bestIndex >= 0 ? topLines[bestIndex + 1] : undefined;
  let merged = best.value;

  if (nextLine) {
    const nextText = cleanInlineText(nextLine.text);
    const fontDelta = Math.abs(nextLine.fontSize - topLines[bestIndex].fontSize);
    if (
      nextText &&
      nextText.length < 120 &&
      !looksLikeGarbageHeader(nextText) &&
      !looksLikeSectionHeading(nextText) &&
      !splitAuthors(nextText).length &&
      fontDelta <= 1.5 &&
      merged.length + nextText.length < 220
    ) {
      merged = `${merged} ${nextText}`;
    }
  }

  return {
    confidence: best.confidence,
    title: merged,
  };
}

function pickBestAuthorCandidate(firstPageLines: PdfLine[], title: string): { authors: string[]; confidence: Confidence } {
  const titleStem = title.slice(0, 24);
  const titleIndex = firstPageLines.findIndex((line) => cleanInlineText(line.text).includes(titleStem));
  const startIndex = titleIndex === -1 ? 1 : titleIndex + 1;
  const candidateLines = firstPageLines.slice(startIndex, startIndex + 10);
  let bestAuthors: string[] = [];
  let bestScore = 0;

  for (const line of candidateLines) {
    const text = cleanInlineText(line.text);
    if (!text || text.length > 200) {
      continue;
    }

    if (
      looksLikeGarbageHeader(text) ||
      looksLikeSectionHeading(text) ||
      /\b(university|department|institute|school|laboratory|abstract)\b/i.test(text) ||
      text.includes("@")
    ) {
      continue;
    }

    const authors = splitAuthors(text);
    if (authors.length === 0) {
      continue;
    }

    let score = authors.length * 2;
    if (authors.length >= 2) {
      score += 2;
    }

    if (text.includes(",") || /\band\b/i.test(text)) {
      score += 1;
    }

    if (text.length < 120) {
      score += 1;
    }

    if (score > bestScore) {
      bestAuthors = authors;
      bestScore = score;
    }
  }

  if (bestAuthors.length === 0) {
    return { authors: [], confidence: "low" };
  }

  return {
    authors: [...new Set(bestAuthors)],
    confidence: confidenceFromScore(bestScore),
  };
}

function metadataTitleCandidate(value: unknown, fallbackTitle: string): { confidence: Confidence; title: string } {
  if (typeof value !== "string") {
    return { confidence: "low", title: fallbackTitle };
  }

  const cleaned = cleanInlineText(value);
  if (!cleaned || looksLikeGarbageHeader(cleaned) || cleaned.length < 8 || cleaned.length > 220) {
    return { confidence: "low", title: fallbackTitle };
  }

  return {
    confidence: cleaned === fallbackTitle ? "low" : "medium",
    title: cleaned,
  };
}

function metadataAuthorCandidate(value: unknown): { authors: string[]; confidence: Confidence } {
  if (typeof value !== "string") {
    return { authors: [], confidence: "low" };
  }

  const authors = splitAuthors(value);
  if (authors.length === 0) {
    return { authors: [], confidence: "low" };
  }

  return {
    authors,
    confidence: authors.length > 1 ? "medium" : "low",
  };
}

function chooseBetterTitle(...candidates: { confidence: Confidence; title: string }[]): { confidence: Confidence; title: string } {
  const order = { high: 3, medium: 2, low: 1 };
  return candidates.sort((left, right) => order[right.confidence] - order[left.confidence])[0];
}

function chooseBetterAuthors(
  ...candidates: { authors: string[]; confidence: Confidence }[]
): { authors: string[]; confidence: Confidence } {
  const order = { high: 3, medium: 2, low: 1 };
  return candidates.sort((left, right) => order[right.confidence] - order[left.confidence])[0];
}

function buildExtractedMarkdown(result: {
  authors: string[];
  authorsConfidence: Confidence;
  pageCount: number;
  pages: PdfTextPage[];
  relativePdfPath: string;
  title: string;
  titleConfidence: Confidence;
  warnings: string[];
}): string {
  const sections: string[] = [
    `# ${result.title}`,
    "",
    "## Extracted Metadata",
    "",
    `- Raw PDF: \`${result.relativePdfPath}\``,
    `- Title confidence: ${result.titleConfidence}`,
    `- Author confidence: ${result.authorsConfidence}`,
    `- Pages: ${result.pageCount}`,
  ];

  if (result.authors.length > 0) {
    sections.push(`- Authors: ${result.authors.join(", ")}`);
  } else {
    sections.push("- Authors: not confidently extracted");
  }

  if (result.warnings.length > 0) {
    sections.push("", "## Warnings", "");
    for (const warning of result.warnings) {
      sections.push(`- ${warning}`);
    }
  }

  sections.push("", "## Extracted Text", "");

  for (const page of result.pages) {
    sections.push(`### Page ${page.pageNumber}`, "", page.text || "_No text extracted on this page._", "");
  }

  return `${sections.join("\n").trim()}\n`;
}

async function loadPdfJs() {
  return import("pdfjs-dist/legacy/build/pdf.mjs");
}

async function extractPdfPages(filePath: string): Promise<{ metadata: { Author?: string; Title?: string } | null; pages: PdfTextPage[] }> {
  const pdfjs = await loadPdfJs();
  const raw = await fs.readFile(filePath);
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(raw),
    disableFontFace: true,
    useSystemFonts: true,
  });
  const document = await loadingTask.promise;
  const metadataResponse = await document.getMetadata().catch(() => null);
  const pages: PdfTextPage[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items
      .flatMap((item) => {
        if (!("str" in item) || !("transform" in item)) {
          return [];
        }

        const height = "height" in item && typeof item.height === "number" ? item.height : 0;
        return [
          {
            fontSize: Math.max(height, Math.abs(item.transform[0] ?? 0), Math.abs(item.transform[3] ?? 0)),
            text: cleanInlineText(item.str),
            x: item.transform[4] ?? 0,
            y: item.transform[5] ?? 0,
          },
        ];
      })
      .filter((item) => item.text.length > 0)
      .sort((left, right) => {
        if (Math.abs(right.y - left.y) > 2) {
          return right.y - left.y;
        }

        return left.x - right.x;
      });

    const groupedLines: PdfLine[] = [];

    for (const item of items) {
      const last = groupedLines.at(-1);
      if (last && Math.abs(last.y - item.y) <= 2) {
        last.text = cleanInlineText(`${last.text} ${item.text}`);
        last.fontSize = Math.max(last.fontSize, item.fontSize);
        continue;
      }

      groupedLines.push({
        fontSize: item.fontSize,
        pageNumber,
        text: item.text,
        y: item.y,
      });
    }

    pages.push({
      lines: groupedLines,
      pageNumber,
      text: groupedLines.map((line) => line.text).join("\n"),
    });
  }

  await loadingTask.destroy();

  return {
    metadata: (metadataResponse?.info as { Author?: string; Title?: string } | undefined) ?? null,
    pages,
  };
}

async function movePdfToProcessed(filePath: string): Promise<string | null> {
  const inboxPath = path.join(RAW_DIR, "inbox");
  const relativeToInbox = path.relative(inboxPath, filePath);
  if (relativeToInbox.startsWith("..")) {
    return null;
  }

  const processedPath = path.join(RAW_DIR, "processed", relativeToInbox);
  await fs.mkdir(path.dirname(processedPath), { recursive: true });
  await fs.rename(filePath, processedPath);
  return processedPath;
}

export async function preprocessPdf(filePath: string, options?: { move?: boolean }): Promise<PdfExtractionResult> {
  const absolutePath = path.resolve(filePath);
  const basename = path.basename(absolutePath, path.extname(absolutePath));
  const fallbackTitle = titleFromBasename(basename);
  const { metadata, pages } = await extractPdfPages(absolutePath);
  const fullText = pages.map((page) => page.text).join("\n\n").trim();
  const firstPageLines = pages[0]?.lines ?? [];
  const titleChoice = chooseBetterTitle(
    pickBestTitleCandidate(firstPageLines, fallbackTitle),
    metadataTitleCandidate(metadata?.Title, fallbackTitle),
    { confidence: "low", title: fallbackTitle },
  );
  const authorChoice = chooseBetterAuthors(
    pickBestAuthorCandidate(firstPageLines, titleChoice.title),
    metadataAuthorCandidate(metadata?.Author),
    { authors: [], confidence: "low" },
  );

  const warnings: string[] = [];
  if (!fullText) {
    warnings.push("No extractable text found. This PDF may require OCR.");
  }

  if (titleChoice.confidence === "low") {
    warnings.push("Title extraction confidence is low; filename fallback may be in use.");
  }

  if (authorChoice.confidence === "low") {
    warnings.push("Author extraction confidence is low; verify author names manually.");
  }

  const processedPdfAbsolutePath = options?.move !== false ? await movePdfToProcessed(absolutePath) : null;
  const pdfPathForArtifacts = processedPdfAbsolutePath || absolutePath;
  const artifactBase = path.join(
    path.dirname(pdfPathForArtifacts),
    `${path.basename(pdfPathForArtifacts, path.extname(pdfPathForArtifacts))}.extracted`,
  );
  const extractedMarkdownPath = `${artifactBase}.md`;
  const metadataPath = `${artifactBase}.json`;
  const relativePdfPath = path.relative(process.cwd(), pdfPathForArtifacts);
  const relativeExtractedMarkdownPath = path.relative(process.cwd(), extractedMarkdownPath);

  await fs.mkdir(path.dirname(extractedMarkdownPath), { recursive: true });
  await fs.writeFile(
    extractedMarkdownPath,
    buildExtractedMarkdown({
      authors: authorChoice.authors,
      authorsConfidence: authorChoice.confidence,
      pageCount: pages.length,
      pages,
      relativePdfPath,
      title: titleChoice.title,
      titleConfidence: titleChoice.confidence,
      warnings,
    }),
    "utf8",
  );
  await fs.writeFile(
    metadataPath,
    `${JSON.stringify(
      {
        authors: authorChoice.authors,
        authors_confidence: authorChoice.confidence,
        page_count: pages.length,
        source_path: relativePdfPath,
        title: titleChoice.title,
        title_confidence: titleChoice.confidence,
        warnings,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return {
    authors: authorChoice.authors,
    authorsConfidence: authorChoice.confidence,
    excerpt: fullText ? fullText.slice(0, 1200) : null,
    extractedMarkdownPath,
    extractedText: fullText,
    pageCount: pages.length,
    processedPdfPath: processedPdfAbsolutePath ? path.relative(process.cwd(), processedPdfAbsolutePath) : null,
    relativeExtractedMarkdownPath,
    relativePdfPath,
    title: titleChoice.title,
    titleConfidence: titleChoice.confidence,
    warnings,
  };
}

export async function prepareSourceForIngestion(filePath: string, options?: { move?: boolean }): Promise<PreparedSourceInput> {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".pdf") {
    const result = await preprocessPdf(filePath, options);
    return {
      authors: result.authors,
      authorsConfidence: result.authorsConfidence,
      excerpt: result.excerpt,
      extractedPath: result.relativeExtractedMarkdownPath,
      sourcePath: result.relativePdfPath,
      summary: summarizeText(result.extractedText),
      title: result.title,
      titleConfidence: result.titleConfidence,
      warnings: result.warnings,
    };
  }

  const sourcePath = path.resolve(filePath);
  const rawText = await fs.readFile(sourcePath, "utf8");
  const basename = path.basename(sourcePath, path.extname(sourcePath));

  return {
    authors: [],
    excerpt: rawText.trim().slice(0, 1200) || null,
    sourcePath: path.relative(process.cwd(), sourcePath),
    summary: summarizeText(rawText),
    title: titleFromBasename(basename),
    warnings: [],
  };
}

export async function preprocessPdfDirectory(directory: string): Promise<PdfExtractionResult[]> {
  const absoluteDirectory = path.resolve(directory);
  const entries = await fs.readdir(absoluteDirectory, { withFileTypes: true });
  const results: PdfExtractionResult[] = [];

  for (const entry of entries) {
    const entryPath = path.join(absoluteDirectory, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await preprocessPdfDirectory(entryPath)));
      continue;
    }

    if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".pdf") {
      results.push(await preprocessPdf(entryPath, { move: false }));
    }
  }

  return results;
}
