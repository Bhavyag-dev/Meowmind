# AI Providers — Memory

**Last updated:** 2026-08-17

## Supported Providers

| Provider   | Rust enum      | Base URL                                            | Auth header          | Streaming format |
|------------|----------------|-----------------------------------------------------|----------------------|-----------------|
| OpenAI     | `Openai`       | `https://api.openai.com/v1`                        | `Authorization: Bearer` | OpenAI SSE  |
| Anthropic  | `Anthropic`    | `https://api.anthropic.com/v1`                     | `x-api-key`          | Anthropic SSE   |
| Gemini     | `Gemini`       | `https://generativelanguage.googleapis.com/v1beta` | `Authorization: Bearer` | OpenAI SSE  |
| Grok       | `Grok`         | `https://api.x.ai/v1`                              | `Authorization: Bearer` | OpenAI SSE  |
| Ollama     | `Ollama`       | `http://localhost:11434/v1`                        | None                 | OpenAI SSE      |
| Custom     | `Custom`       | User-configured                                    | Optional Bearer      | OpenAI SSE      |

## Streaming Architecture

- All streaming happens **Rust-side** in `src-tauri/src/commands/ai.rs`
- The renderer calls `stream_chat_message` Tauri command once
- Rust emits Tauri events: `ai://chunk/{requestId}`, `ai://done/{requestId}`, `ai://error/{requestId}`
- Bridge layer (`src/bridge/ai.ts`) subscribes to events via `listen()` and cleans up on done/error
- API keys are fetched from `secure_store.rs` inside the Rust command — never passed from JS

## Key Security Properties

- The raw API key is **never returned** to the renderer — only a masked preview (first 4 + last 4 chars)
- Keys are stored in: macOS Keychain / Windows Credential Manager / Linux secret-service
- Service name in keyring: `com.meowmind.app`
- Provider keyring username: `openai`, `anthropic`, `gemini`, `grok`, `ollama`, `custom`

## Anthropic Differences

Anthropic uses a different endpoint (`/messages`) and a different SSE event schema:
- Event type `content_block_delta` contains `delta.text`
- Requires `anthropic-version: 2023-06-01` header
- Handled in `extract_anthropic_delta()` in `commands/ai.rs`

## Model Lists

Currently static (cached hardcoded list). Future work: add live fetching with 5-min TTL
and store in `tauri-plugin-store` under `model-cache/{provider}`.
