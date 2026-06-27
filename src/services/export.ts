import type { ArtworkSourceMode, Entry, PreferenceCellData } from "../types";
import { getCellExportImageUrls } from "./artwork";

type ExportTheme = "miku" | "tianyi" | "kagamine" | "luka" | "kaito" | "meiko" | string;
type ExportMode = "dark" | "light" | string;

interface CanvasExportOptions {
  title: string;
  author?: string;
  cells: Record<string, PreferenceCellData>;
  theme?: ExportTheme;
  mode?: ExportMode;
  artworkSourceMode?: ArtworkSourceMode;
}

interface Palette {
  pageBg: string;
  pageText: string;
  cellBg: string;
  cellBorder: string;
  labelBg: string;
  labelText: string;
  accent: string;
  mutedText: string;
  placeholderA: string;
  placeholderB: string;
}

const THEME_ACCENTS: Record<string, string> = {
  miku: "#39c5bb",
  tianyi: "#66ccff",
  kagamine: "#c9a638",
  luka: "#ff6b9d",
  kaito: "#4169e1",
  meiko: "#e63946",
};

const DARK_SURFACES: Record<string, string> = {
  miku: "#0f3d39",
  tianyi: "#112d4a",
  kagamine: "#2b2614",
  luka: "#3d1526",
  kaito: "#14204a",
  meiko: "#3d1015",
};

const DARK_BACKGROUNDS: Record<string, string> = {
  miku: "#0a2e2b",
  tianyi: "#0b1e33",
  kagamine: "#1e1b0e",
  luka: "#2a0f1a",
  kaito: "#0d1533",
  meiko: "#2a0a0d",
};

const EXPORT_WIDTH = 1600;
const MARGIN_X = 78;
const TOP_PAD = 58;
const HEADER_HEIGHT = 132;
const GRID_GAP_X = 16;
const GRID_GAP_Y = 34;
const CELL_WIDTH = (EXPORT_WIDTH - MARGIN_X * 2 - GRID_GAP_X * 4) / 5;
const IMAGE_SIZE = CELL_WIDTH;
const LABEL_HEIGHT = 34;
const TITLE_HEIGHT = 42;
const CELL_HEIGHT = IMAGE_SIZE + LABEL_HEIGHT + TITLE_HEIGHT;
const EXPORT_HEIGHT = TOP_PAD + HEADER_HEIGHT + CELL_HEIGHT * 6 + GRID_GAP_Y * 5 + 66;
const IMAGE_TIMEOUT_MS = 4500;

function getPalette(theme = "miku", mode = "dark"): Palette {
  const accent = THEME_ACCENTS[theme] ?? THEME_ACCENTS.miku;
  if (mode === "light") {
    return {
      pageBg: "#f8f9fa",
      pageText: "#1a1a2e",
      cellBg: "#ffffff",
      cellBorder: accent,
      labelBg: accent,
      labelText: "#ffffff",
      accent,
      mutedText: "#5f6472",
      placeholderA: "#f1f5f9",
      placeholderB: "#dbe4ee",
    };
  }

  return {
    pageBg: DARK_BACKGROUNDS[theme] ?? DARK_BACKGROUNDS.miku,
    pageText: theme === "kagamine" ? "#f5f0e0" : "#ffffff",
    cellBg: DARK_SURFACES[theme] ?? DARK_SURFACES.miku,
    cellBorder: accent,
    labelBg: accent,
    labelText: theme === "kagamine" ? "#1a1500" : "#ffffff",
    accent,
    mutedText: "rgba(255,255,255,0.68)",
    placeholderA: DARK_SURFACES[theme] ?? DARK_SURFACES.miku,
    placeholderB: DARK_BACKGROUNDS[theme] ?? DARK_BACKGROUNDS.miku,
  };
}

function getSubtitle(entry: Entry): string {
  const parts: string[] = [];
  if (entry.producers.length > 0) parts.push(entry.producers.join(", "));
  if (entry.singers.length > 0) parts.push(entry.singers.join(", "));
  if (entry.album) parts.push(entry.album);
  if (entry.year) parts.push(String(entry.year));
  return parts.join(" / ");
}

