// Image proxy for imported games: Steam serves 600×900 JPG covers and 3840px heroes;
// cards show them at ~300px. The first request downloads the Steam image, resizes it,
// converts it to WebP and caches the file on disk; later requests are a plain file send.
//
//   GET /api/img/:gameId/:size     size = cover | coverSm | hero | heroSm
//
// Only catalog images can be requested (the source URL comes from the catalog, never
// from the request), so this cannot be used to fetch arbitrary URLs.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { SERVER_ROOT } from "./config.js";
import { gameById } from "./catalog.js";

export const SIZES = {
  cover: { width: 300, height: 450 }, // 2:3, cropped like the CSS does (some sources are landscape)
  coverSm: { width: 150, height: 225 },
  hero: { width: 1920 },
  heroSm: { width: 960 },
};
const CACHE = path.join(SERVER_ROOT, "data", "img-cache");
const MAX_AGE = 30 * 86400; // seconds
const pending = new Map(); // one conversion per file, even with concurrent requests

async function convert(src, size, file, fetchImpl, dir) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15_000);
  try {
    const res = await fetchImpl(src, { signal: ctl.signal, headers: { "User-Agent": "PlayRadar-student-project/1.0" } });
    if (!res.ok) throw new Error(`image HTTP ${res.status}`);
    const input = Buffer.from(await res.arrayBuffer());
    const { width, height } = SIZES[size];
    const out = await sharp(input)
      .resize({ width, height, fit: "cover", position: "attention", withoutEnlargement: !height })
      .webp({ quality: 74, effort: 4 })
      .toBuffer();
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file + ".tmp", out);
    fs.renameSync(file + ".tmp", file);
  } finally {
    clearTimeout(timer);
  }
}

export function imageRoute({ fetchImpl = fetch, cacheDir = CACHE } = {}) {
  return async (req, res) => {
    const { id, size } = req.params;
    const game = gameById(id);
    const src = game && game.imgSrc && Object.hasOwn(SIZES, size) ? game.imgSrc[size] : null;
    if (!src) return res.status(404).json({ error: "Unknown image" });

    const file = path.join(cacheDir, `${id}-${size}.webp`);
    try {
      if (!fs.existsSync(file)) {
        if (!pending.has(file))
          pending.set(
            file,
            convert(src, size, file, fetchImpl, cacheDir).finally(() => pending.delete(file))
          );
        await pending.get(file);
      }
      res.set("Cache-Control", `public, max-age=${MAX_AGE}`);
      res.type("image/webp").sendFile(file);
    } catch (err) {
      // Never leave a hole in the page: fall back to the original Steam image.
      console.warn(`[images] ${id}/${size}: ${err.message}`);
      res.redirect(302, src);
    }
  };
}
