import Link from "next/link";

import { getTypeLabel } from "../lib/labels";
import type { WikiHeading, WikiPage } from "../lib/types";

interface WikiPageViewProps {
  backlinks: WikiPage[];
  html: string;
  page: WikiPage;
  related: WikiPage[];
  toc: WikiHeading[];
}

export function WikiPageView({ backlinks, html, page, related, toc }: WikiPageViewProps) {
  const breadcrumbs = page.routeSegments;

  return (
    <div className="content-panel">
      {breadcrumbs.length > 0 ? (
        <div className="breadcrumbs">
          <span>
            <Link href="/">inicio</Link>
          </span>
          {breadcrumbs.map((segment, index) => (
            <span key={`${segment}-${index}`}>{segment}</span>
          ))}
        </div>
      ) : null}

      <div className="wiki-grid">
        <article className="markdown">
          <span className="eyebrow">{getTypeLabel(page.type)}</span>
          <h1 className="page-title">{page.title}</h1>
          <p className="page-summary">{page.summary}</p>

          <div className="meta-row">
            {page.updated ? <span className="pill">Actualizado {page.updated}</span> : null}
            {page.status ? <span className="pill">Estado {page.status}</span> : null}
            {page.sources.length > 0 ? <span className="pill">{page.sources.length} enlace(s) a fuente</span> : null}
          </div>

          <div dangerouslySetInnerHTML={{ __html: html }} />
        </article>

        <aside className="stack">
          {toc.length > 1 ? (
            <section className="panel-card">
              <h2>En esta página</h2>
              <ul className="toc-list">
                {toc.map((heading) => (
                  <li key={heading.id}>
                    <a href={`#${heading.id}`}>{heading.text}</a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {page.sources.length > 0 ? (
            <section className="panel-card">
              <h2>IDs de fuentes</h2>
              <ul className="inline-list">
                {page.sources.map((source) => (
                  <li key={source}>{source}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {backlinks.length > 0 ? (
            <section className="panel-card">
              <h2>Enlaces entrantes</h2>
              <ul className="inline-list">
                {backlinks.map((link) => (
                  <li key={link.absolutePath}>
                    <Link href={link.routePath}>{link.title}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {related.length > 0 ? (
            <section className="panel-card">
              <h2>Relacionado</h2>
              <ul className="inline-list">
                {related.map((link) => (
                  <li key={link.absolutePath}>
                    <Link href={link.routePath}>{link.title}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
