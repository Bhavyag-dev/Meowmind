// Meowmind — src-tauri/src/commands/ai.rs
//
// All AI-related Tauri commands. API keys never leave the Rust process —
// the renderer only sends provider names and message content.
//
// Streaming is implemented by emitting Tauri events (one per chunk) rather
// than returning a single large payload, so the UI can display tokens as
// they arrive.

use crate::secure_store;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

/// Supported AI provider identifiers.
///
/// The string values are used as keyring usernames and as discriminants
/// in the Settings UI — keep them stable.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Provider {
    Openai,
    Anthropic,
    Gemini,
    Grok,
    Ollama,
    Custom,
}

impl Provider {
    /// Default base URL for each provider.
    pub fn base_url(&self) -> &'static str {
        match self {
            Provider::Openai => "https://api.openai.com/v1",
            Provider::Anthropic => "https://api.anthropic.com/v1",
            Provider::Gemini => "https://generativelanguage.googleapis.com/v1beta",
            Provider::Grok => "https://api.x.ai/v1",
            Provider::Ollama => "http://localhost:11434/v1",
            Provider::Custom => "",
        }
    }

    /// Keyring username key (stable identifier stored in OS secure store).
    pub fn keyring_name(&self) -> &'static str {
        match self {
            Provider::Openai => "openai",
            Provider::Anthropic => "anthropic",
            Provider::Gemini => "gemini",
            Provider::Grok => "grok",
            Provider::Ollama => "ollama",
            Provider::Custom => "custom",
        }
    }
}

/// A single chat message in the conversation history.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String, // "user" | "assistant" | "system"
    pub content: String,
}

