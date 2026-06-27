declare const Buffer: {
  from(input: ArrayBuffer): Uint8Array;
};

const MAX_IMAGE_BYTES = 16 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 9000;

function setCors(res: any): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function parseTarget(raw: unknown): URL | null {
  if (typeof raw !== "string") return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1" ||
      url.hostname.endsWith(".local")
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function normalizeImageContentType(contentType: string): string {
  const mediaType = contentType.split(";")[0]?.trim().toLowerCase() || "application/octet-stream";
  return mediaType === "image/jpg" ? "image/jpeg" : mediaType;
}

function detectImageContentType(bytes: Uint8Array, fallback: string): string {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "image/gif";
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return fallback;
}

export default async function handler(req: any, res: any) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const target = parseTarget(req.query?.url);
  if (!target) {
    res.status(400).json({ error: "Missing or invalid url" });
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const upstream = await fetch(target, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "VocaloidLovingSheet/1.0 image proxy",
        accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `Upstream HTTP ${upstream.status}` });
      return;
    }

    const contentType = normalizeImageContentType(upstream.headers.get("content-type") || "application/octet-stream");
    if (!contentType.startsWith("image/")) {
      res.status(415).json({ error: `Unsupported content-type: ${contentType}` });
      return;
    }

    const contentLength = Number(upstream.headers.get("content-length") || "0");
    if (contentLength > MAX_IMAGE_BYTES) {
      res.status(413).json({ error: "Image too large" });
      return;
    }

    const bytes = Buffer.from(await upstream.arrayBuffer());
    if (bytes.byteLength > MAX_IMAGE_BYTES) {
      res.status(413).json({ error: "Image too large" });
      return;
    }

    res.setHeader("Content-Type", detectImageContentType(bytes, contentType));
    res.setHeader("Content-Length", String(bytes.byteLength));
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800");
    res.status(200).end(bytes);
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "Upstream request timed out"
      : "Failed to fetch image";
    res.status(502).json({ error: message });
  } finally {
    clearTimeout(timer);
  }
}
