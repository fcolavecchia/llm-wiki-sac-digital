import Link from "next/link";

import { SearchBox } from "./search-box";
import type { WikiPage } from "../lib/types";
import { getRecentPages, groupPagesByType } from "../lib/wiki";

interface SidebarProps {
  pages: WikiPage[];
}

export function Sidebar({ pages }: SidebarProps) {
  const groups = groupPagesByType(pages.filter((page) => page.type !== "system"));
  const recent = getRecentPages(pages);
  const searchItems = pages
    .filter((page) => page.type !== "system")
    .map((page) => ({
      routePath: page.routePath,
      summary: page.summary,
      title: page.title,
      type: page.type,
    }));

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-kicker">LLM Wiki</span>
        <h1>Curated knowledge.</h1>
        <p>LLM-maintained Markdown.</p>
      </div>

      <SearchBox items={searchItems} />

      <nav>
        <section className="nav-section">
          <h2>Start Here</h2>
          <ul className="nav-list">
            <li>
              <Link className="nav-link" href="/">
                <span className="nav-title">Overview</span>
                <span className="nav-summary">Open the wiki front door.</span>
              </Link>
            </li>
            <li>
              <Link className="nav-link" href="/sources">
                <span className="nav-title">Sources</span>
                <span className="nav-summary">Review ingested source pages.</span>
              </Link>
            </li>
            <li>
              <Link className="nav-link" href="/activity">
                <span className="nav-title">Recent Activity</span>
                <span className="nav-summary">Read the append-only log.</span>
              </Link>
            </li>
          </ul>
        </section>

        <section className="nav-section">
          <h2>Recently Updated</h2>
          <ul className="nav-list">
            {recent.map((page) => (
              <li key={page.absolutePath}>
                <Link className="nav-link" href={page.routePath}>
                  <span className="nav-title">{page.title}</span>
                  <span className="nav-summary">{page.updated || "No update date yet"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {[...groups.entries()].map(([type, group]) => (
          <section className="nav-section" key={type}>
            <h2>{type}</h2>
            <ul className="nav-list">
              {group.slice(0, 8).map((page) => (
                <li key={page.absolutePath}>
                  <Link className="nav-link" href={page.routePath}>
                    <span className="nav-title">{page.title}</span>
                    <span className="nav-summary">{page.summary}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>
    </aside>
  );
}
