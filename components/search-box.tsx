"use client";

import { useState } from "react";
import Link from "next/link";

interface SearchItem {
  routePath: string;
  summary: string;
  title: string;
  type: string;
}

interface SearchBoxProps {
  items: SearchItem[];
}

export function SearchBox({ items }: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const results = normalized
    ? items
        .filter((item) => {
          const haystack = `${item.title} ${item.summary} ${item.type}`.toLowerCase();
          return haystack.includes(normalized);
        })
        .slice(0, 8)
    : [];

  return (
    <div className="search-box">
      <input
        aria-label="Search wiki pages"
        className="search-input"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search concepts, sources, analyses..."
        type="search"
        value={query}
      />
      {results.length > 0 ? (
        <div className="search-results">
          {results.map((item) => (
            <Link className="result-link" href={item.routePath} key={item.routePath} onClick={() => setQuery("")}>
              <span className="result-label">{item.type}</span>
              <span className="result-title">{item.title}</span>
              <span className="result-summary">{item.summary}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
