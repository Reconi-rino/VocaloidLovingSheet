import Fuse from "fuse.js";
import { pinyin } from "pinyin-pro";
import type { Entry, EntryType } from "../types";

function toPinyin(text: string): string {
  if (!text) return "";
  const arr = pinyin(text, { toneType: "none", type: "array" });
  return arr.join(" ");
}

function toPinyinCompact(text: string): string {
  if (!text) return "";
  const arr = pinyin(text, { toneType: "none", type: "array" });
  return arr.join("");
}

function pinyinFields(entry: Entry): string {
  const sources = [
    entry.title,
    entry.displayTitle,
    entry.chineseTitle,
    entry.englishTitle,
    ...(entry.aliases || []),
  ].filter(Boolean);
  const spaced = sources.map((s) => toPinyin(s!)).join(" ");
  const compact = sources.map((s) => toPinyinCompact(s!)).join(" ");
  return spaced + " " + compact;
}

type AugmentedEntry = Entry & { _pinyin: string };

function augment(entries: Entry[]): AugmentedEntry[] {
  return entries.map((e) => ({ ...e, _pinyin: pinyinFields(e) }));
}

const fuseOptions = {
  keys: [
    "title",
    "originalTitle",
    "displayTitle",
    "chineseTitle",
    "japaneseTitle",
    "englishTitle",
    "aliases",
    "producers",
    "singers",
    "album",
    "tags",
    "_pinyin",
  ],
  threshold: 0.3,
  includeScore: true,
};

function createFuseInstance(entries: Entry[]) {
  return new Fuse(augment(entries), fuseOptions);
}

export function searchEntries(query: string, entries: Entry[]): Entry[] {
  if (!query.trim()) return entries;
  const fuse = createFuseInstance(entries);
  return fuse.search(query).map((result) => result.item);
}

export function searchByType(
  query: string,
  type: EntryType,
  entries: Entry[],
): Entry[] {
  const filtered = entries.filter((entry) => entry.type === type);
  if (!query.trim()) return filtered;
  const fuse = createFuseInstance(filtered);
  return fuse.search(query).map((result) => result.item);
}

export function matchesPinyin(query: string, text: string): boolean {
  if (!query || !text) return false;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return true;
  const py = toPinyin(text).toLowerCase();
  if (py.includes(q)) return true;
  const compact = toPinyinCompact(text).toLowerCase();
  return compact.includes(q);
}

import { createVocaDBAdapter, searchSongsByArtistName } from "./adapters/vocadbAdapter";

const vocadb = createVocaDBAdapter();

// ── Search result cache ──────────────────────────────
const CACHE_KEY = "vocaloid-search-cache";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry {
  ts: number;
  results: Entry[];
}

function loadCache(): Record<string, CacheEntry> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, CacheEntry>) {
  try {
    // Prune old entries
    const now = Date.now();
    for (const k of Object.keys(cache)) {
      if (now - cache[k].ts > CACHE_TTL) delete cache[k];
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* quota exceeded, ignore */ }
}

function cacheKey(query: string, type: string, start: number): string {
  return `${type}:${query.toLowerCase().trim()}:${start}`;
}

function getCached(query: string, type: string, start: number): Entry[] | null {
  const cache = loadCache();
  const entry = cache[cacheKey(query, type, start)];
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.results;
  return null;
}

function setCached(query: string, type: string, start: number, results: Entry[]) {
  const cache = loadCache();
  cache[cacheKey(query, type, start)] = { ts: Date.now(), results };
  saveCache(cache);
}

export async function searchOnline(
  query: string,
  type: EntryType,
  opts?: { start?: number; maxEntries?: number },
): Promise<Entry[]> {
  if (!query.trim()) return [];
  const start = opts?.start ?? 0;

  // Check cache first
  const cached = getCached(query, type, start);
  if (cached) return cached;

  try {
    let results: Entry[] = [];

    switch (type) {
      case "song":
        results = await vocadb.searchSongs(query, opts);
        // If few direct matches and first page, also search by artist name
        if (results.length < 3 && start === 0) {
          const byArtist = await searchSongsByArtistName(query);
          const seenIds = new Set(results.map((e) => e.id));
          for (const s of byArtist) {
            if (!seenIds.has(s.id)) {
              seenIds.add(s.id);
              results.push(s);
            }
          }
        }
        break;
      case "album":
        results = await vocadb.searchAlbums(query, opts);
        break;
      case "producer":
        results = await vocadb.searchProducers(query, opts);
        break;
      case "singer":
        results = await vocadb.searchSingers(query, opts);
        break;
      default:
        results = await vocadb.searchSongs(query, opts);
    }

    // Cache successful results
    if (results.length > 0) setCached(query, type, start, results);
    return results;
  } catch (err) {
    console.warn("VocaDB search failed:", err);
    return [];
  }
}
