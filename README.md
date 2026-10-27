# Pandatechs Desktop

**Pandatechs Enterprises** — *Built for professionals. Designed for excellence.*

A complete, branded desktop experience with **P — Personal AI**, built as a React + TypeScript
front end that GitHub Copilot connects to the real Linux (XFCE) machine.

## What's inside

| Screen | Route | What it does |
| --- | --- | --- |
| Startup | `/boot-preview` | Branded startup animation, skip button, then sign-in |
| Sign-in | `/login-preview` | Visual preview only (no password is checked or stored) |
| Welcome | `/welcome` | First-run tour with P |
| Desktop | `/desktop` | Category sidebar, shortcuts, terminal, monitor, network, recent files, windows, connections, Ask P bar |
| P — Personal AI | `/assistant` | Talk or type about anything; witty, natural voice; moving hologram; approvals; system overview, terminal, logs, code, shortcuts |
| Terminal | `/terminal` | Safe demo shell (`help`, `ls`, `cd`, `cat`, `pt-info`, `explain`, `p <question>` …) |
| Files | `/files` | Places, icon/list views, details pane, Pandatechs folder icon family |
| Editor | `/editor` | Tabs, syntax colours, find, terminal panel, Ask P |
| Notes | `/notes` | Markdown notes with live preview |
| System Monitor | `/monitor` | Rings, CPU/memory/disk graphs, processes |
| Network Center | `/network` | Interfaces, traffic, connections |
| Security Center | `/security` | Firewall, updates, events (changes need approval) |
| Applications | `/applications` | Every app by category |
| Workspaces | `/workspaces` | Projects and tasks |
| Settings | `/settings` | Accent, wallpaper, motion, P engine/model/voice, privacy, demo/native |

Global: top panel (apps menu, workspaces, search, Wi-Fi, Bluetooth, quick settings, notifications, P, clock),
centred dock, command palette (**Ctrl K**), floating P panel (**Alt P**), toasts.

## Run

```bash
bun install      # or npm install
bun run dev      # http://localhost:8080
bun run test     # policy + branding checks
bun run build
```

## Demo vs native

Everything starts in **Demo** mode: every number is sample data and is marked **Sample**.
Settings → System → **Native** switches every screen to the native bridge; until Copilot connects it,
panels show **Not connected** instead of pretending.

Read **[docs/COPILOT_INTEGRATION.md](docs/COPILOT_INTEGRATION.md)** before connecting anything.

## Brand assets (`src/assets`)

- `pandatechs-wordmark.webp` — logo, transparent
- `panda-emblem.webp` — round panda badge (also `public/favicon.png`)
- `panda-mascot.webp` — hooded panda mascot, transparent
- `wallpaper-panda.webp`, `login-network.webp` — wallpapers
- `p-hologram.webp`, `p-avatar.webp` — P still image and face
- `p-idle.mp4`, `p-talking.mp4` (CDN pointers `.asset.json`) — P motion loops
