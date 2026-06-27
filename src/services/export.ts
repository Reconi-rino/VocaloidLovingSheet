import { toPng } from "html-to-image";

const WARNING_PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="#374151" rx="8"/>
      <text x="100" y="85" text-anchor="middle" font-size="40" fill="#fbbf24" font-family="sans-serif">⚠</text>
      <text x="100" y="120" text-anchor="middle" font-size="14" fill="#fbbf24" font-family="sans-serif">图片加载失败</text>
      <text x="100" y="145" text-anchor="middle" font-size="11" fill="#9ca3af" font-family="sans-serif">请手动替换图片源</text>
    </svg>`,
  );

/**
 * Test if an <img> element's pixels are readable by canvas.
 * Cross-origin images without CORS headers will taint the canvas.
 */
function isCanvasReadable(img: HTMLImageElement): boolean {
  if (!img.complete || !img.naturalWidth) return false;
  try {
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    c.getContext("2d")!.drawImage(img, 0, 0, 1, 1);
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
 * Pre-checks images: CORS-blocked images are replaced with a warning
 * placeholder telling the user to swap the image source manually.
 */
/**
 * Wait for an image to finish loading.
 */
function waitForImage(img: HTMLImageElement): Promise<void> {
  if (img.complete) return Promise.resolve();
  return new Promise((resolve) => {
    img.onload = () => resolve();
    img.onerror = () => resolve();
  });
}

export async function exportToPNG(
  element: HTMLElement,
  filename = "vocaloid-loving-sheet.png",
): Promise<void> {
  const imgs = Array.from(element.querySelectorAll("img"));
  const originals: { img: HTMLImageElement; src: string }[] = [];

  await Promise.all(
    imgs.map(async (img) => {
      const src = img.src;
      if (!src || src.startsWith("data:")) return;
      originals.push({ img, src });
      await waitForImage(img);
      if (!isCanvasReadable(img)) {
        img.src = WARNING_PLACEHOLDER;
      }
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
