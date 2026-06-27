import type { ArtworkCandidate, Entry, SearchAdapter, SourceLink } from "../../types";

const VOCADB_BASE = "https://vocadb.net/api";
const SERVER_VOCADB_PATH = "/api/vocadb";
const PROXY_PREFIXES = [
  "https://api.allorigins.win/raw?url=",
];
const SERVER_API_TIMEOUT = 8000;
const PROXY_TIMEOUT = 20000;
const DIRECT_TIMEOUT = 6000;

let useProxy = false;
let serverApiDisabled = false;

export function setProxyEnabled(enabled: boolean) {
  useProxy = enabled;
}

export function getProxyEnabled(): boolean {
  return useProxy;
}

export async function proxiedFetch(url: string, init?: RequestInit): Promise<Response> {
  if (useProxy) {
    const encoded = encodeURIComponent(url);
    for (const prefix of PROXY_PREFIXES) {
      try {
        return await fetchWithTimeout(`${prefix}${encoded}`, PROXY_TIMEOUT);
      } catch { /* try next */ }
    }
    throw new Error("All proxies failed");
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
    // Try proxies
    const encoded = encodeURIComponent(url);
    for (const prefix of PROXY_PREFIXES) {
      try {
        const res = await fetchWithTimeout(`${prefix}${encoded}`, PROXY_TIMEOUT);
        useProxy = true;
        return res;
      } catch { /* try next */ }
    }
    throw new Error("All proxies failed");
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

function getPictureUrls(picture?: {
  urlOriginal?: string;
  urlSmallThumb?: string;
  urlThumb?: string;
}): {
  primary?: string;
  thumb?: string;
} {
  return {
    primary: picture?.urlOriginal || picture?.urlThumb || picture?.urlSmallThumb,
    thumb: picture?.urlSmallThumb || picture?.urlThumb || picture?.urlOriginal,
  };
}

function makeArtworkCandidate(
  id: string,
  provider: ArtworkCandidate["provider"],
  kind: ArtworkCandidate["kind"],
  url: string | undefined,
  sourceUrl: string,
  confidence: number,
  title?: string,
): ArtworkCandidate | undefined {
  if (!url) return undefined;
  return {
    id,
    provider,
    kind,
    url,
    sourceUrl,
    title,
    confidence,
    corsSafe: false,
    exportSafe: false,
    createdAt: new Date().toISOString(),
  };
}

function pushUnique<T>(items: T[], item: T | undefined): void {
  if (item === undefined || items.includes(item)) return;
  items.push(item);
}

function getYouTubeId(url: string): string | undefined {
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/watch\?[^#]*v=([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

function getBilibiliId(url: string): string | undefined {
  return url.match(/bilibili\.com\/video\/(BV[A-Za-z0-9]+)/i)?.[1];
}

function getNiconicoNumericId(url: string): string | undefined {
  return url.match(/nicovideo\.jp\/watch\/(?:sm|nm)(\d+)/i)?.[1] ||
    url.match(/nico\.ms\/(?:sm|nm)(\d+)/i)?.[1];
}

function buildPvSourceLinks(pvs: VocaDBSong["pvs"] | undefined): SourceLink[] {
  return (pvs || [])
    .filter((pv) => pv.url)
    .map((pv) => ({
      label: pv.service || pv.name || "PV",
      url: pv.url,
    }));
}

function buildPvArtworkCandidates(songId: number, pvs: VocaDBSong["pvs"] | undefined): ArtworkCandidate[] {
  const candidates: ArtworkCandidate[] = [];

  for (const pv of pvs || []) {
    const youtubeId = getYouTubeId(pv.url);
    if (youtubeId) {
      pushUnique(
        candidates,
        makeArtworkCandidate(
          `vocadb-song-${songId}-youtube-${youtubeId}-hq`,
          "youtube",
          "video-thumbnail",
          `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
          pv.url,
          0.72,
          pv.name || "YouTube 缩略图",
        ),
      );
      pushUnique(
        candidates,
        makeArtworkCandidate(
          `vocadb-song-${songId}-youtube-${youtubeId}-mq`,
          "youtube",
          "video-thumbnail",
          `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`,
          pv.url,
          0.58,
          pv.name || "YouTube 缩略图",
        ),
      );
    }

    const bilibiliId = getBilibiliId(pv.url);
    if (bilibiliId) {
      // Bilibili thumbnails require an API lookup, so keep the PV link as a
      // manual fallback source instead of guessing an unstable image URL.
      pushUnique(
        candidates,
        makeArtworkCandidate(
          `vocadb-song-${songId}-bilibili-${bilibiliId}`,
          "bilibili",
          "video-thumbnail",
          undefined,
          pv.url,
          0.4,
          pv.name || "Bilibili PV",
        ),
      );
    }

    const niconicoId = getNiconicoNumericId(pv.url);
    if (niconicoId) {
      pushUnique(
        candidates,
        makeArtworkCandidate(
          `vocadb-song-${songId}-niconico-${niconicoId}`,
          "niconico",
          "video-thumbnail",
          `https://tn.smilevideo.jp/smile?i=${niconicoId}`,
          pv.url,
          0.62,
          pv.name || "Niconico 缩略图",
        ),
      );
    }
  }

  return candidates;
}

function candidateUrls(candidates: ArtworkCandidate[]): string[] {
  const urls: string[] = [];
  for (const candidate of candidates) {
    pushUnique(urls, candidate.url);
  }
  return urls;
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

  const picture = getPictureUrls(s.mainPicture);
  const vocadbUrl = `https://vocadb.net/S/${s.id}`;
  const pvArtwork = buildPvArtworkCandidates(s.id, s.pvs);
  const vocadbArtwork = [
    makeArtworkCandidate(
      `vocadb-song-${s.id}-main-thumb`,
      "vocadb",
      "song-cover",
      picture.thumb,
      vocadbUrl,
      0.82,
      "VocaDB 缩略图",
    ),
    makeArtworkCandidate(
      `vocadb-song-${s.id}-main-original`,
      "vocadb",
      "song-cover",
      picture.primary,
      vocadbUrl,
      0.78,
      "VocaDB 原图",
    ),
  ].filter(Boolean) as ArtworkCandidate[];
  const artworkCandidates = [...vocadbArtwork, ...pvArtwork];

  return {
    id: `vocadb-song-${s.id}`,
    type: "song",
    title: s.defaultName || s.name,
    displayTitle: s.name,
    aliases: s.aliases || [],
    producers,
    singers,
    year: s.publishDate?.slice(0, 4),
    coverUrl: picture.thumb || picture.primary,
    imageFallbackUrls: candidateUrls(artworkCandidates),
    artwork: {
      candidates: artworkCandidates,
    },
    sourceLinks: [
      { label: "VocaDB", url: vocadbUrl },
      ...buildPvSourceLinks(s.pvs),
    ],
    tags: [s.songType, ...(s.tags || []).map((t) => t.name)],
    createdAt: s.createDate || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function artistToEntry(a: VocaDBArtist): Entry {
  const isSinger = ["Vocaloid", "CeVIO", "SynthesizerV", "UTAU", "NEUTRINO", "VOICEVOX"].includes(a.artistType);
  const picture = getPictureUrls(a.mainPicture);
  const vocadbUrl = `https://vocadb.net/Ar/${a.id}`;
  const artworkCandidates = [
    makeArtworkCandidate(
      `vocadb-artist-${a.id}-main-thumb`,
      "vocadb",
      isSinger ? "singer-portrait" : "producer-avatar",
      picture.thumb,
      vocadbUrl,
      0.82,
      "VocaDB 缩略图",
    ),
    makeArtworkCandidate(
      `vocadb-artist-${a.id}-main-original`,
      "vocadb",
      isSinger ? "singer-portrait" : "producer-avatar",
      picture.primary,
      vocadbUrl,
      0.78,
      "VocaDB 原图",
    ),
  ].filter(Boolean) as ArtworkCandidate[];

  return {
    id: `vocadb-artist-${a.id}`,
    type: isSinger ? "singer" : "producer",
    title: a.defaultName || a.name,
    displayTitle: a.name,
    aliases: a.aliases || [],
    producers: [],
    singers: [],
    avatarUrl: isSinger ? picture.thumb : picture.primary,
    portraitUrl: isSinger ? picture.primary : undefined,
    imageFallbackUrls: candidateUrls(artworkCandidates),
    artwork: {
      candidates: artworkCandidates,
    },
    sourceLinks: [
      { label: "VocaDB", url: vocadbUrl },
    ],
    tags: [a.artistType],
    createdAt: a.createDate || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function albumToEntry(a: VocaDBAlbum): Entry {
  const picture = getPictureUrls(a.mainPicture);
  const vocadbUrl = `https://vocadb.net/Al/${a.id}`;
  const artworkCandidates = [
    makeArtworkCandidate(
      `vocadb-album-${a.id}-main-thumb`,
      "vocadb",
      "album-cover",
      picture.thumb,
      vocadbUrl,
      0.82,
      "VocaDB 缩略图",
    ),
    makeArtworkCandidate(
      `vocadb-album-${a.id}-main-original`,
      "vocadb",
      "album-cover",
      picture.primary,
      vocadbUrl,
      0.78,
      "VocaDB 原图",
    ),
  ].filter(Boolean) as ArtworkCandidate[];

  return {
    id: `vocadb-album-${a.id}`,
    type: "album",
    title: a.defaultName || a.name,
    displayTitle: a.name,
    aliases: [],
    producers: a.artistString ? a.artistString.split(/,\s*/) : [],
    singers: [],
    year: a.releaseDate?.year,
    coverUrl: picture.thumb || picture.primary,
    imageFallbackUrls: candidateUrls(artworkCandidates),
    artwork: {
      candidates: artworkCandidates,
    },
    sourceLinks: [
      { label: "VocaDB", url: vocadbUrl },
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

function shouldUseServerApi(): boolean {
  return typeof window !== "undefined" && !serverApiDisabled;
}

async function tryFetch<T>(url: string, timeout: number): Promise<T> {
  const res = await fetchWithTimeout(url, timeout);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchViaProxies<T>(url: string): Promise<T> {
  const encoded = encodeURIComponent(url);
  let lastErr: unknown;
  for (const prefix of PROXY_PREFIXES) {
    try {
      return await tryFetch<T>(`${prefix}${encoded}`, PROXY_TIMEOUT);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function fetchJSON<T>(url: string): Promise<T> {
  if (useProxy) {
    return fetchViaProxies<T>(url);
  }

  try {
    return await tryFetch<T>(url, DIRECT_TIMEOUT);
  } catch {
    // Direct failed — try proxies
    const result = await fetchViaProxies<T>(url);
    useProxy = true;
    return result;
  }
}

interface SearchOpts {
  start?: number;
  maxEntries?: number;
}

async function fetchVocaDbResource<T>(
  resource: "songs" | "artists" | "albums",
  params: Record<string, string | number | undefined>,
  directUrl: string,
): Promise<T> {
  if (shouldUseServerApi()) {
    try {
      const serverParams = new URLSearchParams({ resource });
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") serverParams.set(key, String(value));
      }
      return await tryFetch<T>(`${SERVER_VOCADB_PATH}?${serverParams.toString()}`, SERVER_API_TIMEOUT);
    } catch {
      serverApiDisabled = true;
    }
  }

  return fetchJSON<T>(directUrl);
}

async function searchSongs(query: string, opts: SearchOpts = {}): Promise<Entry[]> {
  const { start = 0, maxEntries = 10 } = opts;
  const params = {
    query,
    start,
    maxEntries,
    fields: "MainPicture,PVs,Tags",
    sort: "RatingScore",
    lang: "Default",
  };
  const directUrl = `${VOCADB_BASE}/songs?${new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  ).toString()}`;
  const data = await fetchVocaDbResource<{ items: VocaDBSong[] }>("songs", params, directUrl);
  return (data.items || []).map(songToEntry);
}

async function searchProducers(query: string, opts: SearchOpts = {}): Promise<Entry[]> {
  const { start = 0, maxEntries = 10 } = opts;
  const params = {
    query,
    start,
    maxEntries,
    fields: "MainPicture",
    artistTypes: "Producer",
  };
  const directUrl = `${VOCADB_BASE}/artists?${new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  ).toString()}`;
  const data = await fetchVocaDbResource<{ items: VocaDBArtist[] }>("artists", params, directUrl);
  return (data.items || []).map(artistToEntry).filter((e) => e.type === "producer");
}

async function searchSingers(query: string, opts: SearchOpts = {}): Promise<Entry[]> {
  const { start = 0, maxEntries = 10 } = opts;
  const params = {
    query,
    start,
    maxEntries,
    fields: "MainPicture",
    artistTypes: "Vocaloid,CeVIO,SynthesizerV,UTAU,NEUTRINO,VOICEVOX",
  };
  const directUrl = `${VOCADB_BASE}/artists?${new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  ).toString()}`;
  const data = await fetchVocaDbResource<{ items: VocaDBArtist[] }>("artists", params, directUrl);
  return (data.items || []).map(artistToEntry);
}

async function searchAlbums(query: string, opts: SearchOpts = {}): Promise<Entry[]> {
  const { start = 0, maxEntries = 10 } = opts;
  const params = {
    query,
    start,
    maxEntries,
    fields: "MainPicture",
  };
  const directUrl = `${VOCADB_BASE}/albums?${new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  ).toString()}`;
  const data = await fetchVocaDbResource<{ items: VocaDBAlbum[] }>("albums", params, directUrl);
  return (data.items || []).map(albumToEntry);
}

// Search songs by artist name: find artist first, then their songs
export async function searchSongsByArtistName(query: string): Promise<Entry[]> {
  // Step 1: Find matching artists
  const artistParams = {
    query,
    maxEntries: 5,
    nameMatchMode: "Partial",
  };
  const artistDirectUrl = `${VOCADB_BASE}/artists?${new URLSearchParams(
    Object.entries(artistParams).map(([key, value]) => [key, String(value)]),
  ).toString()}`;
  const artistData = await fetchVocaDbResource<{ items: VocaDBArtist[] }>("artists", artistParams, artistDirectUrl);
  const artists = artistData.items || [];
  if (artists.length === 0) return [];

  // Step 2: Fetch songs for each matched artist
  const allSongs: Entry[] = [];
  const seenIds = new Set<string>();

  for (const artist of artists.slice(0, 3)) {
    try {
      const songParams = {
        "artistId[]": artist.id,
        maxEntries: 10,
        fields: "MainPicture,PVs,Tags",
        sort: "RatingScore",
        lang: "Default",
      };
      const songDirectUrl = `${VOCADB_BASE}/songs?${new URLSearchParams(
        Object.entries(songParams).map(([key, value]) => [key, String(value)]),
      ).toString()}`;
      const songData = await fetchVocaDbResource<{ items: VocaDBSong[] }>("songs", songParams, songDirectUrl);
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
