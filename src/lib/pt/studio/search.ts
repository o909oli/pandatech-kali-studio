import type { SearchMatch, SearchOptions } from "./types";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Converts a comma separated glob list ("src/**, *.ts") into regexes. */
export function globsToRegex(list: string): RegExp[] {
  return list
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean)
    .map((g) => {
      const re = g
        .split("**")
        .map((part) => part.split("*").map(escapeRe).join("[^/]*"))
        .join(".*");
      return new RegExp(`(^|/)${re}($|/)`, "i");
    });
}

/** Builds the matcher for a query, or returns an error message for an invalid regex. */
export function buildMatcher(opts: Pick<SearchOptions, "query" | "matchCase" | "wholeWord" | "regex">): RegExp | string | null {
  if (!opts.query) return null;
  let src = opts.regex ? opts.query : escapeRe(opts.query);
  if (opts.wholeWord) src = `\\b${src}\\b`;
  try {
    return new RegExp(src, opts.matchCase ? "g" : "gi");
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid regular expression";
  }
}

/** Searches in-memory files. In native mode the workspace provider searches the disk instead. */
export function searchFiles(
  files: Record<string, string>,
  opts: SearchOptions,
  root = "",
): { matches: SearchMatch[]; error?: string | undefined } {
  const re = buildMatcher(opts);
  if (re === null) return { matches: [] };
  if (typeof re === "string") return { matches: [], error: re };
  const inc = globsToRegex(opts.include);
  const exc = globsToRegex(opts.exclude);
  const matches: SearchMatch[] = [];
  for (const [path, text] of Object.entries(files)) {
    const rel = root && path.startsWith(root + "/") ? path.slice(root.length + 1) : path;
    if (inc.length && !inc.some((r) => r.test(rel))) continue;
    if (exc.some((r) => r.test(rel))) continue;
    text.split("\n").forEach((line, i) => {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(line))) {
        if (m[0].length === 0) {
          re.lastIndex++;
          continue;
        }
        matches.push({ path, line: i + 1, col: m.index + 1, length: m[0].length, preview: line });
      }
    });
  }
  return { matches };
}

/** Replaces every match of the query in one text. */
export function replaceAll(text: string, opts: SearchOptions, replacement: string): string {
  const re = buildMatcher(opts);
  if (!re || typeof re === "string") return text;
  return text.replace(re, replacement);
}

/** Replaces a single match (line/col are 1-based). */
export function replaceOne(text: string, match: Pick<SearchMatch, "line" | "col" | "length">, replacement: string): string {
  const lines = text.split("\n");
  const l = lines[match.line - 1];
  if (l === undefined) return text;
  lines[match.line - 1] = l.slice(0, match.col - 1) + replacement + l.slice(match.col - 1 + match.length);
  return lines.join("\n");
}
