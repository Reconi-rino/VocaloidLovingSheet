import type { Entry, SearchAdapter } from "../../types";

const VOCADB_BASE = "https://vocadb.net/api";
const PROXY_PREFIX = "https://api.allorigins.win/raw?url=";
const PROXY_TIMEOUT = 8000;
const DIRECT_TIMEOUT = 3000;

let useProxy = false;

export function setProxyEnabled(enabled: boolean) {
  useProxy = enabled;
}

export function getProxyEnabled(): boolean {
  return useProxy;
}

export async function proxiedFetch(url: string, init?: RequestInit): Promise<Response> {
  if (useProxy) {
    return fetch(`${PROXY_PREFIX}${encodeURIComponent(url)}`, init);
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), DIRECT_TIMEOUT);
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(timer);
      return res;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    const res = await fetch(`${PROXY_PREFIX}${encodeURIComponent(url)}`, init);
    useProxy = true;
    return res;
  }
}

interface VocaDBSong {
  id: number;
  name: string;
  defaultName: string;
  defaultNameLanguage: string;
  songType: string;
  aliases?: string[];
  artistString?: string;
  mainPicture?: {
    urlOriginal?: string;
    urlSmallThumb?: string;
    urlThumb?: string;
  };
  publishDate?: string;
  tags?: { name: string }[];
  pvs?: { service: string; url: string; name?: string }[];
  createDate?: string;
}

interface VocaDBArtist {
  id: number;
  name: string;
  defaultName: string;
  artistType: string;
  aliases?: string[];
  mainPicture?: {
    urlOriginal?: string;
    urlSmallThumb?: string;
    urlThumb?: string;
  };
  createDate?: string;
}

interface VocaDBAlbum {
  id: number;
  name: string;
  defaultName: string;
  albumType: string;
  artistString?: string;
  mainPicture?: {
    urlOriginal?: string;
    urlSmallThumb?: string;
    urlThumb?: string;
  };
  releaseDate?: { year?: number };
  createDate?: string;
}

