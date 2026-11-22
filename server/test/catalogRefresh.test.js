import test from "node:test";
import assert from "node:assert/strict";
import { startCatalogRefresh } from "../src/catalogRefresh.js";
import { CATALOG } from "../src/catalog.js";

test("catalog refresh: re-imports in the background only when the catalog is old", async () => {
  const calls = [];
  const importer = async (opts) => (calls.push(opts), { added: 0 });
  let ensured = 0;
  const engine = { ensureGames: () => ensured++ };

  const fresh = startCatalogRefresh(engine, { days: 1e6, importer }); // catalog far younger than that
  await fresh.check();
  fresh.stop();
  assert.equal(calls.length, 0, "not due: nothing imported");

  const due = startCatalogRefresh(engine, { days: 1e-9, importer });
  await due.check();
  due.stop();
  assert.equal(calls.length, 1);
  assert.ok(calls[0].count >= 500 && calls[0].delay >= 2500, "paced slower than the CLI import");
  assert.equal(ensured, 1, "new games get an empty price record");
  assert.ok(CATALOG.length > 14, "catalog reloaded in place");

  assert.equal(startCatalogRefresh(engine, { days: 0, importer }), null, "0 disables it");
});
