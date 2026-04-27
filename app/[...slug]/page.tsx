import { notFound } from "next/navigation";

import { WikiPageView } from "../../components/wiki-page";
import { getAllPages, getPageByRouteSegments } from "../../lib/content";
import { renderMarkdown } from "../../lib/markdown";
import { buildPageMetadata } from "../../lib/metadata";
import { getBacklinks, getRelatedPages } from "../../lib/wiki";

export const dynamicParams = false;

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug = [] } = await params;
  const page = await getPageByRouteSegments(slug);
  return page ? buildPageMetadata(page) : {};
}

export async function generateStaticParams() {
  const pages = await getAllPages();
  return pages
    .filter((page) => page.routePath !== "/")
    .map((page) => ({
      slug: page.routeSegments,
    }));
}

export default async function WikiCatchAllPage({ params }: PageProps) {
  const { slug = [] } = await params;
  const [pages, page] = await Promise.all([getAllPages(), getPageByRouteSegments(slug)]);
  if (!page || page.routePath === "/") {
    notFound();
  }

  const html = await renderMarkdown(page.rawBody, pages);

  return (
    <WikiPageView
      backlinks={getBacklinks(page, pages)}
      html={html}
      page={page}
      related={getRelatedPages(page, pages)}
      toc={page.headings}
    />
  );
}
