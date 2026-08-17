/**
 * @fileoverview ChatPanel — the AI chat interface inside the companion window.
 *
 * Handles:
 * - Message history display
 * - Input + send
 * - Streaming token display
 * - Embedded Pomodoro timer
 * - Reminder manager
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import ChatMessage from "../../components/ChatMessage";
import PomodoroTimer from "../../components/PomodoroTimer";
import ReminderList from "../../components/ReminderList";
import { useChatStore } from "../../store/chat";
import { useSettingsStore } from "../../store/settings";
import { streamMessage } from "../../bridge/ai";
import { openSettingsWindow, startWindowDrag } from "../../bridge/settings";
import type { CharacterState, Reminder } from "../../shared/types";

interface ChatPanelProps {
  onClose: () => void;
  onStreaming: (active: boolean) => void;
  onResponse: () => void;
  onTriggerAnimation?: (state: CharacterState) => void;
}

const ALL_ANIMATIONS: { id: CharacterState; label: string; icon: string }[] = [
  { id: "Idle",        label: "Idle",         icon: "🧘" },
  { id: "Walk",        label: "Walk",         icon: "🚶" },
  { id: "Run",         label: "Run",          icon: "🏃" },
  { id: "Jump",        label: "Jump",         icon: "🦘" },
  { id: "Fall",        label: "Fall",         icon: "🍂" },
  { id: "Combo1End",   label: "Combo 1 End",  icon: "⚔️" },
];

const ChatPanel: React.FC<ChatPanelProps> = ({
  onClose,
  onStreaming,
  onResponse,
  onTriggerAnimation,
}) => {
  const {
    messages,
    streamingContent,
    isStreaming,
    addMessage,
    appendStreamChunk,
    finalizeStream,
    createSession,
    activeSessionId,
  } = useChatStore();

  const { settings } = useSettingsStore();
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "timer" | "reminders">("chat");
  const [remindersList, setRemindersList] = useState<Reminder[]>([
    { id: "1", title: "Take a break & stretch", fireAt: new Date(Date.now() + 3600000).toISOString(), fired: false, createdAt: new Date().toISOString() },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animate while typing changes
  const handleInputChange = (val: string) => {
    setInput(val);
    if (!isStreaming) {
      onTriggerAnimation?.("Walk");
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        onTriggerAnimation?.("Idle");
      }, 1500);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      const session = createSession(settings.provider, settings.model);
      sessionId = session.id;
    }

    const userMsg = addMessage({
      sessionId,
      role: "user",
      content: input.trim(),
    });

    setInput("");
    onStreaming(true);

    const history = [...messages, userMsg].map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    try {
      cleanupRef.current = await streamMessage(
        {
          provider: settings.provider,
          model: settings.model,
          messages: history,
        },
        {
          onChunk: (delta) => appendStreamChunk(delta),
          onDone: () => {
            finalizeStream();
            onStreaming(false);
            onResponse();
          },
          onError: (msg) => {
            addMessage({ sessionId: sessionId!, role: "assistant", content: `Error: ${msg}` });
            onStreaming(false);
          },
        }
      );
    } catch (e) {
      addMessage({ sessionId: sessionId!, role: "assistant", content: `Error: ${e}` });
      onStreaming(false);
    }
  }, [input, isStreaming, messages, settings, activeSessionId, addMessage, appendStreamChunk, finalizeStream, createSession, onStreaming, onResponse]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-panel" id="chat-panel">
      {/* Header */}
      <div
        className="chat-panel__header"
        data-tauri-drag-region
        onMouseDown={(e) => {
          if (e.button === 0 && (e.target as HTMLElement).tagName !== "BUTTON") {
            startWindowDrag();
          }
        }}
      >
        <div className="chat-panel__tabs" data-tauri-drag-region>
          <button
            id="tab-chat"
            className={`tab ${activeTab === "chat" ? "tab--active" : ""}`}
            onClick={() => setActiveTab("chat")}
          >
            Chat
          </button>
          <button
            id="tab-timer"
            className={`tab ${activeTab === "timer" ? "tab--active" : ""}`}
            onClick={() => setActiveTab("timer")}
          >
            Timer
          </button>
          <button
            id="tab-reminders"
            className={`tab ${activeTab === "reminders" ? "tab--active" : ""}`}
            onClick={() => setActiveTab("reminders")}
          >
            Reminders
          </button>
        </div>
        <div className="chat-panel__actions">
          <button
            id="settings-btn"
            className="btn btn--ghost btn--icon"
            onClick={() => openSettingsWindow()}
            title="Settings"
          >
            ⚙️
          </button>
          <button
            id="close-panel-btn"
            className="btn btn--ghost btn--icon"
            onClick={onClose}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* Chat tab */}
      {activeTab === "chat" && (
        <>
          <div className="chat-panel__messages" id="messages-container">
            {messages.length === 0 && (
              <div className="chat-panel__empty">
                <p>👋 Hi! I'm Meowmind.</p>
                <p>Ask me anything or use the Timer and Reminders tabs.</p>
              </div>
            )}
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isStreaming && streamingContent && (
              <div className="chat-message chat-message--assistant chat-message--streaming">
                <div className="chat-message__bubble">
                  <span className="chat-message__role">AI</span>
                  <p className="chat-message__content">{streamingContent}<span className="chat-cursor">▌</span></p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Animation Tester Bar */}
          <div className="chat-panel__anim-bar">
            <span className="anim-bar-title">Animate:</span>
            {ALL_ANIMATIONS.map((anim) => (
              <button
                key={anim.id}
                className="btn-anim-pill"
                onClick={() => onTriggerAnimation?.(anim.id)}
                title={`Trigger ${anim.label}`}
              >
                {anim.icon} {anim.label}
              </button>
            ))}
          </div>

          <div className="chat-panel__input">
            <textarea
              id="chat-input"
              className="chat-panel__textarea"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything… (Enter to send)"
              rows={2}
              disabled={isStreaming}
            />
            <button
              id="send-btn"
              className="btn btn--primary chat-panel__send"
              onClick={handleSend}
              disabled={isStreaming || !input.trim()}
            >
              {isStreaming ? "…" : "Send"}
            </button>
          </div>
        </>
      )}

      {/* Timer tab */}
      {activeTab === "timer" && (
        <div className="chat-panel__tab-content">
          <PomodoroTimer />
        </div>
      )}

      {/* Reminders tab */}
      {activeTab === "reminders" && (
        <div className="chat-panel__tab-content">
          <ReminderList
            reminders={remindersList}
            onAdd={(title, fireAt) => {
              setRemindersList([
                ...remindersList,
                { id: Date.now().toString(), title, fireAt, fired: false, createdAt: new Date().toISOString() },
              ]);
            }}
            onDelete={(id) => {
              setRemindersList(remindersList.filter((r) => r.id !== id));
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ChatPanel;