function getTypeMark(entry?: Entry): string {
  if (!entry) return "♪";
  if (entry.type === "producer") return "P";
  if (entry.type === "singer") return "♪";
  if (entry.type === "album") return "◉";
  if (entry.type === "custom") return "✦";
  return "♫";
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function withAlpha(hex: string, alphaHex: string): string {
  return `${hex}${alphaHex}`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string | CanvasGradient | CanvasPattern,
): void {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function strokeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  stroke: string,
  lineWidth = 2,
): void {
  roundRect(ctx, x, y, w, h, r);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function loadImageElement(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = window.setTimeout(() => resolve(null), IMAGE_TIMEOUT_MS);
    const done = (result: HTMLImageElement | null) => {
      window.clearTimeout(timer);
      resolve(result);
    };

    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = src;
  });
}

function canReadImage(img: HTMLImageElement): boolean {
  if (!img.naturalWidth || !img.naturalHeight) return false;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  try {
    ctx.drawImage(img, 0, 0, 1, 1);
    ctx.getImageData(0, 0, 1, 1);
    return true;
  } catch {
    return false;
  }
}

async function loadDrawableImage(src: string | undefined): Promise<HTMLImageElement | null> {
  if (!src) return null;
  const img = await loadImageElement(src);
  if (!img) return null;
  return canReadImage(img) ? img : null;
}

async function loadFirstDrawableImage(urls: string[]): Promise<HTMLImageElement | null> {
  for (const url of urls) {
    const image = await loadDrawableImage(url);
    if (image) return image;
  }
  return null;
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  size: number,
  objectPosition: "center" | "top" = "center",
): void {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(size / iw, size / ih);
  const sw = size / scale;
  const sh = size / scale;
  const sx = (iw - sw) / 2;
  const sy = objectPosition === "top" ? 0 : (ih - sh) / 2;

  ctx.save();
  roundRect(ctx, x, y, size, size, 10);
  ctx.clip();
  ctx.drawImage(img, sx, sy, sw, sh, x, y, size, size);
  ctx.restore();
}

function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  cell: PreferenceCellData,
  palette: Palette,
): void {
  const entry = cell.entry;
  const seed = hashStr(entry?.id || cell.categoryId);
  const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
  gradient.addColorStop(0, seed % 2 === 0 ? palette.placeholderA : withAlpha(palette.accent, "cc"));
  gradient.addColorStop(1, seed % 2 === 0 ? withAlpha(palette.accent, "aa") : palette.placeholderB);

  fillRoundRect(ctx, x, y, size, size, 10, gradient);

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.arc(x + size * 0.82, y + size * 0.18, size * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + size * 0.18, y + size * 0.84, size * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 84px sans-serif";
  ctx.fillText(getTypeMark(entry), x + size / 2, y + size / 2 - 8);

  const label = entry?.title?.charAt(0) || cell.categoryLabel.charAt(0);
  ctx.font = "700 34px sans-serif";
  ctx.globalAlpha = 0.78;
  ctx.fillText(label, x + size / 2, y + size / 2 + 60);
  ctx.restore();
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxChars = 80,
): string {
  if (text.length > maxChars) text = `${text.slice(0, maxChars)}…`;
  if (ctx.measureText(text).width <= maxWidth) return text;

  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = `${text.slice(0, mid)}…`;
    if (ctx.measureText(candidate).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return `${text.slice(0, Math.max(0, lo))}…`;
}

function drawCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: string,
  color: string,
): void {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(fitText(ctx, text, maxWidth), x, y);
  ctx.restore();
}

function drawCellFrame(
  ctx: CanvasRenderingContext2D,
  cell: PreferenceCellData,
  x: number,
  y: number,
  palette: Palette,
): void {
  fillRoundRect(ctx, x, y, CELL_WIDTH, CELL_HEIGHT, 12, palette.cellBg);
  strokeRoundRect(ctx, x, y, CELL_WIDTH, CELL_HEIGHT, 12, palette.cellBorder, 2);

  const labelY = y + IMAGE_SIZE;
  ctx.fillStyle = palette.labelBg;
  ctx.fillRect(x + 1, labelY, CELL_WIDTH - 2, LABEL_HEIGHT);
  drawCenteredText(
    ctx,
    cell.categoryLabel,
    x + CELL_WIDTH / 2,
    labelY + LABEL_HEIGHT / 2 + 1,
    CELL_WIDTH - 14,
    "700 24px sans-serif",
    palette.labelText,
  );
}

async function drawCell(
  ctx: CanvasRenderingContext2D,
  cell: PreferenceCellData,
  x: number,
  y: number,
  palette: Palette,
  artworkSourceMode: ArtworkSourceMode,
): Promise<void> {
  drawCellFrame(ctx, cell, x, y, palette);

  const imageX = x;
  const imageY = y;
  const image = await loadFirstDrawableImage(getCellExportImageUrls(cell, artworkSourceMode));
  if (image) {
    drawImageCover(
      ctx,
      image,
      imageX,
      imageY,
      IMAGE_SIZE,
      cell.entry?.type === "singer" ? "top" : "center",
    );
  } else {
    drawPlaceholder(ctx, imageX, imageY, IMAGE_SIZE, cell, palette);
  }

  strokeRoundRect(ctx, imageX, imageY, IMAGE_SIZE, IMAGE_SIZE, 10, palette.cellBorder, 2);

  if (!cell.entry) {
    drawCenteredText(
      ctx,
      "点击选择 / 自定义填写",
      x + CELL_WIDTH / 2,
      y + IMAGE_SIZE + LABEL_HEIGHT + TITLE_HEIGHT / 2,
      CELL_WIDTH - 20,
      "600 22px sans-serif",
      palette.mutedText,
    );
    return;
  }

  const title = cell.entry.displayTitle || cell.entry.title;
  const subtitle = getSubtitle(cell.entry);
  drawCenteredText(
    ctx,
    title,
    x + CELL_WIDTH / 2,
    y + IMAGE_SIZE + LABEL_HEIGHT + 17,
    CELL_WIDTH - 18,
    "700 23px sans-serif",
    palette.pageText,
  );

  if (subtitle) {
    drawCenteredText(
      ctx,
      subtitle,
      x + CELL_WIDTH / 2,
      y + IMAGE_SIZE + LABEL_HEIGHT + 38,
      CELL_WIDTH - 20,
      "500 15px sans-serif",
      palette.mutedText,
    );
  }
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to create PNG blob"));
    }, "image/png");
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Export the preference sheet by drawing directly to a canvas.
 *
 * This intentionally does not use DOM screenshot libraries. Remote artwork is
 * best-effort only: unreadable, CORS-tainted, timed-out, or broken images are
 * replaced with generated placeholders so a single image can never fail the
 * whole export.
 */
