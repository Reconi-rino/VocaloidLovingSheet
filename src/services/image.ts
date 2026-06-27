/**
 * Convert a File to a base64 data-URL string.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result as string);
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file as base64"));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Compress / resize an image data-URL using an off-screen canvas.
 *
 * @param dataUrl  - Source image data-URL.
 * @param maxWidth - Maximum width in pixels.
 * @param maxHeight - Maximum height in pixels.
 * @param quality  - JPEG/WebP quality 0-1 (default 0.8).
 * @returns A new data-URL of the compressed image (PNG if the source has
 *          transparency, JPEG otherwise).
 */
export function compressImage(
  dataUrl: string,
  maxWidth: number,
  maxHeight: number,
  quality = 0.8,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;

      // Maintain aspect ratio while fitting inside the bounding box.
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas 2D context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Use JPEG for photos (smaller), PNG for images with transparency.
      const hasTransparency = dataUrl.includes("image/png");
      const mimeType = hasTransparency ? "image/png" : "image/jpeg";
      const result = canvas.toDataURL(mimeType, quality);

      resolve(result);
    };

    img.onerror = () => {
      reject(new Error("Failed to load image for compression"));
    };

    img.src = dataUrl;
  });
}

/**
 * Color palettes keyed by entry type.
 * Each palette has a background and text color for the placeholder circle.
 */
const PLACEHOLDER_COLORS: Record<string, { bg: string; text: string }> = {
  song:    { bg: "#3b82f6", text: "#ffffff" },
  producer:{ bg: "#22c55e", text: "#ffffff" },
  singer:  { bg: "#ec4899", text: "#ffffff" },
  album:   { bg: "#a855f7", text: "#ffffff" },
  custom:  { bg: "#6b7280", text: "#ffffff" },
};

/**
 * Generate an SVG data-URL placeholder image showing the first character
 * of `title` inside a colored circle. The color varies by entry type.
 */
export function getImagePlaceholder(title: string, type: string): string {
  const colors = PLACEHOLDER_COLORS[type] ?? PLACEHOLDER_COLORS.custom;
  const firstChar = title.charAt(0) || "?";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="${colors.bg}" rx="16"/>
  <text x="100" y="100" text-anchor="middle" dominant-baseline="central"
        font-family="sans-serif" font-size="80" font-weight="700"
        fill="${colors.text}">${escapeXml(firstChar)}</text>
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Escape special XML characters for safe embedding inside SVG text.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Basic URL validation.
 * Returns true if the string looks like a valid http(s) or data-URL.
 */
export function isValidImageUrl(url: string): boolean {
  if (!url) return false;

  // Allow data-URLs (base64 images).
  if (url.startsWith("data:image/")) return true;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
