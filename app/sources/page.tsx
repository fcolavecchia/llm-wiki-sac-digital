import Link from "next/link";

import { getAllPages } from "../../lib/content";

export default async function SourcesPage() {
  const pages = await getAllPages();
  const sources = pages
    .filter((page) => page.type === "source")
    .sort((left, right) => (right.updated || "").localeCompare(left.updated || ""));

  return (
    <section className="content-panel">
      <span className="eyebrow">Fuentes</span>
      <h1 className="page-title">Páginas fuente</h1>
      <p className="page-summary">
        Cada documento raw incorporado debe mapearse a una página bajo <code>wiki/sources/</code>.
      </p>

      <div className="source-grid">
        {sources.map((source) => (
          <article className="source-item" key={source.absolutePath}>
            <div className="pill-row">
              <span className="pill">{source.updated || "Sin fecha"}</span>
              <span className="pill">{source.slug}</span>
            </div>
            <h2>
              <Link href={source.routePath}>{source.title}</Link>
            </h2>
            <p>{source.summary}</p>
            {typeof source.frontmatter.source_path === "string" ? (
              <p className="source-meta">Archivo fuente: {source.frontmatter.source_path}</p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
