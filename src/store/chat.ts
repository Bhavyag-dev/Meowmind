/**
 * @fileoverview Zustand store for chat sessions and messages.
 *
 * Persists to SQLite via tauri-plugin-sql.
 * Streaming state is held in memory only (not persisted).
 */

import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { type Session, type Message, type Provider } from "../shared/types";

interface ChatState {
  sessions: Session[];
  activeSessionId: string | null;
  messages: Message[];
  /** Accumulates streaming tokens for the current AI response. */
  streamingContent: string;
  isStreaming: boolean;

  // Actions
  createSession: (provider: Provider, model: string) => Session;
  setActiveSession: (id: string) => void;
  addMessage: (msg: Omit<Message, "id" | "createdAt">) => Message;
  appendStreamChunk: (delta: string) => void;
  finalizeStream: () => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  streamingContent: "",
  isStreaming: false,

  createSession: (provider, model) => {
    const session: Session = {
      id: uuidv4(),
      title: "New Chat",
      provider,
      model,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((s) => ({ sessions: [...s.sessions, session], activeSessionId: session.id }));
    return session;
  },

  setActiveSession: (id) => set({ activeSessionId: id }),

  addMessage: (msg) => {
    const full: Message = {
      ...msg,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ messages: [...s.messages, full] }));
    return full;
  },

  appendStreamChunk: (delta) =>
    set((s) => ({
      isStreaming: true,
      streamingContent: s.streamingContent + delta,
    })),

  finalizeStream: () => {
    const { streamingContent, activeSessionId, addMessage } = get();
    if (streamingContent.trim()) {
      addMessage({
        sessionId: activeSessionId ?? "default",
        role: "assistant",
        content: streamingContent,
      });
    }
    set({ streamingContent: "", isStreaming: false });
  },

  clearMessages: () => set({ messages: [], streamingContent: "", isStreaming: false }),
}));
