<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Pandatechs Desktop — architecture rules

- UI talks only to the `Integration` interfaces in `src/lib/pt/types.ts`; demo data lives only in `src/lib/pt/demo/`, the native bridge in `src/lib/pt/native/`. Why: Copilot swaps implementations without touching screens.
- The demo/native switch is the single `mode` value in `src/lib/pt/store.ts`; components never branch on it. Why: one place to flip.
- Every action that P or a screen asks the system to perform must be listed in `src/lib/pt/policy.ts` and pass the approval card. Why: no silent system changes.
- `confirmedByNative: true` is only set when the native bridge verified the effect. Why: never claim a fake success.
- Apps are routes under the pathless `_shell` layout (`src/routes/_shell.*.tsx`) and render inside `AppWindow`. Why: shared top bar, dock and overlays.
- Desktop layout renders inside `Stage` (logical canvas ≥ 1600×900, scaled to the screen). Why: identical composition at 1366×768 through 1920×1080.
- Colours, gradients, motion live as tokens/utilities in `src/styles.css`; components use semantic classes only.
- `src/test/branding.test.ts` must stay green: only Pandatechs branding in code, docs and assets.
- P's AI calls (chat `/api/p-chat`, voice `/api/p-speech`) run only in `src/lib/p/*.server.ts`; model proposals pass `sanitizeProposal` before reaching the UI. Why: keys stay on the server and the model can never trigger an unlisted action.
- Location sharing is consent-only: positions are written solely by the token-checked server functions in `src/lib/location/share.functions.ts` after the phone owner taps Allow; owner data is read through RLS as the signed-in user. Why: no location is ever collected without the person's explicit consent.
