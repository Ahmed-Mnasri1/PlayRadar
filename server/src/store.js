// Tiny JSON-file persistence ("backend minimal"): the whole state lives in memory
// and is written to disk (atomically, debounced) after every change.
import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";
import { buildSeed } from "./seed.js";
import { CATALOG } from "./catalog.js";

export class Store {
  constructor(file = config.dataFile) {
    this.file = file;
    this.timer = null;
    this.state = this.load();
  }

  load() {
    try {
      const s = JSON.parse(fs.readFileSync(this.file, "utf8"));
      if (s && s.version === 1 && s.offers) {
        // A game added to the catalog after the file was written gets seeded.
        const fresh = CATALOG.some((g) => !s.offers[g.id]) ? buildSeed(s.seededAt) : null;
        if (fresh) for (const g of CATALOG) if (!s.offers[g.id]) (s.offers[g.id] = fresh.offers[g.id]), (s.history[g.id] = fresh.history[g.id]);
        return s;
      }
    } catch {
      /* first run or unreadable file: start from the seed */
    }
    const s = buildSeed();
    this.write(s);
    return s;
  }

  write(state = this.state) {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = this.file + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(state));
      fs.renameSync(tmp, this.file);
    } catch (err) {
      console.warn("[store] could not write state file:", err.message);
    }
  }

  /** Debounced save. */
  save() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.write(), 400);
    this.timer.unref?.();
  }

  flush() {
    clearTimeout(this.timer);
    this.write();
  }
}
