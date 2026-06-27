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

export async function searchOnline(
  query: string,
  type: EntryType,
): Promise<Entry[]> {
  if (!query.trim()) return [];
  try {
    let results: Entry[] = [];

    switch (type) {
      case "song":
        results = await vocadb.searchSongs(query);
        // If few direct matches, also search by artist name
        if (results.length < 3) {
          const byArtist = await searchSongsByArtistName(query);
          const seenIds = new Set(results.map((e) => e.id));
          for (const s of byArtist) {
            if (!seenIds.has(s.id)) {
              seenIds.add(s.id);
              results.push(s);
            }
          }
        }
        return results;
      case "album":
        return await vocadb.searchAlbums(query);
      case "producer":
        return await vocadb.searchProducers(query);
      case "singer":
        return await vocadb.searchSingers(query);
      default:
        return await vocadb.searchSongs(query);
    }
  } catch (err) {
    console.warn("VocaDB search failed:", err);
    return [];
  }
}
