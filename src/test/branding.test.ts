import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Built from pieces so this file never contains the forbidden words itself.
const FORBIDDEN = [new RegExp(["k", "a", "l", "i"].join(""), "i"), new RegExp("white[\\s_-]?label", "i")];
const ROOTS = ["src", "docs", "public", "README.md", "AGENTS.md", "index.html"];
const SKIP = /node_modules|routeTree\.gen|\.(png|jpe?g|webp|ico|mp4)$/;

function files(p: string): string[] {
  try {
    const st = statSync(p);
    if (st.isFile()) return SKIP.test(p) ? [] : [p];
    return readdirSync(p).flatMap((f) => files(join(p, f)));
  } catch {
    return [];
  }
}

describe("Pandatechs branding", () => {
  it("never mentions the underlying distribution or white-label wording", () => {
    const hits: string[] = [];
    for (const f of ROOTS.flatMap(files)) {
      const text = readFileSync(f, "utf8");
      // allow words that merely contain the letters, e.g. "alkaline"
      const words = text.match(/[A-Za-z_-]+/g) ?? [];
      for (const w of words) if (FORBIDDEN[0]!.test(w) && w.length <= 6 && /^k?ali$|^kali/i.test(w)) hits.push(`${f}: ${w}`);
      if (FORBIDDEN[1]!.test(text)) hits.push(`${f}: white-label`);
    }
    expect(hits).toEqual([]);
  });
});
