import Link from "next/link";
import { notFound } from "next/navigation";

import { WikiPageView } from "../components/wiki-page";
import { getAllPages, getOverviewPage } from "../lib/content";
import { getTypeLabel } from "../lib/labels";
import { renderMarkdown } from "../lib/markdown";
import { getBacklinks, getRecentPages, getRelatedPages, parseLogEntries } from "../lib/wiki";

export default async function HomePage() {
  const [pages, overview] = await Promise.all([getAllPages(), getOverviewPage()]);
  if (!overview) {
    notFound();
  }

  const html = await renderMarkdown(overview.rawBody, pages);
  const recentPages = getRecentPages(pages, 3);
  const logPage = pages.find((page) => page.routePath === "/log");
  const activity = logPage ? parseLogEntries(logPage.rawBody).slice(0, 4) : [];

  return (
    <div className="stack">
      <WikiPageView
        backlinks={getBacklinks(overview, pages)}
        html={html}
        page={overview}
        related={getRelatedPages(overview, pages)}
        toc={overview.headings}
      />

      <section className="content-panel">
        <h2 className="section-title">Páginas actualizadas recientemente</h2>
        <p className="section-copy">Páginas curadas más recientes del wiki Sac Digital.</p>
        <div className="feature-grid">
          {recentPages.map((page) => (
            <article className="feature-card" key={page.absolutePath}>
              <span className="eyebrow">{getTypeLabel(page.type)}</span>
              <h3>
                <Link href={page.routePath}>{page.title}</Link>
              </h3>
              <p>{page.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="content-panel">
        <h2 className="section-title">Actividad reciente</h2>
        <div className="activity-list">
          {activity.map((entry) => (
            <article className="activity-item" key={`${entry.date}-${entry.subject}`}>
              <div className="pill-row">
                <span className="pill">{entry.date}</span>
                <span className="pill">{entry.label}</span>
              </div>
              <h3>{entry.subject}</h3>
              <ul className="inline-list">
                {entry.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
