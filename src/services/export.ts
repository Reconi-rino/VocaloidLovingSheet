import { toPng } from "html-to-image";

/**
 * Check if an image URL is cross-origin (cannot be read by canvas).
 */
function isCrossOrigin(url: string): boolean {
  if (!url || url.startsWith("data:")) return false;
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin !== window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Export an HTML element as a PNG image and trigger download.
 * Renders at 2x scale for high-DPI clarity.
 *
 * Cross-origin images (e.g. from static.vocadb.net) are hidden before
 * export since the browser cannot embed them without CORS headers.
 */
export async function exportToPNG(
  element: HTMLElement,
  filename = "vocaloid-loving-sheet.png",
): Promise<void> {
  // Temporarily remove cross-origin images from the DOM before export.
  // display:none is not enough — html-to-image still processes them.
  const imgs = Array.from(element.querySelectorAll("img"));
  const removed: { img: HTMLImageElement; parent: Node; next: Node | null }[] = [];

  for (const img of imgs) {
    if (isCrossOrigin(img.src)) {
      removed.push({
        img,
        parent: img.parentNode!,
        next: img.nextSibling,
      });
      img.remove();
    }
  }

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
    // Restore removed images
    for (const { img, parent, next } of removed) {
      if (next) {
        parent.insertBefore(img, next);
      } else {
        parent.appendChild(img);
      }
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
