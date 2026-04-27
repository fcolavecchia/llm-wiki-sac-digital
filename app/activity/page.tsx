import { getAllPages } from "../../lib/content";
import { parseLogEntries } from "../../lib/wiki";

export default async function ActivityPage() {
  const pages = await getAllPages();
  const logPage = pages.find((page) => page.routePath === "/log");
  const entries = logPage ? parseLogEntries(logPage.rawBody) : [];

  return (
    <section className="content-panel">
      <span className="eyebrow">Activity</span>
      <h1 className="page-title">Recent wiki changes</h1>
      <p className="page-summary">This page is derived from the append-only log at <code>wiki/log.md</code>.</p>

      <div className="activity-list">
        {entries.map((entry) => (
          <article className="activity-item" key={`${entry.date}-${entry.subject}`}>
            <div className="pill-row">
              <span className="pill">{entry.date}</span>
              <span className="pill">{entry.label}</span>
            </div>
            <h2>{entry.subject}</h2>
            <ul className="inline-list">
              {entry.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
