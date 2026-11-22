import test from "node:test";
import assert from "node:assert/strict";
import { parseQuery, runQuery, suggest } from "../src/query.js";

const g = (id, o) => ({
  id,
  title: id,
  aliases: "",
  studio: "S",
  publisher: "P",
  genres: ["Action"],
  platforms: ["PC"],
  pegi: 16,
  release: "2024-01-01",
  upcoming: false,
  discount: 0,
  isLow: false,
  official: { price: 20 },
  key: null,
  rank: 1,
  ...o,
});
const ALL = [
  g("alpha", { rank: 3, discount: 50, official: { price: 10 } }),
  g("beta", { rank: 1, genres: ["RPG"], studio: "Beta Studio" }),
  g("gamma", { rank: 2, upcoming: true, release: "2027", official: null }),
  g("delta", { rank: 0, platforms: ["PS5"], pegi: 18, isLow: true, discount: 30, official: { price: 40 } }),
];
const run = (q) => runQuery(ALL, parseQuery(q));

test("query: filters, sorts and pages on the server", () => {
  assert.deepEqual(
    run({}).games.map((x) => x.id),
    ["delta", "beta", "gamma", "alpha"],
    "popular by default"
  );
  assert.equal(run({}).total, 4);
  assert.deepEqual(
    run({ promo: "1", sort: "discount" }).games.map((x) => x.id),
    ["alpha", "delta"]
  );
  assert.deepEqual(
    run({ genre: "RPG" }).games.map((x) => x.id),
    ["beta"]
  );
  assert.deepEqual(
    run({ plat: ["PS5"] }).games.map((x) => x.id),
    ["delta"]
  );
  assert.deepEqual(
    run({ max: "15" }).games.map((x) => x.id),
    ["alpha"],
    "max price excludes unpriced games"
  );
  assert.deepEqual(
    run({ when: "soon" }).games.map((x) => x.id),
    ["gamma"]
  );
  assert.deepEqual(
    run({ pegi: "16" }).games.map((x) => x.id),
    ["beta", "gamma", "alpha"]
  );
  assert.deepEqual(
    run({ low: "1" }).games.map((x) => x.id),
    ["delta"]
  );
  assert.deepEqual(
    run({ q: "ALP" }).games.map((x) => x.id),
    ["alpha"],
    "case-insensitive text search"
  );
  assert.deepEqual(
    run({ ids: "alpha,beta" }).games.map((x) => x.id),
    ["beta", "alpha"]
  );
  const page = run({ limit: "2", offset: "1" });
  assert.deepEqual([page.total, page.games.map((x) => x.id)], [4, ["beta", "gamma"]]);
  assert.deepEqual(run({ facets: "1" }).facets.platforms[0], { name: "PC", count: 3 });
  // hostile input falls back to defaults
  const p = parseQuery({ sort: "__proto__", limit: "99999", max: "-4", when: "x" });
  assert.deepEqual([p.sort, p.limit, p.max, p.when], ["popular", 200, 1, "all"]);
});

test("suggest: games and studios for the header search", () => {
  assert.deepEqual(
    suggest(ALL, "").games.map((x) => x.id),
    ["alpha", "delta"],
    "hot deals when empty"
  );
  const s = suggest(ALL, "beta");
  assert.deepEqual(
    s.games.map((x) => x.id),
    ["beta"]
  );
  assert.deepEqual(s.studios, [{ name: "Beta Studio", count: 1 }]);
});
