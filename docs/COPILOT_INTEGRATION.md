# Copilot integration guide — Pandatechs Desktop

Goal: connect this front end to the real Pandatechs Linux (XFCE) machine **without changing any screen**.
All screens use the interfaces in `src/lib/pt/types.ts`. Today `src/lib/pt/demo/` answers them with sample
data; you implement `src/lib/pt/native/index.ts` to answer them with real data.

## 1. Ground rules (must hold)

1. Branding: only **Pandatechs / Pandatechs Enterprises / P**. Never display the underlying distribution name or rebrand wording in the UI, docs, boot/login text or assets. `src/test/branding.test.ts` enforces this.
2. Do not edit or falsify system identity files (`/etc/os-release`, `/etc/issue`, kernel strings, package metadata). Branding lives in themes, wallpapers, the desktop shell and this app.
3. Never claim a system change happened unless the bridge verified it (`ActionResult.confirmedByNative`).
4. Every consequential action goes through the approval card (`src/lib/pt/policy.ts`) **and** is re-checked by the bridge.
5. Never store or log passwords, tokens or file contents. Chat history stays in memory.

## 2. Architecture

```
React app (this repo)  ──HTTP/WebSocket──▶  pandatechs-bridge  ──▶  Linux (D-Bus, /proc, nmcli, systemd, polkit…)
        ▲                127.0.0.1:7421      (small local service)
        └── Ollama-compatible model service on 127.0.0.1:11434 (optional)
```

Create `bridge/` (Node/Rust/Python — your choice). Bind **127.0.0.1 only**. Require a random per-session token
written to `$XDG_RUNTIME_DIR/pandatechs/bridge.token` (mode 0600) and sent as `Authorization: Bearer …`.
Restrict CORS to the app's origin.

## 3. Endpoints to implement (map to `native/index.ts`)

| Provider method | Endpoint | Source of truth |
| --- | --- | --- |
| `system.getMetrics` | `GET /v1/system/metrics` | `/proc/stat`, `/proc/meminfo`, `statvfs`, `/proc/uptime`, `/proc/loadavg`. Keep ~48 samples of history server-side. |
| `system.getProcesses` | `GET /v1/system/processes` | `/proc/*/stat` (top 20) |
| `network.getState` | `GET /v1/network/state` | NetworkManager (`nmcli -t`) or `/sys/class/net`, byte counters for rates |
| `network.getConnections` | `GET /v1/network/connections` | `ss -tunap` (own processes only unless permitted) |
| `files.places/list/recent` | `GET /v1/files/*` | XDG user dirs, `readdir`; **allowlist roots** (home, mounted media); resolve symlinks and reject `..` escapes |
| `launcher.listApps` | `GET /v1/apps` | parse `/usr/share/applications/*.desktop`; map `Categories=` to `AppCategory`; set `installed: true` |
| `launcher.launchNative` | `POST /v1/apps/launch` | `gio launch` / `gtk-launch` for a `.desktop` id from the list only |
| `windows.listWindows` | `GET /v1/windows` | `wmctrl -lx` / libwnck |
| `security.firewall/events/updates` | `GET /v1/security/*` | `nft`/`ufw status`, `journalctl -p warning`, `apt list --upgradable` (read-only) |
| `notifications.list` | `GET /v1/notifications` | D-Bus notification daemon history |
| `bridge.execute` | `POST /v1/actions` | see §6 |

Return the same shapes as `types.ts` wrapped as `{ source: "live", data, updatedAt }`. On failure return
`{ source: "error", data: null, error }` — the UI shows an honest error state.

Then in Settings → System choose **Native**, or set `mode: "native"` as the default in `src/lib/pt/store.ts`.

## 4. Applications

Native apps in `data.ts` have `installed: "unknown"`; the bridge must confirm. Do **not** assume any tool exists.
Category mapping for the sidebar/launcher is in `components/pt/shell/Overlays.tsx` (`CATEGORY_LABEL`).

## 5. Terminal

`TerminalSession` currently runs the in-memory demo shell (`src/lib/pt/shell.ts`). In native mode it shows
"Terminal needs the native bridge". Implement a PTY: `WS /v1/pty` (spawn the user's login shell via `node-pty`
or `forkpty`), render with **xterm.js** inside `TerminalSession` for `mode === "native"`. Resize via control messages.
The terminal is the user's own shell: no allowlist, but never run it as root.

## 6. Actions and approvals

`src/lib/pt/policy.ts` is the allowlist. Flow:

