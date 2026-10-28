/**
 * Pandatechs Studio code editor (CodeMirror 6). Browser-only: loaded with
 * React.lazy behind a hydration check by StudioApp.
 */
import { useEffect, useRef } from "react";
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab, redo, undo } from "@codemirror/commands";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { php } from "@codemirror/lang-php";
import { python } from "@codemirror/lang-python";
import {
  bracketMatching, foldGutter, foldKeymap, HighlightStyle, indentOnInput, indentUnit, syntaxHighlighting,
} from "@codemirror/language";
import { lintGutter, setDiagnostics, type Diagnostic as CMDiagnostic } from "@codemirror/lint";
import { highlightSelectionMatches, openSearchPanel, search, searchKeymap } from "@codemirror/search";
import { Compartment, EditorSelection, EditorState, RangeSet, StateEffect, StateField, type Extension } from "@codemirror/state";
import {
  crosshairCursor, Decoration, drawSelection, dropCursor, EditorView, gutter, GutterMarker, highlightActiveLine,
  highlightActiveLineGutter, highlightSpecialChars, keymap, lineNumbers, rectangularSelection, WidgetType, type DecorationSet,
} from "@codemirror/view";
import { indentationMarkers } from "@replit/codemirror-indentation-markers";
import { showMinimap } from "@replit/codemirror-minimap";
import { tags as t } from "@lezer/highlight";
import type { Diagnostic, LanguageId } from "@/lib/pt/studio/types";
import type { StudioSettings } from "@/lib/pt/studio/store";

export interface EditorApi {
  undo(): void;
  redo(): void;
  find(): void;
  selectAll(): void;
  focus(): void;
}

export interface CodeEditorProps {
  path: string;
  content: string;
  language: LanguageId;
  readOnly: boolean;
  settings: StudioSettings;
  diagnostics: Diagnostic[];
  breakpoints: number[];
  debugLine: number | null;
  ghost: { pos: number; text: string } | null;
  jump: { line: number; col: number; nonce: number } | null;
  onChange(text: string): void;
  onCursor(c: { line: number; col: number; selection: number; text: string; pos: number }): void;
  onToggleBreakpoint(line: number): void;
  onContextMenu(e: MouseEvent): void;
  apiRef?: { current: EditorApi | null } | undefined;
}

/* ---------- syntax colours: all from design tokens ---------- */
const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword], color: "var(--color-violet)", fontWeight: "500" },
  { tag: [t.definitionKeyword, t.modifier, t.self, t.null, t.bool], color: "var(--color-electric)" },
  { tag: [t.string, t.special(t.string), t.regexp], color: "var(--color-success)" },
  { tag: [t.number, t.integer, t.float], color: "var(--color-warning)" },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: "var(--color-text-3)", fontStyle: "italic" },
  { tag: [t.typeName, t.className, t.namespace, t.tagName], color: "var(--color-cyan)" },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.macroName], color: "var(--color-ice)" },
  { tag: [t.propertyName, t.attributeName], color: "var(--color-text-2)" },
  { tag: [t.variableName, t.labelName], color: "var(--color-text)" },
  { tag: [t.operator, t.punctuation, t.bracket, t.derefOperator], color: "var(--color-text-2)" },
  { tag: [t.heading], color: "var(--color-electric)", fontWeight: "700" },
  { tag: [t.link, t.url], color: "var(--color-cyan)", textDecoration: "underline" },
  { tag: t.invalid, color: "var(--color-danger)" },
]);

