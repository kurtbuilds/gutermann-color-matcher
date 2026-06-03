"use client";

import { Search, SlidersHorizontal, SwatchBook } from "lucide-react";
import { useMemo, useState } from "react";
import { ImageSampler } from "@/components/ImageSampler";
import { filterThreads } from "@/lib/filter";
import { findClosestThreads, getReadableTextColor, normalizeHex } from "@/lib/color";
import { threads } from "@/data/threads";
import type { ThreadColor, ThreadMatch } from "@/types/thread";

const MATCH_LIMIT = 8;

export function ColorMatcher() {
  const [catalogQuery, setCatalogQuery] = useState("");
  const [hexInput, setHexInput] = useState("");
  const [selectedHex, setSelectedHex] = useState<string | null>(null);

  const filteredThreads = useMemo(() => filterThreads(threads, catalogQuery), [catalogQuery]);
  const matches = useMemo<ThreadMatch[]>(
    () => (selectedHex ? findClosestThreads(selectedHex, threads, MATCH_LIMIT) : []),
    [selectedHex]
  );

  const handleHexInput = (value: string) => {
    setHexInput(value);
    const normalized = normalizeHex(value);
    if (normalized) {
      setSelectedHex(normalized);
    }
  };

  const handleImagePick = (hex: string) => {
    setHexInput(hex);
    setSelectedHex(hex);
  };

  return (
    <main className="app-shell">
      <section className="workspace" aria-label="Gutermann thread color matcher">
        <div className="tool-panel">
          <div className="brand-row">
            <div className="brand-mark" aria-hidden="true">
              <SwatchBook size={24} strokeWidth={1.8} />
            </div>
            <div>
              <h1>Gutermann Color Matcher</h1>
              <p>{threads.length} wholesale thread colors</p>
            </div>
          </div>

          <div className="control-group">
            <label htmlFor="hex-input">Color</label>
            <div className="hex-row">
              <input
                id="hex-input"
                value={hexInput}
                onChange={(event) => handleHexInput(event.target.value)}
                placeholder="#8f4a3d"
                inputMode="text"
                spellCheck={false}
                aria-describedby="hex-status"
              />
              <div
                className="selected-chip"
                style={{
                  backgroundColor: selectedHex ?? "#ffffff",
                  color: selectedHex ? getReadableTextColor(selectedHex) : "#6b7280"
                }}
                aria-label={selectedHex ? `Selected color ${selectedHex}` : "No color selected"}
              >
                {selectedHex ?? "Pick"}
              </div>
            </div>
            <p id="hex-status" className="field-note">
              {hexInput && !normalizeHex(hexInput) ? "Use a 3- or 6-digit hex color." : " "}
            </p>
          </div>

          <ImageSampler onPick={handleImagePick} selectedHex={selectedHex} />

          <div className="control-group">
            <label htmlFor="catalog-search">Browse</label>
            <div className="search-row">
              <Search size={18} strokeWidth={1.9} aria-hidden="true" />
              <input
                id="catalog-search"
                value={catalogQuery}
                onChange={(event) => setCatalogQuery(event.target.value)}
                placeholder="Name, retail, or wholesale"
                spellCheck={false}
              />
            </div>
          </div>
        </div>

        <div className="results-panel">
          <section className="match-section" aria-labelledby="matches-title">
            <div className="section-heading">
              <div>
                <h2 id="matches-title">Closest Matches</h2>
                <p>Top {MATCH_LIMIT} by CIEDE2000 Delta E</p>
              </div>
              <SlidersHorizontal size={21} strokeWidth={1.8} aria-hidden="true" />
            </div>

            {selectedHex ? (
              <div className="match-list">
                {matches.map((thread, index) => (
                  <MatchRow key={thread.wholesaleCode} index={index + 1} thread={thread} />
                ))}
              </div>
            ) : (
              <div className="empty-state">Enter a hex color or pick a pixel from an image.</div>
            )}

            <p className="accuracy-note">Digital PDF and screen colors are approximate; compare against a physical thread card before final purchase decisions.</p>
          </section>

          <section className="catalog-section" aria-labelledby="catalog-title">
            <div className="section-heading">
              <div>
                <h2 id="catalog-title">Thread Catalog</h2>
                <p>{filteredThreads.length} visible colors</p>
              </div>
            </div>

            <div className="catalog-grid">
              {filteredThreads.map((thread) => (
                <ThreadTile key={thread.wholesaleCode} thread={thread} />
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function MatchRow({ index, thread }: { index: number; thread: ThreadMatch }) {
  return (
    <article className="match-row">
      <div className="match-rank">{index}</div>
      <ThreadSwatch hex={thread.hex} />
      <ThreadDetails thread={thread} />
      <div className="distance-pill">{thread.deltaE.toFixed(2)}</div>
    </article>
  );
}

function ThreadTile({ thread }: { thread: ThreadColor }) {
  return (
    <article className="thread-tile">
      <ThreadSwatch hex={thread.hex} />
      <ThreadDetails thread={thread} />
    </article>
  );
}

function ThreadSwatch({ hex }: { hex: string }) {
  return (
    <div className="thread-swatch" style={{ backgroundColor: hex }}>
      <span style={{ color: getReadableTextColor(hex) }}>{hex}</span>
    </div>
  );
}

function ThreadDetails({ thread }: { thread: ThreadColor }) {
  return (
    <div className="thread-details">
      <div className="thread-name">{thread.name ?? "Unnamed shade"}</div>
      <div className="thread-codes">
        <span>W {thread.wholesaleCode}</span>
        {thread.retailCode ? <span>R {thread.retailCode}</span> : null}
      </div>
    </div>
  );
}
