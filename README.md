# Meowmind

A native desktop AI companion app. A floating always-on-top window lives on your desktop
with an animated hero character alongside a chat panel, pomodoro timer, and smart reminders.
All AI API keys are stored in your OS keychain — never in files.

**Platforms:** macOS (Apple Silicon + Intel) · Windows x64  
**Stack:** Tauri v2 · Rust · React · TypeScript · Vite

---

## Quick Start

### Requirements
- Rust 1.75+ (`rustup install stable`)
- Node 20+ + npm
- macOS: Xcode Command Line Tools

### Run locally

```bash
git clone https://github.com/your-org/meowmind
cd meowmind
npm install
npm run tauri dev
```

### Build for distribution

```bash
# macOS (universal — runs on Apple Silicon + Intel)
npm run tauri build -- --target universal-apple-darwin

# Windows (via GitHub Actions CI — see .github/workflows/ci.yml)
```

---

## Features

- **AI Chat** — OpenAI, Anthropic, Gemini, Grok, Ollama (local), custom endpoints
- **Animated companion** — sprite-based hero character reacts to AI state
- **Pomodoro timer** — focus/break cycle with character reactions
- **Smart reminders** — natural-language time input ("in 2 hours", "tomorrow at 9am")
- **Sticky notes** — anchored near the companion window
- **Local-first** — SQLite chat history, no telemetry, no cloud sync

---

## Documentation

| Topic | Link |
|---|---|
| Architecture overview | [`docs/architecture.md`](docs/architecture.md) |
| Animation system | [`docs/animation-system.md`](docs/animation-system.md) |
| AI providers | [`docs/ai-providers.md`](docs/ai-providers.md) |
| Packaging & release | [`docs/packaging-and-release.md`](docs/packaging-and-release.md) |

For AI agents working on this project, see [`AGENTS.md`](AGENTS.md).

---

## Credits

**Character Sprite**  
*Fantasy Character Animation Action Platformer* (Free Version)  
© **Ozzbit Games** — [ozzbit-games.itch.io](https://ozzbit-games.itch.io)  
Free version license: Personal/non-commercial use only. Credit required.

---

## License

MIT — see [LICENSE](LICENSE)