const editorTheme = (s: StudioSettings) =>
  EditorView.theme(
    {
      "&": { height: "100%", fontSize: `${s.fontSize}px`, backgroundColor: "var(--studio-editor)", color: "var(--color-text)" },
      ".cm-scroller": { fontFamily: `"${s.fontFamily}", "JetBrains Mono", ui-monospace, monospace`, lineHeight: String(s.lineHeight) },
      ".cm-content": { caretColor: "var(--color-cyan)", padding: "6px 0" },
      ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--color-cyan)", borderLeftWidth: "2px" },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": { backgroundColor: "color-mix(in oklab, var(--color-electric) 32%, transparent) !important" },
      ".cm-activeLine": { backgroundColor: "color-mix(in oklab, var(--color-electric) 7%, transparent)" },
      ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--color-text)" },
      ".cm-gutters": { backgroundColor: "var(--studio-editor)", color: "var(--color-text-3)", border: "none" },
      ".cm-lineNumbers .cm-gutterElement": { padding: "0 10px 0 4px", minWidth: "36px" },
      ".cm-foldGutter .cm-gutterElement": { color: "var(--color-text-3)", cursor: "pointer" },
      ".cm-matchingBracket": { backgroundColor: "color-mix(in oklab, var(--color-cyan) 22%, transparent)", outline: "1px solid color-mix(in oklab, var(--color-cyan) 55%, transparent)" },
      ".cm-selectionMatch": { backgroundColor: "color-mix(in oklab, var(--color-cyan) 14%, transparent)" },
      ".cm-searchMatch": { backgroundColor: "color-mix(in oklab, var(--color-warning) 28%, transparent)", outline: "1px solid color-mix(in oklab, var(--color-warning) 60%, transparent)" },
      ".cm-searchMatch-selected": { backgroundColor: "color-mix(in oklab, var(--color-warning) 50%, transparent)" },
      ".cm-panels": { backgroundColor: "var(--color-elevated)", color: "var(--color-text)", borderBottom: "1px solid var(--color-line)" },
      ".cm-panels input, .cm-panels button": { fontSize: "12px" },
      ".cm-textfield": { backgroundColor: "var(--color-deep)", border: "1px solid var(--color-line-strong)", color: "var(--color-text)", borderRadius: "4px" },
      ".cm-button": { backgroundImage: "none", backgroundColor: "var(--color-surface)", border: "1px solid var(--color-line)", color: "var(--color-text)", borderRadius: "4px" },
      ".cm-tooltip": { backgroundColor: "var(--color-elevated)", border: "1px solid var(--color-line-strong)", color: "var(--color-text)" },
      ".cm-tooltip-autocomplete > ul > li[aria-selected]": { backgroundColor: "var(--color-surface)", color: "var(--color-text)" },
      ".cm-diagnostic-error": { borderLeftColor: "var(--color-danger)" },
      ".cm-diagnostic-warning": { borderLeftColor: "var(--color-warning)" },
      ".cm-diagnostic-info": { borderLeftColor: "var(--color-cyan)" },
      ".cm-lintRange-error": { backgroundImage: "none", textDecoration: "underline wavy var(--color-danger)", textUnderlineOffset: "3px" },
      ".cm-lintRange-warning": { backgroundImage: "none", textDecoration: "underline wavy var(--color-warning)", textUnderlineOffset: "3px" },
      ".cm-lintRange-info": { backgroundImage: "none", textDecoration: "underline dotted var(--color-cyan)", textUnderlineOffset: "3px" },
      ".cm-bp-gutter .cm-gutterElement": { width: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
      ".cm-bp": { width: "9px", height: "9px", borderRadius: "999px", backgroundColor: "var(--color-danger)", boxShadow: "0 0 6px var(--color-danger)" },
      ".cm-debug-line": { backgroundColor: "color-mix(in oklab, var(--color-warning) 16%, transparent)", boxShadow: "inset 2px 0 0 var(--color-warning)" },
      ".cm-ghost": { color: "var(--color-cyan)", opacity: "0.6", fontStyle: "italic", whiteSpace: "pre", borderBottom: "1px dashed color-mix(in oklab, var(--color-cyan) 50%, transparent)" },
      ".cm-indentation-marker": { opacity: "0.5" },
      ".cm-minimap-gutter": { backgroundColor: "var(--studio-editor)", borderLeft: "1px solid var(--color-line)" },
    },
    { dark: true },
  );

