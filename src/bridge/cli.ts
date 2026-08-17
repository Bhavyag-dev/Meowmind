/** Native CLI activity event bridge. */

import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { AntigravityActivityEventSchema } from "../shared/schemas";
import type { AntigravityActivityEvent } from "../shared/types";

export async function listenToCliActivity(
  onStatus: (activity: AntigravityActivityEvent) => void,
): Promise<UnlistenFn> {
  return listen<unknown>("cli://status", (event) => {
    const parsed = AntigravityActivityEventSchema.safeParse(event.payload);
    if (!parsed.success) {
      console.warn("Ignoring invalid Anti-Gravity activity event", parsed.error);
      return;
    }
    onStatus(parsed.data);
  });
}
