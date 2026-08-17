/**
 * @fileoverview ChatMessage — renders a single chat message bubble.
 */

import React from "react";
import type { Message } from "../shared/types";

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === "user";
  return (
    <div className={`chat-message ${isUser ? "chat-message--user" : "chat-message--assistant"}`}>
      <div className="chat-message__bubble">
        <span className="chat-message__role">{isUser ? "You" : "AI"}</span>
        <p className="chat-message__content">{message.content}</p>
      </div>
    </div>
  );
};

export default ChatMessage;