function langExt(l: LanguageId): Extension {
  switch (l) {
    case "typescript": return javascript({ typescript: true });
    case "tsx": return javascript({ typescript: true, jsx: true });
    case "javascript": return javascript({ jsx: true });
    case "json": return json();
    case "python": return python();
    case "php": return php();
    case "css": return css();
    case "markdown": return markdown();
    default: return [];
  }
}

/* ---------- breakpoints, debug line, inline ghost ---------- */
class BpMarker extends GutterMarker {
  override toDOM() {
    const d = document.createElement("span");
    d.className = "cm-bp";
    return d;
  }
}
const bpMarker = new BpMarker();
const setBps = StateEffect.define<number[]>();
const bpField = StateField.define<RangeSet<GutterMarker>>({
  create: () => RangeSet.empty,
  update(v, tr) {
    for (const e of tr.effects)
      if (e.is(setBps)) {
        const doc = tr.state.doc;
        return RangeSet.of(e.value.filter((l) => l >= 1 && l <= doc.lines).map((l) => bpMarker.range(doc.line(l).from)), true);
      }
    return v.map(tr.changes);
  },
});

class GhostWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }
  override eq(o: GhostWidget) {
    return o.text === this.text;
  }
  override toDOM() {
    const s = document.createElement("span");
    s.className = "cm-ghost";
    s.setAttribute("aria-label", "P suggestion");
    s.textContent = this.text;
    return s;
  }
}
const setDeco = StateEffect.define<{ debugLine: number | null; ghost: { pos: number; text: string } | null }>();
const decoField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(v, tr) {
    for (const e of tr.effects)
      if (e.is(setDeco)) {
        const doc = tr.state.doc;
        const ranges = [];
        if (e.value.debugLine && e.value.debugLine <= doc.lines) ranges.push(Decoration.line({ class: "cm-debug-line" }).range(doc.line(e.value.debugLine).from));
        if (e.value.ghost && e.value.ghost.pos <= doc.length) ranges.push(Decoration.widget({ widget: new GhostWidget(e.value.ghost.text), side: 1 }).range(e.value.ghost.pos));
        return Decoration.set(ranges, true);
      }
    return v.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});

const toCM = (state: EditorState, diags: Diagnostic[]): CMDiagnostic[] =>
  diags
    .filter((d) => d.line >= 1 && d.line <= state.doc.lines)
    .map((d) => {
      const line = state.doc.line(d.line);
      const from = Math.min(line.to, line.from + Math.max(0, d.col - 1));
      return { from, to: Math.min(line.to, from + Math.max(1, d.length)), severity: d.severity, message: d.message, source: d.source };
    });

