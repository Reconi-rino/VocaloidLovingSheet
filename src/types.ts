export type EntryType = "song" | "producer" | "singer" | "album" | "custom";

export type ArtworkSourceMode = "auto" | "lrcapi-first";

export type ArtworkProvider =
  | "upload"
  | "manual-url"
  | "vocadb"
  | "youtube"
  | "niconico"
  | "bilibili"
  | "album-fallback"
  | "musicbrainz"
  | "discogs"
  | "spotify"
  | "lrcapi"
  | "official-site"
  | "placeholder";

export type ArtworkKind =
  | "song-cover"
  | "album-cover"
  | "video-thumbnail"
  | "producer-avatar"
  | "singer-portrait"
  | "generic";

export interface ArtworkCandidate {
  id: string;
  provider: ArtworkProvider;
  kind: ArtworkKind;
  url?: string;
  dataUrl?: string;
  sourceUrl?: string;
  title?: string;
  attribution?: string;
  licenseNote?: string;
  confidence: number;
  corsSafe?: boolean;
  exportSafe?: boolean;
  width?: number;
  height?: number;
  createdAt: string;
}

export interface ResolvedArtwork {
  selected?: ArtworkCandidate;
  candidates: ArtworkCandidate[];
  fallback: ArtworkCandidate;
  warnings: string[];
}

export interface EntryArtwork {
  selected?: ArtworkCandidate;
  candidates?: ArtworkCandidate[];
  imageFit?: "cover" | "contain" | "none";
}

export interface SourceLink {
  label: string;
  url: string;
}

export interface Entry {
  id: string;
  type: EntryType;
  title: string;
  originalTitle?: string;
  displayTitle?: string;
  chineseTitle?: string;
  japaneseTitle?: string;
  englishTitle?: string;
  aliases: string[];
  producers: string[];
  singers: string[];
  album?: string;
  year?: number | string;
  description?: string;
  coverUrl?: string;
  avatarUrl?: string;
  portraitUrl?: string;
  imageFallbackUrls?: string[];
  artwork?: EntryArtwork;
  sourceLinks: SourceLink[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PreferenceCellData {
  categoryId: string;
  categoryLabel: string;
  entry?: Entry;
  note?: string;
  imageFit?: "cover" | "contain" | "none";
  cellArtwork?: ArtworkCandidate;
}

export interface SearchAdapter {
  name: string;
  enabled: boolean;
  searchSongs(query: string, opts?: { start?: number; maxEntries?: number }): Promise<Entry[]>;
  searchProducers(query: string, opts?: { start?: number; maxEntries?: number }): Promise<Entry[]>;
  searchSingers(query: string, opts?: { start?: number; maxEntries?: number }): Promise<Entry[]>;
  searchAlbums(query: string, opts?: { start?: number; maxEntries?: number }): Promise<Entry[]>;
}
