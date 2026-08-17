/**
 * @fileoverview ReminderList — displays and manages reminders.
 *
 * Parses natural-language time input (e.g. "tomorrow at 3pm",
 * "in 2 hours") using a lightweight parser since we don't have
 * a heavy NLP lib. Falls back to date-time input for precision.
 */

import React, { useState, useCallback } from "react";
import type { Reminder } from "../shared/types";

interface ReminderListProps {
  reminders: Reminder[];
  onAdd: (title: string, fireAt: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Very lightweight natural-language date parser.
 * Returns an ISO datetime string or null if parsing failed.
 */
function parseNaturalTime(input: string): string | null {
  const now = new Date();
  const lower = input.toLowerCase().trim();

  // "in X minutes/hours"
  const inMatch = lower.match(/^in (\d+)\s*(minute|hour|day)s?$/);
  if (inMatch) {
    const n = parseInt(inMatch[1], 10);
    const unit = inMatch[2];
    const ms = unit === "minute" ? n * 60_000 : unit === "hour" ? n * 3_600_000 : n * 86_400_000;
    return new Date(now.getTime() + ms).toISOString();
  }

  // "tomorrow at HH:MM" or "tomorrow at H am/pm"
  const tomorrowMatch = lower.match(/^tomorrow(?:\s+at\s+(.+))?$/);
  if (tomorrowMatch) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    if (tomorrowMatch[1]) {
      const t = parseTimeOfDay(tomorrowMatch[1]);
      if (t) { d.setHours(t.hours, t.minutes, 0, 0); }
    } else {
      d.setHours(9, 0, 0, 0);
    }
    return d.toISOString();
  }

  // "today at HH:MM"
  const todayMatch = lower.match(/^today\s+at\s+(.+)$/);
  if (todayMatch) {
    const t = parseTimeOfDay(todayMatch[1]);
    if (t) {
      const d = new Date(now);
      d.setHours(t.hours, t.minutes, 0, 0);
      return d.toISOString();
    }
  }

  // Try Date.parse as fallback
  const parsed = Date.parse(input);
  return isNaN(parsed) ? null : new Date(parsed).toISOString();
}

function parseTimeOfDay(s: string): { hours: number; minutes: number } | null {
  // "3pm" | "3:30pm" | "15:30" | "3 pm"
  const m = s.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return null;
  let hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2] ?? "0", 10);
  const meridiem = m[3]?.toLowerCase();
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  return { hours, minutes };
}

const ReminderList: React.FC<ReminderListProps> = ({ reminders, onAdd, onDelete }) => {
  const [title, setTitle] = useState("");
  const [timeInput, setTimeInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleAdd = useCallback(() => {
    if (!title.trim()) { setError("Enter a reminder title"); return; }
    const fireAt = parseNaturalTime(timeInput);
    if (!fireAt) { setError('Could not parse time. Try "in 30 minutes" or "tomorrow at 9am"'); return; }
    onAdd(title.trim(), fireAt);
    setTitle("");
    setTimeInput("");
    setError(null);
  }, [title, timeInput, onAdd]);

  return (
    <div className="reminders" id="reminder-list">
      <h3 className="reminders__title">Reminders</h3>

      <div className="reminders__add">
        <input
          id="reminder-title-input"
          className="input"
          placeholder="Reminder title…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          id="reminder-time-input"
          className="input"
          placeholder='Time: "in 2 hours", "tomorrow at 9am"'
          value={timeInput}
          onChange={(e) => setTimeInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        {error && <p className="reminders__error">{error}</p>}
        <button id="reminder-add-btn" className="btn btn--primary" onClick={handleAdd}>
          Add Reminder
        </button>
      </div>

      <ul className="reminders__list">
        {reminders.length === 0 && (
          <li className="reminders__empty">No reminders set</li>
        )}
        {reminders.map((r) => (
          <li key={r.id} className="reminders__item">
            <div>
              <span className="reminders__item-title">{r.title}</span>
              <span className="reminders__item-time">
                {new Date(r.fireAt).toLocaleString()}
              </span>
            </div>
            <button
              id={`reminder-delete-${r.id}`}
              className="btn btn--ghost btn--sm"
              onClick={() => onDelete(r.id)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ReminderList;
export { parseNaturalTime }; // exported for tests
