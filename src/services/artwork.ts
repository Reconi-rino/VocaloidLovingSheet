import type {
  Entry,
  EntryType,
  ArtworkKind,
  ArtworkCandidate,
  PreferenceCellData,
} from "../types";

// ── Placeholder ────────────────────────────────────────

const PLACEHOLDER_COLORS: Record<EntryType, string[]> = {
  song: ["#39c5bb", "#2da89f", "#1a8a82"],
  producer: ["#66ccff", "#4db8ec", "#3399dd"],
  singer: ["#ff6b9d", "#e6557f", "#cc4466"],
  album: ["#ffd700", "#e6c200", "#ccaa00"],
  custom: ["#a78bfa", "#8b6fe6", "#7054cc"],
};

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function createPlaceholderArtwork(
  entry: Entry,
  kind: ArtworkKind,
): ArtworkCandidate {
  const colors = PLACEHOLDER_COLORS[entry.type] || PLACEHOLDER_COLORS.custom;
  const colorIdx = hashStr(entry.id) % colors.length;
  const bg = colors[colorIdx];
  const char = entry.title?.charAt(0) || "?";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <rect width="200" height="200" fill="${bg}" rx="8"/>
    <text x="100" y="108" text-anchor="middle" font-size="72" font-weight="bold" fill="white" font-family="sans-serif">${char}</text>
    <text x="100" y="160" text-anchor="middle" font-size="14" fill="rgba(255,255,255,0.7)" font-family="sans-serif">${entry.type === "song" ? "♫" : entry.type === "singer" ? "♪" : entry.type === "producer" ? "P" : entry.type === "album" ? "◉" : "✦"}</text>
  </svg>`;

  return {
    id: `placeholder-${entry.id}-${kind}`,
    provider: "placeholder",
    kind,
    dataUrl: svgDataUrl(svg),
    title: `${entry.title} 占位图`,
    confidence: 0.1,
    corsSafe: true,
    exportSafe: true,
    createdAt: new Date().toISOString(),
  };
}

// ── Public helpers ─────────────────────────────────────

export function getArtworkUrl(candidate?: ArtworkCandidate): string | undefined {
  if (!candidate) return undefined;
  return candidate.dataUrl || candidate.url;
}

function firstUrl(...urls: Array<string | undefined>): string | undefined {
  return urls.find((url) => typeof url === "string" && url.trim().length > 0);
}

function pushUrl(urls: string[], url: string | undefined): void {
  const trimmed = url?.trim();
  if (!trimmed || urls.includes(trimmed)) return;
  urls.push(trimmed);
}

function pushArtwork(urls: string[], candidate: ArtworkCandidate | undefined): void {
  pushUrl(urls, getArtworkUrl(candidate));
}

function pushArtworkList(urls: string[], candidates: ArtworkCandidate[] | undefined): void {
  for (const candidate of candidates || []) {
    pushArtwork(urls, candidate);
  }
}

function firstText(...values: Array<string | number | undefined>): string | undefined {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return undefined;
}

function firstName(names: string[] | undefined): string | undefined {
  return names?.find((name) => name.trim().length > 0)?.trim();
}

export function buildLrcApiCoverUrl(entry: Entry): string | undefined {
  const params = new URLSearchParams();

  if (entry.type === "song") {
    const title = firstText(
      entry.originalTitle,
      entry.displayTitle,
      entry.japaneseTitle,
      entry.englishTitle,
      entry.chineseTitle,
      entry.title,
    );
    const artist = firstName(entry.producers) || firstName(entry.singers);
    if (!title || !artist) return undefined;

    params.set("title", title);
    params.set("artist", artist);
    if (entry.album) params.set("album", entry.album);
  } else if (entry.type === "album") {
    const album = firstText(entry.originalTitle, entry.displayTitle, entry.title);
    const artist = firstName(entry.producers) || firstName(entry.singers);
    if (!album) return undefined;

    params.set("album", album);
    if (artist) params.set("artist", artist);
  } else if (entry.type === "producer" || entry.type === "singer") {
    const artist = firstText(entry.originalTitle, entry.displayTitle, entry.title);
    if (!artist) return undefined;

    params.set("artist", artist);
  } else {
    return undefined;
  }

  return `https://api.lrc.cx/cover?${params.toString()}`;
}

function isDataOrBlobUrl(url: string): boolean {
  return url.startsWith("data:image/") || url.startsWith("blob:");
}