export async function exportToPNG(
  options: CanvasExportOptions,
  filename = "vocaloid-loving-sheet.png",
): Promise<void> {
  const palette = getPalette(options.theme, options.mode);
  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to create canvas context");

  ctx.fillStyle = palette.pageBg;
  ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = palette.accent;
  ctx.font = "900 72px sans-serif";
  ctx.fillText(fitText(ctx, options.title || "术曲个人喜好表", EXPORT_WIDTH - MARGIN_X * 2), EXPORT_WIDTH / 2, TOP_PAD + 34);

  if (options.author) {
    ctx.fillStyle = palette.mutedText;
    ctx.font = "600 26px sans-serif";
    ctx.fillText(`作者：${fitText(ctx, options.author, 520)}`, EXPORT_WIDTH / 2, TOP_PAD + 92);
  }

  const cells = Object.values(options.cells);
  const gridTop = TOP_PAD + HEADER_HEIGHT;

  for (let i = 0; i < cells.length; i++) {
    const col = i % 5;
    const row = Math.floor(i / 5);
    const x = MARGIN_X + col * (CELL_WIDTH + GRID_GAP_X);
    const y = gridTop + row * (CELL_HEIGHT + GRID_GAP_Y);
    await drawCell(ctx, cells[i], x, y, palette, options.artworkSourceMode || "auto");
  }

  downloadBlob(await canvasToBlob(canvas), filename);
}

/**
 * Export a plain object as a JSON file and trigger download.
 */
export function exportToJSON(data: object, filename = "vocaloid-loving-sheet.json"): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * Read and parse a JSON file selected by the user.
 */
export function importFromJSON(file: File): Promise<object> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(reader.result as string);
        resolve(parsed as object);
      } catch (err) {
        reject(new Error(`Invalid JSON file: ${err instanceof Error ? err.message : String(err)}`));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
}

interface ShareCellData {
  categoryLabel: string;
  entry?: { title: string };
}

/**
 * Generate a plain-text summary suitable for sharing on social media.
 */
export function generateShareText(
  title: string,
  author: string,
  cells: Record<string, ShareCellData>,
): string {
  const lines: string[] = [title];

  if (author) {
    lines.push(`作者：${author}`);
  }

  lines.push("");

  for (const cell of Object.values(cells)) {
    const value = cell.entry?.title ?? "（未填）";
    lines.push(`${cell.categoryLabel}：${value}`);
  }

  return lines.join("\n");
}
