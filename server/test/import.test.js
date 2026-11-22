import test from "node:test";
import assert from "node:assert/strict";
import { strip, parseRelease, parseRequirements, slugify } from "../scripts/import-steam.js";

test("importer: text, dates, requirements and slugs from Steam data", () => {
  assert.equal(strip("<h2>Cut.</h2><p>In the <b>late</b> , era &amp; more</p>[p]Hi[/p]"), "Cut. In the late, era & more Hi");
  assert.equal(parseRelease("Feb 24, 2022"), "2022-02-24");
  assert.equal(parseRelease("24 Feb, 2022"), "2022-02-24");
  assert.equal(parseRelease("Q2 2027"), "2027");
  assert.equal(parseRelease("Coming soon"), null);
  assert.deepEqual(
    parseRequirements(
      '<strong>Minimum:</strong><br><ul class="bb_ul"><li>Requires a 64-bit processor<br></li><li><strong>OS:</strong> Windows 10<br></li><li><strong>Memory:</strong> 16 GB RAM</li></ul>'
    ),
    {
      OS: "Windows 10",
      Memory: "16 GB RAM",
    }
  );
  assert.equal(parseRequirements(""), null);
  assert.equal(slugify("Ghost of Tsushima DIRECTOR'S CUT™"), "ghost-of-tsushima-director-s-cut");
});