function songToEntry(s: VocaDBSong): Entry {
  const singers: string[] = [];
  const producers: string[] = [];
  if (s.artistString) {
    const parts = s.artistString.split(/\s+feat\.?\s+/i);
    if (parts.length > 1) {
      producers.push(...parts[0].split(/,\s*/));
      singers.push(...parts[1].split(/,\s*/));
    } else {
      producers.push(...s.artistString.split(/,\s*/));
    }
  }

  return {
    id: `vocadb-song-${s.id}`,
    type: "song",
    title: s.defaultName || s.name,
    displayTitle: s.name,
    aliases: s.aliases || [],
    producers,
    singers,
    year: s.publishDate?.slice(0, 4),
    coverUrl: s.mainPicture?.urlOriginal || s.mainPicture?.urlSmallThumb,
    sourceLinks: [
      { label: "VocaDB", url: `https://vocadb.net/S/${s.id}` },
    ],
    tags: [s.songType, ...(s.tags || []).map((t) => t.name)],
    createdAt: s.createDate || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function artistToEntry(a: VocaDBArtist): Entry {
  const isSinger = ["Vocaloid", "CeVIO", "SynthesizerV", "UTAU", "NEUTRINO", "VOICEVOX"].includes(a.artistType);
  return {
    id: `vocadb-artist-${a.id}`,
    type: isSinger ? "singer" : "producer",
    title: a.defaultName || a.name,
    displayTitle: a.name,
    aliases: a.aliases || [],
    producers: [],
    singers: [],
    avatarUrl: a.mainPicture?.urlOriginal || a.mainPicture?.urlSmallThumb,
    sourceLinks: [
      { label: "VocaDB", url: `https://vocadb.net/Ar/${a.id}` },
    ],
    tags: [a.artistType],
    createdAt: a.createDate || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function albumToEntry(a: VocaDBAlbum): Entry {
  return {
    id: `vocadb-album-${a.id}`,
    type: "album",
    title: a.defaultName || a.name,
    displayTitle: a.name,
    aliases: [],
    producers: a.artistString ? a.artistString.split(/,\s*/) : [],
    singers: [],
    year: a.releaseDate?.year,
    coverUrl: a.mainPicture?.urlOriginal || a.mainPicture?.urlSmallThumb,
    sourceLinks: [
      { label: "VocaDB", url: `https://vocadb.net/Al/${a.id}` },
    ],
    tags: [a.albumType],
    createdAt: a.createDate || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJSON<T>(url: string): Promise<T> {
  if (useProxy) {
    const res = await fetchWithTimeout(`${PROXY_PREFIX}${encodeURIComponent(url)}`, PROXY_TIMEOUT);
    if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
    return res.json();
  }

  try {
    const res = await fetchWithTimeout(url, DIRECT_TIMEOUT);
    if (!res.ok) throw new Error(`VocaDB API error: ${res.status}`);
    return res.json();
  } catch {
    // Direct failed — auto-switch to proxy
    const res = await fetchWithTimeout(`${PROXY_PREFIX}${encodeURIComponent(url)}`, PROXY_TIMEOUT);
    if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
    useProxy = true;
    return res.json();
  }
}

async function searchSongs(query: string): Promise<Entry[]> {
  // VocaDB API: use maxEntries, sort=RatingScore so originals rank first
  const data = await fetchJSON<{ items: VocaDBSong[] }>(
    `${VOCADB_BASE}/songs?query=${encodeURIComponent(query)}&maxEntries=10&fields=MainPicture,PVs,Tags&sort=RatingScore&lang=Default`
  );
  return (data.items || []).map(songToEntry);
}

async function searchProducers(query: string): Promise<Entry[]> {
  const data = await fetchJSON<{ items: VocaDBArtist[] }>(
    `${VOCADB_BASE}/artists?query=${encodeURIComponent(query)}&maxEntries=10&fields=MainPicture&artistTypes=Producer`
  );
  return (data.items || []).map(artistToEntry).filter((e) => e.type === "producer");
}

async function searchSingers(query: string): Promise<Entry[]> {
  const data = await fetchJSON<{ items: VocaDBArtist[] }>(
    `${VOCADB_BASE}/artists?query=${encodeURIComponent(query)}&maxEntries=10&fields=MainPicture&artistTypes=Vocaloid,CeVIO,SynthesizerV,UTAU,NEUTRINO,VOICEVOX`
  );
  return (data.items || []).map(artistToEntry);
}

async function searchAlbums(query: string): Promise<Entry[]> {
  const data = await fetchJSON<{ items: VocaDBAlbum[] }>(
    `${VOCADB_BASE}/albums?query=${encodeURIComponent(query)}&maxEntries=10&fields=MainPicture`
  );
  return (data.items || []).map(albumToEntry);
}

// Search songs by artist name: find artist first, then their songs
export async function searchSongsByArtistName(query: string): Promise<Entry[]> {
  // Step 1: Find matching artists
  const artistData = await fetchJSON<{ items: VocaDBArtist[] }>(
    `${VOCADB_BASE}/artists?query=${encodeURIComponent(query)}&maxEntries=5&nameMatchMode=Partial`
  );
  const artists = artistData.items || [];
  if (artists.length === 0) return [];

  // Step 2: Fetch songs for each matched artist
  const allSongs: Entry[] = [];
  const seenIds = new Set<string>();

  for (const artist of artists.slice(0, 3)) {
    try {
      const songData = await fetchJSON<{ items: VocaDBSong[] }>(
        `${VOCADB_BASE}/songs?artistId%5B%5D=${artist.id}&maxEntries=10&fields=MainPicture,PVs,Tags&sort=RatingScore&lang=Default`
      );
      for (const song of songData.items || []) {
        const entry = songToEntry(song);
        if (!seenIds.has(entry.id)) {
          seenIds.add(entry.id);
          allSongs.push(entry);
        }
      }
    } catch { /* skip failed artist */ }
  }

  return allSongs;
}

export function createVocaDBAdapter(): SearchAdapter {
  return {
    name: "VocaDB",
    enabled: true,
    searchSongs,
    searchProducers,
    searchSingers,
    searchAlbums,
  };
}