function isLrcApiUrl(url: string): boolean {
  return /^https:\/\/api\.lrc\.cx\/cover\?/i.test(url);
}

function isKnownExportFragileUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === "static.vocadb.net" ||
      hostname.endsWith(".ytimg.com") ||
      hostname === "img.youtube.com" ||
      hostname === "i.ytimg.com" ||
      hostname === "tn.smilevideo.jp";
  } catch {
    return false;
  }
}

export function getEntryImageUrls(entry?: Entry): string[] {
  if (!entry) return [];

  const urls: string[] = [];
  const lrcApiCoverUrl = buildLrcApiCoverUrl(entry);

  pushArtwork(urls, entry.artwork?.selected);

  switch (entry.type) {
    case "producer":
      pushUrl(urls, entry.avatarUrl);
      pushUrl(urls, lrcApiCoverUrl);
      pushArtworkList(urls, entry.artwork?.candidates);
      pushUrl(urls, entry.coverUrl);
      pushUrl(urls, entry.portraitUrl);
      break;
    case "singer":
      pushUrl(urls, entry.portraitUrl);
      pushUrl(urls, lrcApiCoverUrl);
      pushArtworkList(urls, entry.artwork?.candidates);
      pushUrl(urls, entry.avatarUrl);
      pushUrl(urls, entry.coverUrl);
      break;
    case "album":
    case "song":
      pushUrl(urls, entry.coverUrl);
      pushUrl(urls, lrcApiCoverUrl);
      pushArtworkList(urls, entry.artwork?.candidates);
      pushUrl(urls, entry.avatarUrl);
      pushUrl(urls, entry.portraitUrl);
      break;
    case "custom":
      pushUrl(urls, entry.coverUrl);
      pushUrl(urls, lrcApiCoverUrl);
      pushUrl(urls, entry.portraitUrl);
      pushUrl(urls, entry.avatarUrl);
      pushArtworkList(urls, entry.artwork?.candidates);
      break;
    default:
      pushUrl(urls, entry.coverUrl);
      pushUrl(urls, entry.avatarUrl);
      pushUrl(urls, entry.portraitUrl);
  }

  for (const url of entry.imageFallbackUrls || []) {
    pushUrl(urls, url);
  }

  return urls;
}

export function getEntryExportImageUrls(entry?: Entry): string[] {
  const urls = getEntryImageUrls(entry);
  const localUrls = urls.filter(isDataOrBlobUrl);
  const lrcApiUrls = urls.filter((url) => !isDataOrBlobUrl(url) && isLrcApiUrl(url));
  const stableRemoteUrls = urls.filter((url) =>
    !isDataOrBlobUrl(url) &&
    !isLrcApiUrl(url) &&
    !isKnownExportFragileUrl(url)
  );
  const fragileRemoteUrls = urls.filter((url) =>
    !isDataOrBlobUrl(url) &&
    !isLrcApiUrl(url) &&
    isKnownExportFragileUrl(url)
  );

  const ordered: string[] = [];
  for (const url of [...localUrls, ...lrcApiUrls, ...stableRemoteUrls, ...fragileRemoteUrls]) {
    pushUrl(ordered, url);
  }
  return ordered;
}

export function getEntryImageUrl(entry?: Entry): string | undefined {
  return firstUrl(...getEntryImageUrls(entry));
}

export function getCellImageUrls(
  cell: Pick<PreferenceCellData, "cellArtwork" | "entry">,
): string[] {
  const urls: string[] = [];
  pushArtwork(urls, cell.cellArtwork);
  for (const url of getEntryImageUrls(cell.entry)) {
    pushUrl(urls, url);
  }
  return urls;
}

export function getCellExportImageUrls(
  cell: Pick<PreferenceCellData, "cellArtwork" | "entry">,
): string[] {
  const urls: string[] = [];
  const cellArtworkUrl = getArtworkUrl(cell.cellArtwork);
  if (cellArtworkUrl && isDataOrBlobUrl(cellArtworkUrl)) {
    pushUrl(urls, cellArtworkUrl);
  }
  for (const url of getEntryExportImageUrls(cell.entry)) {
    pushUrl(urls, url);
  }
  if (cellArtworkUrl && !isDataOrBlobUrl(cellArtworkUrl)) {
    pushUrl(urls, cellArtworkUrl);
  }
  return urls;
}

export function getCellImageUrl(
  cell: Pick<PreferenceCellData, "cellArtwork" | "entry">,
): string | undefined {
  return firstUrl(...getCellImageUrls(cell));
}
