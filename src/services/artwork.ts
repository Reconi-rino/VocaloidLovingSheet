import type {
  Entry,
  EntryType,
  ArtworkProvider,
  ArtworkKind,
  ArtworkCandidate,
  ResolvedArtwork,
} from "../types";

const ARTWORK_CACHE_KEY = "vocaloid-artwork-cache";

// ── Cache ──────────────────────────────────────────────

const cache = new Map<string, ArtworkCandidate>();

export function loadArtworkCache(): void {
  try {
    const raw = localStorage.getItem(ARTWORK_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, ArtworkCandidate>;
      for (const [k, v] of Object.entries(parsed)) cache.set(k, v);
    }
  } catch { /* ignore */ }
}

export function saveArtworkCache(): void {
  const obj: Record<string, ArtworkCandidate> = {};
  cache.forEach((v, k) => (obj[k] = v));
  localStorage.setItem(ARTWORK_CACHE_KEY, JSON.stringify(obj));
}

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
    dataUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
    title: `${entry.title} 占位图`,
    confidence: 0.1,
    corsSafe: true,
    exportSafe: true,
    createdAt: new Date().toISOString(),
  };
}

// ── Kind inference ─────────────────────────────────────

function inferKind(entry: Entry): ArtworkKind {
  switch (entry.type) {
    case "song": return "song-cover";
    case "album": return "album-cover";
    case "producer": return "producer-avatar";
    case "singer": return "singer-portrait";
    default: return "generic";
  }
}

// ── VocaDB artwork ─────────────────────────────────────

