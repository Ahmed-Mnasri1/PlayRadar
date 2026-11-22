import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import express from "express";
import sharp from "sharp";
import { imageRoute } from "../src/images.js";
import { CATALOG } from "../src/catalog.js";

test("image proxy: resizes Steam images to cached WebP, only for catalog games", async (t) => {
  const g = CATALOG.find((x) => x.imgSrc);
  if (!g) return t.skip("no imported catalog");
  const jpg = await sharp({ create: { width: 600, height: 900, channels: 3, background: "#456" } })
    .jpeg()
    .toBuffer();
  let fetches = 0;
  const fakeFetch = async (url) => {
    fetches++;
    assert.equal(url, g.imgSrc.cover, "source URL comes from the catalog");
    return new Response(jpg, { status: 200 });
  };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "playradar-img-"));
  const app = express().get("/api/img/:id/:size", imageRoute({ fetchImpl: fakeFetch, cacheDir: dir }));
  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}/api/img`;
  try {
    const res = await fetch(`${base}/${g.id}/cover`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "image/webp");
    assert.match(res.headers.get("cache-control"), /max-age=2592000/);
    const meta = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
    assert.deepEqual([meta.format, meta.width, meta.height], ["webp", 300, 450]);
    await fetch(`${base}/${g.id}/cover`);
    assert.equal(fetches, 1, "second request is served from the disk cache");
    assert.equal((await fetch(`${base}/${g.id}/huge`)).status, 404, "unknown size");
    assert.equal((await fetch(`${base}/not-a-game/cover`)).status, 404, "unknown game");
  } finally {
    server.close();
  }
});
