import path from "node:path";

import { RAW_DIR } from "../lib/content";
import { preprocessPdfDirectory } from "../lib/source-extraction";

async function main() {
  const target = process.argv[2] || path.join(RAW_DIR, "inbox");
  const results = await preprocessPdfDirectory(target);

  if (results.length === 0) {
    console.log("No PDF files found.");
    return;
  }

  for (const result of results) {
    console.log(`${result.relativePdfPath} -> ${result.relativeExtractedMarkdownPath}`);
    console.log(`  title: ${result.title} (${result.titleConfidence})`);
    console.log(`  authors: ${result.authors.join(", ") || "not confidently extracted"} (${result.authorsConfidence})`);
    if (result.warnings.length > 0) {
      console.log(`  warnings: ${result.warnings.join(" | ")}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
