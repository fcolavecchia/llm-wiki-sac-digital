import { promises as fs } from "node:fs";

import { getAllPages, parseFrontmatter, stringifyFrontmatter } from "../lib/content";
import { resolveWikiLinkTarget } from "../lib/links";

async function main() {
  const pages = await getAllPages();
  let updatedFiles = 0;

  for (const page of pages) {
    const normalizedBody = page.rawBody.replace(/\[\[([^[\]]+)\]\]/g, (_match, token: string) => {
      const [rawTarget, rawLabel] = token.split("|").map((value) => value.trim());
      const target = resolveWikiLinkTarget(rawTarget, pages);

      if (!target) {
        return `[[${token}]]`;
      }

      const label = rawLabel ? `|${rawLabel}` : "";
      return `[[${target.title}${label}]]`;
    });

    if (normalizedBody === page.rawBody) {
      continue;
    }

    const source = await fs.readFile(page.absolutePath, "utf8");
    const { frontmatter } = parseFrontmatter(source);
    await fs.writeFile(page.absolutePath, `${stringifyFrontmatter(frontmatter)}${normalizedBody.trim()}\n`, "utf8");
    updatedFiles += 1;
  }

  console.log(`Normalized wiki links in ${updatedFiles} file(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
