import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Built from pieces so this file never contains the forbidden words itself.
const DISTRO = ["k", "a", "l", "i"].join("");
const LABEL = new RegExp(["wh", "ite"].join("") + "[\\s_-]?" + ["la", "bel"].join(""), "i");
const ROOTS = ["src", "docs", "public", "README.md", "AGENTS.md"];
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
  it("only Pandatechs branding appears: no distribution name and no rebrand wording", () => {
    const hits: string[] = [];
    for (const f of ROOTS.flatMap(files)) {
      const text = readFileSync(f, "utf8");
      for (const w of text.match(/[A-Za-z]+/g) ?? []) if (w.toLowerCase().startsWith(DISTRO)) hits.push(`${f}: ${w}`);
      if (LABEL.test(text)) hits.push(`${f}: rebrand wording`);
    }
    expect(hits).toEqual([]);
  });
});