export default function CodeEditor(props: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const comps = useRef({ lang: new Compartment(), ro: new Compartment(), opts: new Compartment(), theme: new Compartment() });

  const optionExt = (s: StudioSettings): Extension[] => [
    s.lineNumbers ? lineNumbers() : [],
    s.folding ? foldGutter({ openText: "▾", closedText: "▸" }) : [],
    s.wordWrap ? EditorView.lineWrapping : [],
    EditorState.tabSize.of(s.tabSize),
    indentUnit.of(s.insertSpaces ? " ".repeat(s.tabSize) : "\t"),
    s.suggestions ? autocompletion() : [],
    s.minimap ? showMinimap.compute(["doc"], () => ({ create: () => ({ dom: document.createElement("div") }), displayText: "blocks", showOverlay: "always" })) : [],
  ];

  // create once per file path
  useEffect(() => {
    if (!host.current) return;
    const c = comps.current;
    const p = latest.current;
    const state = EditorState.create({
      doc: p.content,
      extensions: [
        gutter({
          class: "cm-bp-gutter",
          markers: (v) => v.state.field(bpField),
          initialSpacer: () => bpMarker,
          domEventHandlers: {
            mousedown(v, block) {
              latest.current.onToggleBreakpoint(v.state.doc.lineAt(block.from).number);
              return true;
            },
          },
        }),
        bpField,
        decoField,
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(highlight),
        bracketMatching(),
        closeBrackets(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        indentationMarkers({ thickness: 1, colors: { light: "var(--color-line)", dark: "var(--color-line)", activeLight: "var(--color-line-strong)", activeDark: "var(--color-line-strong)" } }),
        search({ top: true }),
        lintGutter(),
        keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, ...foldKeymap, ...completionKeymap, indentWithTab]),
        c.lang.of(langExt(p.language)),
        c.ro.of(EditorState.readOnly.of(p.readOnly)),
        c.opts.of(optionExt(p.settings)),
        c.theme.of(editorTheme(p.settings)),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) latest.current.onChange(u.state.doc.toString());
          if (u.selectionSet || u.docChanged) {
            const r = u.state.selection.main;
            const line = u.state.doc.lineAt(r.head);
            latest.current.onCursor({ line: line.number, col: r.head - line.from + 1, selection: r.to - r.from, text: u.state.sliceDoc(r.from, r.to), pos: r.head });
          }
        }),
        EditorView.domEventHandlers({
          contextmenu(e) {
            e.preventDefault();
            latest.current.onContextMenu(e);
            return true;
          },
        }),
      ],
    });
    const v = new EditorView({ state, parent: host.current });
    view.current = v;
    v.dispatch({
      effects: [setBps.of(p.breakpoints), setDeco.of({ debugLine: p.debugLine, ghost: p.ghost })],
    });
    v.dispatch(setDiagnostics(v.state, toCM(v.state, p.diagnostics)));
    if (p.apiRef)
      p.apiRef.current = {
        undo: () => undo(v),
        redo: () => redo(v),
        find: () => openSearchPanel(v),
        selectAll: () => v.dispatch({ selection: EditorSelection.single(0, v.state.doc.length) }),
        focus: () => v.focus(),
      };
    return () => {
      v.destroy();
      view.current = null;
      if (p.apiRef) p.apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.path]);

  // external content changes (P edits, discard, replace)
  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== props.content) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: props.content } });
  }, [props.content]);

  useEffect(() => {
    view.current?.dispatch({ effects: comps.current.lang.reconfigure(langExt(props.language)) });
  }, [props.language]);
  useEffect(() => {
    view.current?.dispatch({ effects: comps.current.ro.reconfigure(EditorState.readOnly.of(props.readOnly)) });
  }, [props.readOnly]);
  useEffect(() => {
    view.current?.dispatch({ effects: [comps.current.opts.reconfigure(optionExt(props.settings)), comps.current.theme.reconfigure(editorTheme(props.settings))] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.settings]);
  useEffect(() => {
    const v = view.current;
    if (v) v.dispatch(setDiagnostics(v.state, props.settings.diagnostics ? toCM(v.state, props.diagnostics) : []));
  }, [props.diagnostics, props.settings.diagnostics, props.content]);
  useEffect(() => {
    view.current?.dispatch({ effects: setBps.of(props.breakpoints) });
  }, [props.breakpoints]);
  useEffect(() => {
    view.current?.dispatch({ effects: setDeco.of({ debugLine: props.debugLine, ghost: props.ghost }) });
  }, [props.debugLine, props.ghost]);
  useEffect(() => {
    const v = view.current;
    const j = props.jump;
    if (!v || !j) return;
    const line = v.state.doc.line(Math.min(Math.max(1, j.line), v.state.doc.lines));
    const pos = Math.min(line.to, line.from + Math.max(0, j.col - 1));
    v.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: "center" }) });
    v.focus();
  }, [props.jump]);

  return <div ref={host} className="h-full min-h-0 w-full overflow-hidden" data-testid="code-editor" />;
}
