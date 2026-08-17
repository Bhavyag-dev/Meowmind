/**
 * @fileoverview Typed bridge wrappers for reminder commands and events.
 */

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { type Reminder, type ReminderInput } from "../shared/types";
import { ReminderInputSchema } from "../shared/schemas";

/** Create a new reminder. */
export async function createReminder(input: ReminderInput): Promise<Reminder> {
  ReminderInputSchema.parse(input);
  return invoke<Reminder>("create_reminder", { input });
}

/** List all unfired reminders. */
export async function listReminders(): Promise<Reminder[]> {
  return invoke<Reminder[]>("list_reminders");
}

/** Update a reminder's fire_at or fired status. */
export async function updateReminder(
  id: string,
  updates: { fireAt?: string; fired?: boolean }
): Promise<void> {
  return invoke<void>("update_reminder", {
    id,
    fireAt: updates.fireAt ?? null,
    fired: updates.fired ?? null,
  });
}

/** Delete a reminder by ID. */
export async function deleteReminder(id: string): Promise<void> {
  return invoke<void>("delete_reminder", { id });
}

/**
 * Subscribe to reminder events emitted by the Rust scheduler.
 * @returns Unsubscribe function.
 */
export async function onReminderFired(
  callback: (reminder: Reminder) => void
): Promise<() => void> {
  return listen<Reminder>("reminder://fired", (e) => callback(e.payload));
}