/// Parameters for a streaming chat request.
#[derive(Debug, Deserialize)]
pub struct StreamParams {
    pub provider: Provider,
    pub model: String,
    /// Custom base URL — only used when `provider` is `Custom`.
    pub custom_url: Option<String>,
    pub messages: Vec<ChatMessage>,
    /// Unique ID emitted back with each event so the UI can correlate chunks.
    pub request_id: String,
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/// List available models for a provider.
///
/// Returns a cached static list; future work can add live fetching with TTL.
#[tauri::command]
pub async fn list_models(provider: Provider) -> Result<Vec<String>, String> {
    let models = match provider {
        Provider::Openai => vec![
            "gpt-4o".into(),
            "gpt-4o-mini".into(),
            "gpt-4-turbo".into(),
            "gpt-3.5-turbo".into(),
        ],
        Provider::Anthropic => vec![
            "claude-opus-4-5".into(),
            "claude-sonnet-4-5".into(),
            "claude-haiku-3-5".into(),
        ],
        Provider::Gemini => vec![
            "gemini-2.0-flash".into(),
            "gemini-1.5-pro".into(),
            "gemini-1.5-flash".into(),
        ],
        Provider::Grok => vec!["grok-2".into(), "grok-2-mini".into()],
        Provider::Ollama => vec![
            "llama3.2".into(),
            "mistral".into(),
            "codellama".into(),
            "phi3".into(),
        ],
        Provider::Custom => vec!["default".into()],
    };
    Ok(models)
}

/// Save an API key to the OS native secure store (Keychain / Credential Manager).
///
/// The key never touches the renderer's memory after this call.
#[tauri::command]
pub fn save_api_key(provider: Provider, key: String) -> Result<(), String> {
    secure_store::save_key(provider.keyring_name(), &key).map_err(|e| e.to_string())
}

/// Check whether an API key exists for a provider (returns masked string or None).
#[tauri::command]
pub fn get_api_key(provider: Provider) -> Result<Option<String>, String> {
    let raw = secure_store::get_key(provider.keyring_name()).map_err(|e| e.to_string())?;
    // Return only a masked preview so the renderer knows a key is set without exposing it
    Ok(raw.map(|k| {
        if k.len() > 8 {
            format!("{}…{}", &k[..4], &k[k.len() - 4..])
        } else {
            "••••••••".to_string()
        }
    }))
}

/// Remove an API key from the OS secure store.
#[tauri::command]
pub fn delete_api_key(provider: Provider) -> Result<(), String> {
    secure_store::delete_key(provider.keyring_name()).map_err(|e| e.to_string())
}

/// Stream a chat message from the configured AI provider.
///
/// Emits one Tauri event per token chunk:
/// - `ai://chunk/{request_id}` — `{ delta: string }`
/// - `ai://done/{request_id}`  — `{ usage: { prompt_tokens, completion_tokens } }`
/// - `ai://error/{request_id}` — `{ message: string }`
///
/// The renderer's bridge layer subscribes to these events and streams them
/// into the chat store.
#[tauri::command]
pub async fn stream_chat_message(app: AppHandle, params: StreamParams) -> Result<(), String> {
    let api_key = match params.provider {
        Provider::Ollama => None,
        ref p => secure_store::get_key(p.keyring_name()).map_err(|e| e.to_string())?,
    };

    let base_url = match params.provider {
        Provider::Custom => params.custom_url.clone().unwrap_or_default(),
        ref p => p.base_url().to_string(),
    };

    let result = do_stream(&app, &params, api_key.as_deref(), &base_url).await;
    if let Err(e) = result {
        let _ = app.emit(
            &format!("ai://error/{}", params.request_id),
            serde_json::json!({ "message": e }),
        );
    }
    Ok(())
}

/// Internal streaming implementation (OpenAI-compatible SSE format).
///
/// Anthropic and Gemini use slightly different formats — handled by
/// provider-specific branches below.
async fn do_stream(
    app: &AppHandle,
    params: &StreamParams,
    api_key: Option<&str>,
    base_url: &str,
) -> Result<(), String> {
    let client = reqwest::Client::new();

    // Build OpenAI-compatible request body (works for OpenAI, Grok, Ollama, Custom)
    let body = serde_json::json!({
        "model": params.model,
        "messages": params.messages,
        "stream": true,
    });

    let mut req = client
        .post(format!("{base_url}/chat/completions"))
        .header("Content-Type", "application/json");

    if let Some(key) = api_key {
        req = req.header("Authorization", format!("Bearer {key}"));
    }

    // Anthropic requires a different endpoint + header
    let (req, anthropic_mode) = match params.provider {
        Provider::Anthropic => {
            let r = client
                .post(format!("{base_url}/messages"))
                .header("Content-Type", "application/json")
                .header("anthropic-version", "2023-06-01")
                .header("x-api-key", api_key.unwrap_or(""))
                .json(&serde_json::json!({
                    "model": params.model,
                    "max_tokens": 4096,
                    "messages": params.messages,
                    "stream": true,
                }));
            (r, true)
        }
        _ => (req.json(&body), false),
    };

    let resp = req.send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("Provider returned {status}: {text}"));
    }

    let mut stream = resp.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk) = stream.next().await {
        let bytes = chunk.map_err(|e| e.to_string())?;
        let text = String::from_utf8_lossy(&bytes);
        buffer.push_str(&text);

        // Process complete SSE lines
        while let Some(newline_pos) = buffer.find('\n') {
            let line = buffer[..newline_pos].trim().to_string();
            buffer = buffer[newline_pos + 1..].to_string();

            if line.is_empty() || line == "data: [DONE]" {
                continue;
            }

            if let Some(data) = line.strip_prefix("data: ") {
                let delta = if anthropic_mode {
                    extract_anthropic_delta(data)
                } else {
                    extract_openai_delta(data)
                };

                if let Some(token) = delta {
                    if !token.is_empty() {
                        let _ = app.emit(
                            &format!("ai://chunk/{}", params.request_id),
                            serde_json::json!({ "delta": token }),
                        );
                    }
                }
            }
        }
    }

    let _ = app.emit(
        &format!("ai://done/{}", params.request_id),
        serde_json::json!({ "usage": null }),
    );

    Ok(())
}

fn extract_openai_delta(data: &str) -> Option<String> {
    let v: serde_json::Value = serde_json::from_str(data).ok()?;
    v["choices"][0]["delta"]["content"]
        .as_str()
        .map(|s| s.to_string())
}

fn extract_anthropic_delta(data: &str) -> Option<String> {
    let v: serde_json::Value = serde_json::from_str(data).ok()?;
    if v["type"] == "content_block_delta" {
        v["delta"]["text"].as_str().map(|s| s.to_string())
    } else {
        None
    }
}
