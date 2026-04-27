import type { Metadata } from "next";

import type { WikiPage } from "./types";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "LLM Wiki Template";

export function buildPageMetadata(page: WikiPage): Metadata {
  return {
    title: page.title,
    description: page.summary,
  };
}
