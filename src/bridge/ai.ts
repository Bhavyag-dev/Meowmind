/**
 * @fileoverview Typed bridge wrapper for AI commands.
 *
 * All Tauri `invoke()` calls live here so the rest of the UI never
 * imports from `@tauri-apps/api` directly. Every input is validated
 * with Zod before crossing the bridge.
 */

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  type Provider,
  type StreamParams,
  type ChunkEvent,
  type DoneEvent,
  type ErrorEvent,
} from "../shared/types";

import { StreamParamsSchema } from "../shared/schemas";
import { v4 as uuidv4 } from "uuid";

/** List available models for a provider. */
export async function listModels(provider: Provider): Promise<string[]> {
  return invoke<string[]>("list_models", { provider });
}

/**
 * Save an API key to the OS secure store.
 * The key is sent directly to Rust — never stored in JS state.
 */
export async function saveApiKey(provider: Provider, key: string): Promise<void> {
  return invoke<void>("save_api_key", { provider, key });
}

/**
 * Check if an API key exists (returns a masked preview string or null).
 * The raw key is NEVER returned to the renderer.
 */
export async function getApiKey(provider: Provider): Promise<string | null> {
  return invoke<string | null>("get_api_key", { provider });
}

/** Remove an API key from the OS secure store. */
export async function deleteApiKey(provider: Provider): Promise<void> {
  return invoke<void>("delete_api_key", { provider });
}

export interface StreamCallbacks {
  onChunk: (delta: string) => void;
  onDone: (usage: DoneEvent["usage"]) => void;
  onError: (message: string) => void;
}

/**
 * Stream a chat message from an AI provider.
 *
 * Fires the `stream_chat_message` command (which proxies to the provider),
 * then subscribes to Tauri events for chunks, done, and errors.
 *
 * @returns A cleanup function that unsubscribes event listeners.
 */
export async function streamMessage(
  params: Omit<StreamParams, "requestId">,
  callbacks: StreamCallbacks
): Promise<() => void> {
  const requestId = uuidv4();
  const fullParams: StreamParams = { ...params, requestId };

  // Validate before sending (catches bugs early)
  StreamParamsSchema.parse(fullParams);

  // Subscribe to events before invoking to avoid missing early chunks
  const unsubChunk = await listen<ChunkEvent>(
    `ai://chunk/${requestId}`,
    (event) => callbacks.onChunk(event.payload.delta)
  );
  const unsubDone = await listen<DoneEvent>(
    `ai://done/${requestId}`,
    (event) => {
      callbacks.onDone(event.payload.usage);
      cleanup();
    }
  );
  const unsubError = await listen<ErrorEvent>(
    `ai://error/${requestId}`,
    (event) => {
      callbacks.onError(event.payload.message);
      cleanup();
    }
  );

  const cleanup = () => {
    unsubChunk();
    unsubDone();
    unsubError();
  };

  // Fire and forget — events drive the response
  invoke("stream_chat_message", { params: fullParams }).catch((e) => {
    callbacks.onError(String(e));
    cleanup();
  });

  return cleanup;
}
