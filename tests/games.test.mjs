import test from "node:test";
import assert from "node:assert/strict";
import { searchGames } from "../lib/games.js";

test("search is case-insensitive and ignores accents", () => {
  const results = searchGames({ q: "elden ring" });
  assert.equal(results.length, 1);
  assert.equal(results[0].id, "elden-ring");
});

test("platform, price ceiling, and promotion filters compose", () => {
  const results = searchGames({ platform: "PC", maxPrice: "20", promosOnly: true });
  assert.ok(results.length > 0);
  assert.ok(results.every((game) => game.platforms.includes("PC")));
  assert.ok(results.every((game) => game.best && game.best.price <= 20));
  assert.ok(results.every((game) => game.discount > 0));
});

test("unknown game fields do not produce results", () => {
  assert.deepEqual(searchGames({ q: "this-game-does-not-exist" }), []);
});
