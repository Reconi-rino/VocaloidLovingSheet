import { toPng } from "html-to-image";
import { proxyImageUrl } from "./artwork";

/**
 * Fetch an image URL through a CORS proxy and return as a data-URL.
 * Falls back to the original URL if the proxy fails.
 */
async function fetchAsDataUrl(url: string): Promise<string> {
  const proxied = proxyImageUrl(url);
  try {
    const res = await fetch(proxied, { mode: "cors", cache: "force-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

/**
 * Export an HTML element as a PNG image and trigger download.
 * Renders at 2x scale for high-DPI clarity.
 *
 * Pre-caches all remote images through a CORS proxy so that
 * html-to-image can embed them without cross-origin errors.
 */
export async function exportToPNG(
  element: HTMLElement,
  filename = "vocaloid-loving-sheet.png",
): Promise<void> {
  // Pre-cache all remote images as data-URLs
  const imgs = Array.from(element.querySelectorAll("img"));
  const originals: { img: HTMLImageElement; src: string }[] = [];

  await Promise.all(
    imgs.map(async (img) => {
      const src = img.src;
      if (!src || src.startsWith("data:")) return;
      originals.push({ img, src });
      try {
        img.src = await fetchAsDataUrl(src);
      } catch { /* keep original */ }
    }),
  );

  try {
    const dataUrl = await toPng(element, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: getComputedStyle(document.documentElement)
        .getPropertyValue("--page-bg")
        .trim() || "#ffffff",
    });

    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } finally {
    // Restore original URLs
    for (const { img, src } of originals) {
      img.src = src;
    }
  }
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
 *
 * Format:
 * ```
 * 术曲个人喜好表
 * 入坑作：xxx
 * 最喜欢的：xxx
 * ...
 * ```
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
