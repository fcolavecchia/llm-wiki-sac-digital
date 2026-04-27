import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { getAllPages, WIKI_DIR } from "../lib/content";
import { buildIndexMarkdown } from "../lib/wiki";

export async function rebuildIndex(): Promise<string> {
  const pages = await getAllPages();
  const markdown = buildIndexMarkdown(pages);
  await fs.writeFile(path.join(WIKI_DIR, "index.md"), markdown, "utf8");
  return markdown;
}

async function main() {
  await rebuildIndex();
  console.log("Rebuilt wiki/index.md");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
