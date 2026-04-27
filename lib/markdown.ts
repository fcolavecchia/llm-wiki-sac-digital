import { marked } from "marked";

import { rewriteWikiLinks, slugify } from "./links";
import type { WikiPage } from "./types";

async function injectHeadingAnchors(markdown: string): Promise<string> {
  let inFence = false;
  const output: string[] = [];

  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      output.push(line);
      continue;
    }

    if (inFence) {
      output.push(line);
      continue;
    }

    const match = line.match(/^(#{1,6})\s+(.*)$/);
    if (!match) {
      output.push(line);
      continue;
    }

    const depth = match[1].length;
    const rawText = match[2].replace(/\s+#*$/, "").trim();
    const text = rawText.replace(/[*_`]/g, "");
    const html = await marked.parseInline(rawText);

    output.push(`<h${depth} id="${slugify(text)}">${html}</h${depth}>`);
  }

  return output.join("\n");
}

export async function renderMarkdown(markdown: string, pages: WikiPage[]): Promise<string> {
  const linked = rewriteWikiLinks(markdown, pages);
  const anchored = await injectHeadingAnchors(linked);
  return marked.parse(anchored);
}
