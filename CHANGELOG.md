# Changelog

All notable changes to Meowmind are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-08-17

### Added
- Initial project scaffold: Tauri v2 + React + TypeScript + Vite
- Floating always-on-top companion window (transparent, frameless)
- Separate Settings window
- Animated character sprite using Ozzbit Games "Fantasy Character Animation Action Platformer" (Free)
  - 8 animation states: Idle, Run, Walk, Jump, Fall, FallLoop, Combo1, Combo1End
  - Canvas-based state machine with one-shot and looping support
  - Movement controller (walkTo, runTo, jump) bounded to current monitor
  - Autonomous idle behavior scheduler (30s–3min random events)
- AI chat panel with streaming support
  - Providers: OpenAI, Anthropic, Gemini, Grok, Ollama (local), Custom endpoint
  - Streaming via Tauri events (Rust proxies SSE → frontend events)
  - API keys stored exclusively in OS keychain (macOS Keychain / Windows Credential Manager)
- Pomodoro timer with character reactions (Idle during focus, Walk during break, Combo1 on complete)
- Natural-language reminder input ("in 30 minutes", "tomorrow at 9am")
- Settings window: provider/model selection, API key management, behavior toggles, timer settings
- Credits screen attributing Ozzbit Games per free version license
- SQLite chat persistence schema (tauri-plugin-sql)
- Zod validation on all bridge layer inputs/outputs
- Zustand stores: chat, character, settings
- Unit tests: animation state machine, movement helpers, time parser
- GitHub Actions CI: TypeScript tests (Ubuntu), macOS universal build, Windows x64 build
- AGENTS.md, memory/, skills/, docs/ for AI-agent context durability
