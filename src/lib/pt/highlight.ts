const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const KW = /\b(import|from|export|const|let|var|function|async|await|return|if|else|for|while|interface|type|class|new|def|in|not|and|or|echo|set|then|fi|do|done)\b/g;

/** Very small syntax highlighter for the demo editor (no dependency). Returns safe HTML. */
export function highlight(code: string): string {
  const tokens: string[] = [];
  const stash = (cls: string, text: string) => {
    tokens.push(`<span class="${cls}">${esc(text)}</span>`);
    return `\u0000tk${tokens.length - 1}\u0000`;
  };
  let s = code;
  s = s.replace(/(\/\/[^\n]*|#[^\n]*)/g, (m) => stash("tok-com", m));
  s = s.replace(/(`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g, (m) => stash("tok-str", m));
  s = esc(s);
  s = s.replace(/\b(\d+(?:\.\d+)?)\b/g, (m) => stash("tok-num", m));
  s = s.replace(KW, (m) => stash("tok-kw", m));
  s = s.replace(/\b([A-Za-z_]\w*)(?=\()/g, (m) => stash("tok-fn", m));
  s = s.replace(/\b([A-Z][A-Za-z0-9]*)\b/g, (m) => stash("tok-type", m));
  return s.replace(/\u0000tk(\d+)\u0000/g, (_: string, i: string) => tokens[+i] ?? "");
}