async function fetchVocaDBArtwork(entry: Entry): Promise<ArtworkCandidate[]> {
  const candidates: ArtworkCandidate[] = [];
  const kind = inferKind(entry);

  try {
    let searchUrl = "";
    if (entry.type === "song") {
      searchUrl = `https://vocadb.net/api/songs?query=${encodeURIComponent(entry.title)}&maxEntries=3&fields=MainPicture,PVs&sort=RatingScore&lang=Default`;
    } else if (entry.type === "album") {
      searchUrl = `https://vocadb.net/api/albums?query=${encodeURIComponent(entry.title)}&maxEntries=3&fields=MainPicture&sort=RatingScore`;
    } else if (entry.type === "producer" || entry.type === "singer") {
      searchUrl = `https://vocadb.net/api/artists?query=${encodeURIComponent(entry.title)}&maxEntries=3&fields=MainPicture&sort=RatingScore`;
    }

    if (!searchUrl) return candidates;

    const res = await fetch(searchUrl);
    if (!res.ok) return candidates;
    const data = await res.json();
    const items = data.items || [];

    for (const item of items) {
      if (item.mainPicture?.urlOriginal || item.mainPicture?.urlSmallThumb) {
        candidates.push({
          id: `vocadb-${entry.type}-${item.id}`,
          provider: "vocadb",
          kind,
          url: item.mainPicture.urlOriginal || item.mainPicture.urlSmallThumb,
          sourceUrl: `https://vocadb.net/${entry.type === "song" ? "S" : entry.type === "album" ? "Al" : "Ar"}/${item.id}`,
          title: item.defaultName || item.name,
          confidence: 0.9,
          corsSafe: false,
          exportSafe: false,
          createdAt: new Date().toISOString(),
        });
      }

      // Song PVs → YouTube/Niconico thumbnails
      if (entry.type === "song" && item.pvs) {
        for (const pv of item.pvs) {
          if (pv.service === "Youtube" && pv.url) {
            const videoId = extractYouTubeId(pv.url);
            if (videoId) {
              candidates.push({
                id: `youtube-${videoId}`,
                provider: "youtube",
                kind: "video-thumbnail",
                url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                sourceUrl: pv.url,
                title: `YouTube: ${pv.name || videoId}`,
                confidence: 0.7,
                corsSafe: false,
                exportSafe: false,
                createdAt: new Date().toISOString(),
              });
            }
          }
          if (pv.service === "NicoNicoDouga" && pv.url) {
            const nicoid = extractNiconicoId(pv.url);
            if (nicoid) {
              candidates.push({
                id: `niconico-${nicoid}`,
                provider: "niconico",
                kind: "video-thumbnail",
                sourceUrl: pv.url,
                title: `Niconico: ${pv.name || nicoid}`,
                confidence: 0.5,
                corsSafe: false,
                exportSafe: false,
                createdAt: new Date().toISOString(),
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("VocaDB artwork fetch failed:", err);
  }

  return candidates;
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m?.[1] ?? null;
}

function extractNiconicoId(url: string): string | null {
  const m = url.match(/nicovideo\.jp\/watch\/(sm\d+)/);
  return m?.[1] ?? null;
}

// ── Image validation ───────────────────────────────────

export async function validateImageUrl(
  url: string,
): Promise<{ ok: boolean; corsSafe: boolean; width?: number; height?: number; warning?: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = setTimeout(() => {
      img.src = "";
      resolve({ ok: false, corsSafe: false, warning: "加载超时" });
    }, 8000);

    img.onload = () => {
      clearTimeout(timer);
      resolve({
        ok: true,
        corsSafe: true,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      clearTimeout(timer);
      // Try without crossOrigin
      const img2 = new Image();
      img2.onload = () =>
        resolve({
          ok: true,
          corsSafe: false,
          width: img2.naturalWidth,
          height: img2.naturalHeight,
          warning: "CORS 受限，导出 PNG 时可能无法包含此图片",
        });
      img2.onerror = () =>
        resolve({ ok: false, corsSafe: false, warning: "图片加载失败" });
      img2.src = url;
    };

    img.src = url;
  });
}

// ── Try cache remote as dataUrl ────────────────────────

export async function tryCacheRemoteImage(
  candidate: ArtworkCandidate,
): Promise<ArtworkCandidate> {
  if (!candidate.url || candidate.dataUrl) return candidate;
  if (candidate.provider === "upload" || candidate.provider === "placeholder") return candidate;

  try {
    const res = await fetch(candidate.url, { mode: "cors" });
    if (!res.ok) return candidate;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    return {
      ...candidate,
      dataUrl,
      corsSafe: true,
      exportSafe: true,
    };
  } catch {
    return { ...candidate, corsSafe: false, exportSafe: false };
  }
}

// ── Ranking ────────────────────────────────────────────

const PROVIDER_RANK: Record<ArtworkProvider, number> = {
  upload: 100,
  "manual-url": 90,
  vocadb: 80,
  youtube: 70,
  niconico: 60,
  bilibili: 55,
  "album-fallback": 50,
  musicbrainz: 40,
  discogs: 30,
  spotify: 25,
  "official-site": 20,
  placeholder: 0,
};

export function rankArtworkCandidates(
  candidates: ArtworkCandidate[],
): ArtworkCandidate[] {
  return [...candidates].sort((a, b) => {
    const pa = PROVIDER_RANK[a.provider] ?? 0;
    const pb = PROVIDER_RANK[b.provider] ?? 0;
    if (pa !== pb) return pb - pa;
    return b.confidence - a.confidence;
  });
}

// ── Resolve ────────────────────────────────────────────

export async function resolveArtwork(
  entry: Entry,
): Promise<ResolvedArtwork> {
  const kind = inferKind(entry);
  const candidates: ArtworkCandidate[] = [];
  const warnings: string[] = [];

  // 1. Existing user upload or manual URL from entry
  if (entry.artwork?.selected) {
    candidates.push(entry.artwork.selected);
  }

  // 2. Existing coverUrl / avatarUrl / portraitUrl
  const existingUrl = entry.coverUrl || entry.avatarUrl || entry.portraitUrl;
  if (existingUrl) {
    candidates.push({
      id: `existing-${entry.id}`,
      provider: "manual-url",
      kind,
      url: existingUrl,
      confidence: 0.8,
      corsSafe: false,
      exportSafe: false,
      createdAt: new Date().toISOString(),
    });
  }

  // 3. VocaDB + PV thumbnails
  try {
    const vocadbCandidates = await fetchVocaDBArtwork(entry);
    candidates.push(...vocadbCandidates);
  } catch {
    warnings.push("VocaDB 素材获取失败");
  }

  // 4. Placeholder fallback
  const placeholder = createPlaceholderArtwork(entry, kind);

  // Rank
  const ranked = rankArtworkCandidates(candidates);

  // Select best
  const selected = ranked[0] || placeholder;

  return {
    selected,
    candidates: ranked,
    fallback: placeholder,
    warnings,
  };
}

// ── Public helpers ─────────────────────────────────────

export function getArtworkUrl(candidate?: ArtworkCandidate): string | undefined {
  if (!candidate) return undefined;
  return candidate.dataUrl || candidate.url;
}

export function getProviderLabel(provider: ArtworkProvider): string {
  const labels: Record<ArtworkProvider, string> = {
    upload: "用户上传",
    "manual-url": "手动 URL",
    vocadb: "VocaDB",
    youtube: "YouTube",
    niconico: "Niconico",
    bilibili: "Bilibili",
    "album-fallback": "专辑封面",
    musicbrainz: "MusicBrainz",
    discogs: "Discogs",
    spotify: "Spotify",
    "official-site": "官方站点",
    placeholder: "占位图",
  };
  return labels[provider] ?? provider;
}
