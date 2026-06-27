const VOCADB_BASE = "https://vocadb.net/api";
const FETCH_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 300;
const MAX_QUERY_LENGTH = 120;

const ALLOWED_RESOURCES = new Set(["songs", "artists", "albums"]);
const ALLOWED_PARAMS = new Set([
  "artistId[]",
  "artistTypes",
  "fields",
  "lang",
  "maxEntries",
  "nameMatchMode",
  "query",
  "sort",
  "start",
]);

interface CacheRecord {
  body: string;
  contentType: string;
  expiresAt: number;
}

const cacheGlobal = globalThis as typeof globalThis & {
  __vocaloidVocadbCache?: Map<string, CacheRecord>;
};

const responseCache = cacheGlobal.__vocaloidVocadbCache || new Map<string, CacheRecord>();
cacheGlobal.__vocaloidVocadbCache = responseCache;

function firstParam(value: unknown): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined;
  return typeof value === "string" ? value : undefined;
}

function setCors(res: any): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function normalizeInteger(value: string | undefined, fallback: number, min: number, max: number): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(fallback);
  return String(Math.min(max, Math.max(min, Math.trunc(parsed))));
}

function buildVocaDbUrl(query: Record<string, unknown>): URL | null {
  const resource = firstParam(query.resource);
  if (!resource || !ALLOWED_RESOURCES.has(resource)) return null;

  const url = new URL(`${VOCADB_BASE}/${resource}`);
  for (const key of ALLOWED_PARAMS) {
    const raw = query[key];
    const values = Array.isArray(raw) ? raw : [raw];
    for (const value of values) {
      if (typeof value !== "string" || !value.trim()) continue;
      if (key === "query" && value.length > MAX_QUERY_LENGTH) return null;
      if (key === "start") {
        url.searchParams.set(key, normalizeInteger(value, 0, 0, 500));
      } else if (key === "maxEntries") {
        url.searchParams.set(key, normalizeInteger(value, 10, 1, 30));
      } else {
        url.searchParams.append(key, value);
      }
    }
  }

  return url;
}

function pruneCache(): void {
  const now = Date.now();
  for (const [key, record] of responseCache) {
    if (record.expiresAt <= now) responseCache.delete(key);
  }

  while (responseCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;
    if (!oldestKey) return;
    responseCache.delete(oldestKey);
  }
}

function sendJson(res: any, record: CacheRecord, cacheStatus: "HIT" | "MISS"): void {
  res.setHeader("Content-Type", record.contentType);
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=21600, stale-while-revalidate=604800");
  res.setHeader("X-Vocaloid-Cache", cacheStatus);
  res.status(200).send(record.body);
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

  const target = buildVocaDbUrl(req.query || {});
  if (!target) {
    res.status(400).json({ error: "Missing or invalid VocaDB query" });
    return;
  }

  pruneCache();
  const cacheKey = target.toString();
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    sendJson(res, cached, "HIT");
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const upstream = await fetch(target, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "user-agent": "VocaloidLovingSheet/1.0 VocaDB cache",
      },
    });

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `Upstream HTTP ${upstream.status}` });
      return;
    }

    const body = await upstream.text();
    JSON.parse(body);

    const record = {
      body,
      contentType: upstream.headers.get("content-type") || "application/json; charset=utf-8",
      expiresAt: Date.now() + CACHE_TTL_MS,
    };

    responseCache.set(cacheKey, record);
    sendJson(res, record, "MISS");
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "Upstream request timed out"
      : "Failed to fetch VocaDB data";
    res.status(502).json({ error: message });
  } finally {
    clearTimeout(timer);
  }
}
