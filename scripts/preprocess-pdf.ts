import path from "node:path";
import { pathToFileURL } from "node:url";

import { preprocessPdf } from "../lib/source-extraction";

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: npm run preprocess:pdf -- <path/to/file.pdf>");
    process.exit(1);
  }

  const result = await preprocessPdf(target, { move: false });
  console.log(`Processed PDF: ${path.relative(process.cwd(), path.resolve(target))}`);
  console.log(`Title: ${result.title} (${result.titleConfidence})`);
  console.log(`Authors: ${result.authors.join(", ") || "not confidently extracted"} (${result.authorsConfidence})`);
  console.log(`Extracted markdown: ${result.relativeExtractedMarkdownPath}`);
  if (result.warnings.length > 0) {
    console.log(`Warnings: ${result.warnings.join(" | ")}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
