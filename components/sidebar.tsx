import Link from "next/link";

import { SearchBox } from "./search-box";
import { getTypeLabel } from "../lib/labels";
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
        <h1>Conocimiento curado.</h1>
        <p>Markdown mantenido por LLM.</p>
      </div>

      <SearchBox items={searchItems} />

      <nav>
        <section className="nav-section">
          <h2>Empezar aquí</h2>
          <ul className="nav-list">
            <li>
              <Link className="nav-link" href="/">
                <span className="nav-title">Panorama general</span>
                <span className="nav-summary">Abrir la entrada principal del wiki.</span>
              </Link>
            </li>
            <li>
              <Link className="nav-link" href="/sources">
                <span className="nav-title">Fuentes</span>
                <span className="nav-summary">Revisar las páginas fuente incorporadas.</span>
              </Link>
            </li>
            <li>
              <Link className="nav-link" href="/activity">
                <span className="nav-title">Actividad reciente</span>
                <span className="nav-summary">Leer el registro append-only.</span>
              </Link>
            </li>
          </ul>
        </section>

        <section className="nav-section">
          <h2>Actualizadas recientemente</h2>
          <ul className="nav-list">
            {recent.map((page) => (
              <li key={page.absolutePath}>
                <Link className="nav-link" href={page.routePath}>
                  <span className="nav-title">{page.title}</span>
                  <span className="nav-summary">{page.updated || "Sin fecha de actualización"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {[...groups.entries()].map(([type, group]) => (
          <section className="nav-section" key={type}>
            <h2>{getTypeLabel(type, true)}</h2>
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
