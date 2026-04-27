import { promises as fs } from "node:fs";
import path from "node:path";

import { RAW_DIR } from "../lib/content";
import { ingestSourceFile } from "./ingest";

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .filter((entry) => !entry.name.startsWith("."))
      .map(async (entry) => {
        const absolutePath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          return collectFiles(absolutePath);
        }

        return entry.isFile() ? [absolutePath] : [];
      }),
  );

  return nested.flat().sort();
}

async function main() {
  const inbox = path.join(RAW_DIR, "inbox");
  const files = await collectFiles(inbox);

  if (files.length === 0) {
    console.log("No files found in raw/inbox.");
    return;
  }

  for (const file of files) {
    await ingestSourceFile(file);
    console.log(`Processed ${path.relative(process.cwd(), file)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
