/** Line diff (LCS) used by Source Control and P edit proposals. */
export interface DiffLine {
  kind: "same" | "add" | "del";
  text: string;
  /** 1-based line number in the old text */
  a?: number | undefined;
  /** 1-based line number in the new text */
  b?: number | undefined;
}

export interface DiffHunk {
  lines: DiffLine[];
  oldStart: number;
  newStart: number;
}

export interface DiffSummary {
  added: number;
  removed: number;
}

const split = (s: string) => (s === "" ? [] : s.replace(/\n$/, "").split("\n"));

export function diffLines(before: string, after: string): DiffLine[] {
  const a = split(before);
  const b = split(after);
  const n = a.length;
  const m = b.length;
  // LCS table (files in the prototype are small)
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ kind: "same", text: a[i]!, a: i + 1, b: j + 1 });
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      out.push({ kind: "del", text: a[i]!, a: i + 1 });
      i++;
    } else {
      out.push({ kind: "add", text: b[j]!, b: j + 1 });
      j++;
    }
  }
  while (i < n) out.push({ kind: "del", text: a[i]!, a: ++i });
  while (j < m) out.push({ kind: "add", text: b[j]!, b: ++j });
  return out;
}

export function summarize(lines: DiffLine[]): DiffSummary {
  let added = 0;
  let removed = 0;
  for (const l of lines) {
    if (l.kind === "add") added++;
    else if (l.kind === "del") removed++;
  }
  return { added, removed };
}

/** Groups changes into hunks with `context` unchanged lines around them. */
export function toHunks(lines: DiffLine[], context = 3): DiffHunk[] {
  const changed = lines.map((l, i) => (l.kind !== "same" ? i : -1)).filter((i) => i >= 0);
  if (!changed.length) return [];
  const hunks: DiffHunk[] = [];
  let start = Math.max(0, changed[0]! - context);
  let end = Math.min(lines.length - 1, changed[0]! + context);
  const flush = () => {
    const slice = lines.slice(start, end + 1);
    const first = slice.find((l) => l.a !== undefined)?.a ?? 1;
    const firstB = slice.find((l) => l.b !== undefined)?.b ?? 1;
    hunks.push({ lines: slice, oldStart: first, newStart: firstB });
  };
  for (const idx of changed.slice(1)) {
    if (idx - context <= end + 1) end = Math.min(lines.length - 1, idx + context);
    else {
      flush();
      start = Math.max(0, idx - context);
      end = Math.min(lines.length - 1, idx + context);
    }
  }
  flush();
  return hunks;
}

/** Side-by-side rows: deletions and additions paired up within a change block. */
export function toSideBySide(lines: DiffLine[]): { left?: DiffLine | undefined; right?: DiffLine | undefined }[] {
  const rows: { left?: DiffLine | undefined; right?: DiffLine | undefined }[] = [];
  let dels: DiffLine[] = [];
  let adds: DiffLine[] = [];
  const flush = () => {
    const n = Math.max(dels.length, adds.length);
    for (let k = 0; k < n; k++) rows.push({ left: dels[k], right: adds[k] });
    dels = [];
    adds = [];
  };
  for (const l of lines) {
    if (l.kind === "del") dels.push(l);
    else if (l.kind === "add") adds.push(l);
    else {
      flush();
      rows.push({ left: l, right: l });
    }
  }
  flush();
  return rows;
}
