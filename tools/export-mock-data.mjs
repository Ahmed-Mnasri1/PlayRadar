import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const context = {
  window: {},
  localStorage: {
    getItem: () => null,
    setItem: () => {},
  },
};

vm.createContext(context);

for (const filename of ["steam-data.js", "data.js"]) {
  const source = await readFile(path.join(root, "prototype", "assets", "js", filename), "utf8");
  vm.runInContext(source, context, { filename });
}

const games = context.window.PR.GAMES;
if (!Array.isArray(games) || games.length === 0) {
  throw new Error("The prototype data did not produce any games.");
}

const output = path.join(root, "data", "games.json");
await writeFile(output, `${JSON.stringify(games, null, 2)}\n`, "utf8");
console.log(`Exported ${games.length} games to ${path.relative(root, output)}.`);
