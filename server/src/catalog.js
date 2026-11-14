import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
/** Static game metadata (titles, studios, descriptions…) — see catalog.json. */
export const CATALOG = JSON.parse(fs.readFileSync(path.join(here, "catalog.json"), "utf8"));
export const gameById = (id) => CATALOG.find((g) => g.id === id);
