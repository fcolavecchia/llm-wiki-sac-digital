export type WikiPageType =
  | "analysis"
  | "concept"
  | "entity"
  | "overview"
  | "source"
  | "system"
  | "topic";

export interface WikiFrontmatter {
  aliases?: string[];
  slug?: string;
  source_path?: string;
  sources?: string[];
  status?: string;
  summary?: string;
  title?: string;
  type?: string;
  updated?: string;
  [key: string]: string | string[] | undefined;
}

export interface WikiHeading {
  depth: number;
  id: string;
  text: string;
}

export interface WikiPage {
  absolutePath: string;
  aliases: string[];
  content: string;
  filePath: string;
  frontmatter: WikiFrontmatter;
  headings: WikiHeading[];
  outgoingLinks: string[];
  rawBody: string;
  relativePath: string;
  routePath: string;
  routeSegments: string[];
  slug: string;
  sources: string[];
  status?: string;
  summary: string;
  title: string;
  type: WikiPageType | string;
  updated?: string;
}

export interface LogEntry {
  bullets: string[];
  date: string;
  label: string;
  subject: string;
}

export interface LintFinding {
  code: string;
  file?: string;
  level: "error" | "warning";
  message: string;
}
