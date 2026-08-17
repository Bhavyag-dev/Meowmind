/**
 * @fileoverview Typed bridge wrappers for sticky note commands.
 */

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { type Note, type NoteInput } from "../shared/types";
import { NoteInputSchema } from "../shared/schemas";

/** Fetch all sticky notes. */
export async function getNotes(): Promise<Note[]> {
  return invoke<Note[]>("get_notes");
}

/** Create or update a sticky note. */
export async function saveNote(input: NoteInput): Promise<Note> {
  NoteInputSchema.parse(input);
  return invoke<Note>("save_note", { input });
}

/** Delete a sticky note by ID. */
export async function deleteNote(id: string): Promise<void> {
  return invoke<void>("delete_note", { id });
}

/** Subscribe to note sync events (for multi-window consistency). */
export async function onNoteSaved(callback: (note: Note) => void): Promise<() => void> {
  return listen<Note>("note://saved", (e) => callback(e.payload));
}

/** Subscribe to note deletion events. */
export async function onNoteDeleted(callback: (id: string) => void): Promise<() => void> {
  return listen<{ id: string }>("note://deleted", (e) => callback(e.payload.id));
}