1. P (or a screen) returns an `ActionProposal` `{ operation, title, target, detail }`.
2. UI shows `ApprovalCard` with exact command/target. User approves or declines.
3. UI calls `bridge.execute(proposal)` → `POST /v1/actions`.
4. Bridge **re-validates**: operation in allowlist, target inside allowed roots, no shell string interpolation
   (use argv arrays), elevation only via **polkit** (`pkexec`) with its own prompt. Return `confirmedByNative: true`
   only after verifying (e.g. `stat` the new folder).

Never implement: arbitrary shell passthrough from P, silent `sudo`, deleting outside the user's home, or
changes to boot loader, login manager or authentication without a separate explicit user flow.
Security tools (`run_security_tool`) require a target and a stated authorisation from the user; run only
against hosts the user owns or is permitted to test; log scope and time.

## 7. P's brain (conversation)

Default engine: **P Brain (Lovable AI)** — `src/lib/pt/brain.ts` (client) → `POST /api/p-chat` →
`src/lib/p/p-chat.server.ts`. P's personality (calm, witty AI butler; talks about anything; short spoken replies)
lives in the `persona()` prompt there. P can only *propose* actions through the `propose_action` tool;
`src/lib/p/proposal.ts` re-validates every proposal against `policy.ts` before the UI shows the approval card.
The client sends a short system snapshot (numbers only, never file contents) for context.

Offline option: **Local model (Ollama)** in `src/lib/pt/native/ollama.ts` (Settings → P Assistant). To make it
propose actions, add JSON tool calls matching `ProposalDraft` and pass them through `sanitizeProposal`.

## 8. P in motion, voice and lip sync

- Voice out: `src/lib/pt/voice.ts` streams natural speech from `POST /api/p-speech` (Lovable AI, 24 kHz PCM),
  falling back to the browser voice. Toggle: Settings → *P speaks replies* (on by default).
- Voice in: the mic button in P's chat uses the browser's speech recognition (Chrome/Edge). For the native
  build, replace `listen()` with a local engine (e.g. whisper.cpp) and keep the `listening` state.
- Motion: `PHologram.tsx` cross-fades `p-idle` and `p-talking` loops; the talking loop runs while P replies or
  speaks. For exact lip sync, drive a viseme rig from the TTS timings over `p-hologram.webp`. Respect *Reduce motion*.
- Wake word ("Hey P") is not included; add it natively (e.g. openWakeWord) and call `listen()` on trigger.

## 9. Boot, login and welcome

`/boot-preview`, `/login-preview` and `/welcome` are **previews**. They do not authenticate. Real branding of the
machine:
- Boot splash: Plymouth theme using `panda-mascot.webp` + `pandatechs-wordmark.webp` on `#020813`.
- Login screen: LightDM greeter theme (slick-greeter/web-greeter) with the same artwork; authentication stays PAM.
- Wallpapers: `wallpaper-panda.webp`, set with `xfconf-query -c xfce4-desktop`.
- Panel/theme: XFCE panel profile, GTK theme with the palette in `src/styles.css` (`--pt-*` tokens).
Ship these as an installable package (`pandatechs-branding`), not by editing identity files.

## 10. Location Center (consent-based sharing)

Already working end to end on Lovable Cloud; no native bridge work is required.
- Owner signs in with a real account (email/password or Google) inside the Location Center window. All requests and positions are private to that account (row-level security on `location_requests` and `location_pings`).
- A request creates a 64-character random link `/locate/<token>`. The owner sends it by text message (`sms:` link), shares it during a phone call, or copies it.
- The phone owner opens the link, reads who is asking, and taps **Allow and share**. The browser then asks for location permission. Positions are sent at most every 4 seconds while the page stays open (`src/lib/location/share.functions.ts`); the person can stop or decline at any time, and the owner can stop or delete the request.
- A phone number or a phone call never reveals a location. Do not add carrier lookups, silent tracking or anything that collects position without the person's explicit consent.
- Background sharing (page closed) needs a separate companion phone app with OS location permission and a visible stop control. Not part of this build.
- Rules live in `src/lib/location/rules.ts` and are covered by `src/test/location-rules.test.ts`.

## 11. Acceptance checklist

- [ ] Every panel shows **Live** (not Sample) in native mode; failures show *Not connected* / *Error*.
- [ ] Opening an app from the launcher starts the real app; the UI never says "opened" before the bridge confirms.
- [ ] Declining an approval changes nothing; approving shows the bridge's real message.
- [ ] Files cannot escape allowed roots; symlink and `..` tests pass.
- [ ] No secrets in logs; bridge listens on loopback only with token auth.
- [ ] Works at 1920×1080, 1600×900, 1366×768; `bun run test` and `bun run build` pass.
