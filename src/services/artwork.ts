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

export function getEntryImageUrl(entry?: Entry): string | undefined {
  if (!entry) return undefined;

  const artworkUrl = getArtworkUrl(entry.artwork?.selected);
  if (artworkUrl) return artworkUrl;

  switch (entry.type) {
    case "producer":
      return firstUrl(entry.avatarUrl, entry.coverUrl, entry.portraitUrl);
    case "singer":
      return firstUrl(entry.portraitUrl, entry.avatarUrl, entry.coverUrl);
    case "album":
    case "song":
      return firstUrl(entry.coverUrl, entry.avatarUrl, entry.portraitUrl);
    case "custom":
      return firstUrl(entry.coverUrl, entry.portraitUrl, entry.avatarUrl);
    default:
      return firstUrl(entry.coverUrl, entry.avatarUrl, entry.portraitUrl);
  }
}

export function getCellImageUrl(
  cell: Pick<PreferenceCellData, "cellArtwork" | "entry">,
): string | undefined {
  const cellArtworkUrl = getArtworkUrl(cell.cellArtwork);
  if (cellArtworkUrl) return cellArtworkUrl;
  return getEntryImageUrl(cell.entry);
}
