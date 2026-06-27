import { toPng } from "html-to-image";

/**
 * Wait for an image to finish loading.
 */
function waitForLoad(img: HTMLImageElement): Promise<void> {
  if (img.complete) return Promise.resolve();
  return new Promise((resolve) => {
    img.onload = () => resolve();
    img.onerror = () => resolve();
  });
}

/**
 * Test if an image's pixels can be read by canvas (not tainted by CORS).
 * Returns true for same-origin, data URLs, and cross-origin images with
 * proper CORS headers. Returns false for CORS-blocked images.
 */
async function isCanvasReadable(img: HTMLImageElement): Promise<boolean> {
  if (!img.src || img.src.startsWith("data:")) return true;
  await waitForLoad(img);
  if (!img.naturalWidth) return false;
  try {
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    const ctx = c.getContext("2d");
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, 1, 1);
    c.toDataURL();
    return true;
  } catch {
    return false;
  }
}

/**
 * Export an HTML element as a PNG image and trigger download.
 * Renders at 2x scale for high-DPI clarity.
 *
 * Images that cannot be read (CORS-blocked) are temporarily removed
 * from the DOM so the export succeeds with all remaining images.
 */
export async function exportToPNG(
  element: HTMLElement,
  filename = "vocaloid-loving-sheet.png",
): Promise<void> {
  const imgs = Array.from(element.querySelectorAll("img"));

  // Test each image — remove ones that taint the canvas
  const removed: { img: HTMLImageElement; parent: Node; next: Node | null }[] = [];
  await Promise.all(
    imgs.map(async (img) => {
      if (await isCanvasReadable(img)) return;
      removed.push({ img, parent: img.parentNode!, next: img.nextSibling });
      img.remove();
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
    for (const { img, parent, next } of removed) {
      if (next) parent.insertBefore(img, next);
      else parent.appendChild(img);
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
