import { toPng } from "html-to-image";

const EXPORT_CSS_VARS = [
  "--page-bg",
  "--page-text",
  "--accent",
  "--cell-bg",
  "--cell-border",
  "--cell-label-bg",
  "--cell-label-text",
];

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function createExportPlaceholder(label = "图片"): string {
  const safeLabel = label.replace(/[<>&"]/g, (ch) => {
    switch (ch) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case '"':
        return "&quot;";
      default:
        return ch;
    }
  });

  return svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
      <rect width="240" height="240" rx="12" fill="#f3f4f6"/>
      <rect x="20" y="20" width="200" height="200" rx="10" fill="#e5e7eb" stroke="#d1d5db"/>
      <text x="120" y="112" text-anchor="middle" font-family="sans-serif" font-size="36" font-weight="700" fill="#6b7280">♪</text>
      <text x="120" y="146" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#6b7280">${safeLabel}</text>
    </svg>
  `);
}

/**
 * Wait for an image to finish loading.
 */
function waitForLoad(img: HTMLImageElement): Promise<void> {
  if (img.complete) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, 5000);
    const done = () => {
      window.clearTimeout(timer);
      resolve();
    };

    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
  });
}

async function imageToDataUrl(img: HTMLImageElement): Promise<string | null> {
  await waitForLoad(img);
  if (!img.naturalWidth || !img.naturalHeight) return null;

  try {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return c.toDataURL("image/png");
  } catch {
    return null;
  }
}

function copyExportCssVars(source: HTMLElement, target: HTMLElement): void {
  const styles = getComputedStyle(source);
  for (const name of EXPORT_CSS_VARS) {
    const value = styles.getPropertyValue(name);
    if (value) target.style.setProperty(name, value);
  }
}

async function prepareExportClone(element: HTMLElement): Promise<HTMLElement> {
  const clone = element.cloneNode(true) as HTMLElement;
  copyExportCssVars(element, clone);

  clone.style.position = "fixed";
  clone.style.left = "-10000px";
  clone.style.top = "0";
  clone.style.pointerEvents = "none";
  clone.style.zIndex = "-1";

  document.body.appendChild(clone);

  const sourceImgs = Array.from(element.querySelectorAll("img"));
  const cloneImgs = Array.from(clone.querySelectorAll("img"));

  await Promise.all(
    cloneImgs.map(async (cloneImg, index) => {
      const sourceImg = sourceImgs[index];
      const fallback =
        cloneImg.dataset.exportPlaceholder ||
        sourceImg?.dataset.exportPlaceholder ||
        createExportPlaceholder(cloneImg.alt || "图片");

      cloneImg.removeAttribute("srcset");
      cloneImg.removeAttribute("sizes");

      if (!sourceImg) {
        cloneImg.src = fallback;
        return;
      }

      if (!sourceImg.src || !sourceImg.complete || !sourceImg.naturalWidth) {
        await waitForLoad(sourceImg);
      }

      if (!sourceImg.naturalWidth) {
        cloneImg.src = fallback;
        return;
      }

      const dataUrl = await imageToDataUrl(sourceImg);
      cloneImg.src = dataUrl || fallback;
    }),
  );

  await Promise.all(cloneImgs.map(waitForLoad));
  return clone;
}

function replaceAllImagesWithPlaceholders(element: HTMLElement): void {
  for (const img of Array.from(element.querySelectorAll("img"))) {
    img.removeAttribute("srcset");
    img.removeAttribute("sizes");
    img.src = img.dataset.exportPlaceholder || createExportPlaceholder(img.alt || "图片");
  }
}

function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

/**
 * Export an HTML element as a PNG image and trigger download.
 * Renders at 2x scale for high-DPI clarity.
 *
 * The export is performed on a cloned node. Images that can be read by
 * canvas are converted to data URLs; broken or CORS-tainted images are
 * replaced with safe placeholders so one bad remote image cannot fail
 * the whole export.
 */
export async function exportToPNG(
  element: HTMLElement,
  filename = "vocaloid-loving-sheet.png",
): Promise<void> {
  const clone = await prepareExportClone(element);
  const backgroundColor = getComputedStyle(element)
    .getPropertyValue("--page-bg")
    .trim() || "#ffffff";

  try {
    const options = {
      pixelRatio: 2,
      cacheBust: false,
      imagePlaceholder: createExportPlaceholder(),
      backgroundColor,
    };

    try {
      downloadDataUrl(await toPng(clone, options), filename);
    } catch (err) {
      console.warn("PNG export retrying with image placeholders:", err);
      replaceAllImagesWithPlaceholders(clone);
      await Promise.all(Array.from(clone.querySelectorAll("img")).map(waitForLoad));
      downloadDataUrl(await toPng(clone, options), filename);
    }
  } finally {
    clone.remove();
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
