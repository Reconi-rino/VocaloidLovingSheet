import type { PreferenceCellData, Entry } from "../types";

const KEYS = {
  SHEET: "vocaloid-sheet",
  CUSTOM_ENTRIES: "vocaloid-custom-entries",
  THEME: "vocaloid-theme",
  MODE: "vocaloid-mode",
  PROXY: "vocaloid-proxy",
  TITLE: "vocaloid-title",
  AUTHOR: "vocaloid-author",
} as const;

export function saveSheet(
  data: Record<string, PreferenceCellData>,
): void {
  localStorage.setItem(KEYS.SHEET, JSON.stringify(data));
}

export function loadSheet(): Record<string, PreferenceCellData> | null {
  const raw = localStorage.getItem(KEYS.SHEET);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, PreferenceCellData>;
  } catch {
    return null;
  }
}

export function saveCustomEntries(entries: Entry[]): void {
  localStorage.setItem(KEYS.CUSTOM_ENTRIES, JSON.stringify(entries));
}

export function loadCustomEntries(): Entry[] {
  const raw = localStorage.getItem(KEYS.CUSTOM_ENTRIES);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Entry[];
  } catch {
    return [];
  }
}

export function saveTheme(theme: string): void {
  localStorage.setItem(KEYS.THEME, theme);
}

export function loadTheme(): string | null {
  return localStorage.getItem(KEYS.THEME);
}

export function saveMode(mode: string): void {
  localStorage.setItem(KEYS.MODE, mode);
}

export function loadMode(): string | null {
  return localStorage.getItem(KEYS.MODE);
}

export function saveProxy(enabled: boolean): void {
  localStorage.setItem(KEYS.PROXY, enabled ? "1" : "0");
}

export function loadProxy(): boolean {
  return localStorage.getItem(KEYS.PROXY) === "1";
}

export function saveTitle(title: string): void {
  localStorage.setItem(KEYS.TITLE, title);
}

export function loadTitle(): string | null {
  return localStorage.getItem(KEYS.TITLE);
}

export function saveAuthor(author: string): void {
  localStorage.setItem(KEYS.AUTHOR, author);
}

export function loadAuthor(): string | null {
  return localStorage.getItem(KEYS.AUTHOR);
}

export function clearAll(): void {
  localStorage.removeItem(KEYS.SHEET);
  localStorage.removeItem(KEYS.CUSTOM_ENTRIES);
  localStorage.removeItem(KEYS.THEME);
  localStorage.removeItem(KEYS.MODE);
  localStorage.removeItem(KEYS.PROXY);
  localStorage.removeItem(KEYS.TITLE);
  localStorage.removeItem(KEYS.AUTHOR);
}
