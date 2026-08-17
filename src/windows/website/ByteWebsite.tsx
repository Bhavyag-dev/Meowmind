/**
 * @fileoverview ByteWebsite — Accessible web preview and activity simulator for Byte.
 *
 * Features:
 * - Displays Byte's identity, role, and description in the Meow Minds project.
 * - Dynamically loads frame-map.json and sprite sheets from /assets/character/.
 * - Previews all animation presets using CharacterStateMachine: Idle, Walk, Run, Jump, Fall, FallLoop, Combo1, Combo1End.
 * - Handles immediate playback, loopable states, and auto-return to Idle for one-shot states.
 * - Displays animation metadata (name, frame count, FPS, loop, one-shot).
 * - Anti-Gravity CLI Activity Simulator:
 *   - User typing/browsing → Walk
 *   - Anti-Gravity coding → Run
 *   - Awaiting confirmed approval → FallLoop
 *   - Task completed → Combo1 → Combo1End → Idle
 *   - No active activity → Idle
 * - Accessible: keyboard-operable, aria-live status, visible active states, respects prefers-reduced-motion.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { loadFrameMap } from "../../animation/frameMap";
import { CharacterStateMachine } from "../../animation/stateMachine";
import type { FrameMap } from "../../shared/schemas";
import { type CharacterState, ONE_SHOT_STATES } from "../../shared/types";

export const ANIMATION_PRESETS: CharacterState[] = [
  "Idle",
  "Walk",
  "Run",
  "Jump",
  "Fall",
  "FallLoop",
  "Combo1",
  "Combo1End",
];

export type SimulatedActivity =
  | "none"
  | "typing"
  | "coding"
  | "awaiting_approval"
  | "task_completed";

export interface ActivityDefinition {
  id: SimulatedActivity;
  label: string;
  description: string;
  targetState: CharacterState | "sequence";
}

export const SIMULATED_ACTIVITIES: ActivityDefinition[] = [
  {
    id: "none",
    label: "No Active Activity",
    description: "Byte rests in place waiting for terminal or CLI tasks.",
    targetState: "Idle",
  },
  {
    id: "typing",
    label: "User Typing / Browsing",
    description: "Byte walks in place while you type in terminal or browse code.",
    targetState: "Walk",
  },
  {
    id: "coding",
    label: "Anti-Gravity Coding",
    description: "Byte runs energetically in place while Anti-Gravity CLI generates code.",
    targetState: "Run",
  },
  {
    id: "awaiting_approval",
    label: "Awaiting Confirmed Approval",
    description: "Byte floats/dangles in place waiting for confirmation to proceed.",
    targetState: "FallLoop",
  },
  {
    id: "task_completed",
    label: "Task Completed",
    description: "Byte executes a victory slash (Combo1), spin (Combo1End), and returns to Idle.",
    targetState: "sequence",
  },
];

interface ByteWebsiteProps {
  baseAssetPath?: string;
}

export const ByteWebsite: React.FC<ByteWebsiteProps> = ({
  baseAssetPath = "/assets/character/",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const smRef = useRef<CharacterStateMachine | null>(null);

  const [frameMap, setFrameMap] = useState<FrameMap | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentState, setCurrentState] = useState<CharacterState>("Idle");
  const [selectedPreset, setSelectedPreset] = useState<CharacterState>("Idle");
  const [currentActivity, setCurrentActivity] = useState<SimulatedActivity>("none");
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("Byte is currently Idle.");

  // Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Load frame-map.json dynamically
  useEffect(() => {
    let isMounted = true;

    loadFrameMap(baseAssetPath)
      .then((map) => {
        if (!isMounted) return;
        setFrameMap(map);
      })
      .catch((err) => {
        if (!isMounted) return;
        setLoadError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      isMounted = false;
    };
  }, [baseAssetPath]);

  // Handle one-shot animation completion
  const handleAnimationComplete = useCallback((completedState: CharacterState) => {
    // When one-shot state completes, update active state back to Idle
    if (ONE_SHOT_STATES.includes(completedState)) {
      setCurrentState("Idle");
      setStatusMessage(`Byte completed ${completedState} and returned to Idle.`);
    }
  }, []);

  // Initialize CharacterStateMachine on canvas when frameMap is loaded
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frameMap) return;

    const sm = new CharacterStateMachine(canvas, frameMap, baseAssetPath, {
      onComplete: (state) => {
        handleAnimationComplete(state);
      },
    });

    smRef.current = sm;
    sm.play(currentState);

    if (isReducedMotion) {
      sm.pause();
    }

    return () => {
      sm.destroy();
      smRef.current = null;
    };
  }, [frameMap, baseAssetPath, handleAnimationComplete, isReducedMotion]);

  // Play a specific animation state directly
  const playAnimation = useCallback(
    (state: CharacterState, onDone?: () => void, customStatus?: string) => {
      if (!smRef.current) return;
      setCurrentState(state);
      setSelectedPreset(state);

      if (ONE_SHOT_STATES.includes(state)) {
        setStatusMessage(customStatus || `Playing one-shot animation: ${state} (will return to Idle).`);
        smRef.current.play(state, () => {
          if (onDone) {
            onDone();
          } else {
            setCurrentState("Idle");
            setSelectedPreset("Idle");
            setStatusMessage(`Completed ${state}. Returned to Idle.`);
            smRef.current?.play("Idle");
          }
        });
      } else {
        setStatusMessage(customStatus || `Playing looping animation: ${state}.`);
        smRef.current.play(state);
      }

      if (isReducedMotion) {
        smRef.current.pause();
      }
    },
    [isReducedMotion]
  );

  // Trigger manual preset selection
  const handleSelectPreset = (preset: CharacterState) => {
    setCurrentActivity("none");
    playAnimation(preset);
  };

  // Trigger simulated Anti-Gravity CLI activities
  const handleSimulateActivity = (activity: SimulatedActivity) => {
    setCurrentActivity(activity);

    switch (activity) {
      case "none":
        playAnimation("Idle", undefined, "Activity Simulator: No active activity → Idle.");
        break;

      case "typing":
        playAnimation("Walk", undefined, "Activity Simulator: User typing/browsing → Walk.");
        break;

      case "coding":
        playAnimation("Run", undefined, "Activity Simulator: Anti-Gravity coding → Run.");
        break;

      case "awaiting_approval":
        playAnimation("FallLoop", undefined, "Activity Simulator: Anti-Gravity awaiting confirmed approval → FallLoop.");
        break;

      case "task_completed":
        setStatusMessage("Activity Simulator: Task completed → Combo1 → Combo1End → Idle.");
        setCurrentState("Combo1");
        setSelectedPreset("Combo1");
        // Sequence: Combo1 -> Combo1End -> Idle
        if (smRef.current) {
          smRef.current.play("Combo1", () => {
            setCurrentState("Combo1End");
            setSelectedPreset("Combo1End");
            setStatusMessage("Activity Simulator: Task completed → Playing Combo1End.");
            smRef.current?.play("Combo1End", () => {
              setCurrentState("Idle");
              setSelectedPreset("Idle");
              setStatusMessage("Activity Simulator: Task completed → Sequence finished, returned to Idle.");
              smRef.current?.play("Idle");
            });
          });
        }
        break;
    }
  };

  const selectedMeta = frameMap?.states[currentState] ?? null;

  return (
    <div className="byte-website" style={{ maxWidth: "800px", margin: "0 auto", padding: "24px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Header & Character Description */}
      <header style={{ marginBottom: "24px", borderBottom: "1px solid #ccc", paddingBottom: "16px" }}>
        <h1 style={{ margin: "0 0 8px 0" }}>Byte</h1>
        <p style={{ margin: 0, fontSize: "16px", color: "#444" }}>
          Byte is an animated AI companion for the Anti-Gravity CLI in the Meow Minds project.
          Byte provides real-time in-place visual feedback as you interact with terminal tools and AI coding workflows.
        </p>
      </header>

      {/* Accessible Live Status Region */}
      <div
        role="status"
        aria-live="polite"
        style={{
          background: "#f0f4f8",
          border: "1px solid #d0d7de",
          padding: "10px 14px",
          borderRadius: "6px",
          marginBottom: "20px",
          fontSize: "14px",
          color: "#1f2328",
        }}
      >
        <strong>Current Status:</strong> {statusMessage}
      </div>

      {loadError && (
        <div
          role="alert"
          style={{ background: "#ffebe9", border: "1px solid #ff8182", color: "#cf222e", padding: "12px", borderRadius: "6px", marginBottom: "20px" }}
        >
          <strong>Error loading frame map:</strong> {loadError}
        </div>
      )}

      {/* Character Preview Stage */}
      <section aria-labelledby="preview-heading" style={{ marginBottom: "24px" }}>
        <h2 id="preview-heading" style={{ fontSize: "18px", marginBottom: "12px" }}>
          Character Animation Preview
        </h2>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#161b22",
            border: "1px solid #30363d",
            borderRadius: "8px",
            padding: "24px",
            minHeight: "340px",
          }}
        >
          <canvas
            ref={canvasRef}
            width={128}
            height={128}
            style={{
              width: "256px",
              height: "256px",
              imageRendering: "pixelated",
              display: "block",
            }}
            aria-label={`Byte character animation preview displaying ${currentState} state`}
          />

          <div style={{ marginTop: "12px", color: "#e6edf3", fontSize: "14px", textAlign: "center" }}>
            State: <strong>{currentState}</strong> {ONE_SHOT_STATES.includes(currentState) ? "(One-Shot)" : "(Looping)"}
          </div>
        </div>
      </section>

      {/* Animation Preset Controls */}
      <section aria-labelledby="presets-heading" style={{ marginBottom: "24px" }}>
        <h2 id="presets-heading" style={{ fontSize: "18px", marginBottom: "8px" }}>
          Animation Presets
        </h2>
        <p style={{ fontSize: "14px", color: "#555", marginBottom: "12px" }}>
          Select any available animation preset. Loopable animations loop indefinitely; one-shot animations auto-return to Idle on completion.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {ANIMATION_PRESETS.map((preset) => {
            const isSelected = selectedPreset === preset;
            const isOneShot = ONE_SHOT_STATES.includes(preset);

            return (
              <button
                key={preset}
                type="button"
                aria-pressed={isSelected}
                onClick={() => handleSelectPreset(preset)}
                style={{
                  padding: "8px 14px",
                  fontSize: "14px",
                  fontWeight: isSelected ? "bold" : "normal",
                  background: isSelected ? "#0969da" : "#f6f8fa",
                  color: isSelected ? "#ffffff" : "#24292f",
                  border: isSelected ? "1px solid #0969da" : "1px solid #d0d7de",
                  borderRadius: "6px",
                  cursor: "pointer",
                  outline: isSelected ? "2px solid #0969da" : "none",
                }}
              >
                {preset} {isOneShot ? "⏱" : "🔁"}
              </button>
            );
          })}
        </div>
      </section>

      {/* Selected Animation Metadata Display */}
      <section aria-labelledby="metadata-heading" style={{ marginBottom: "24px" }}>
        <h2 id="metadata-heading" style={{ fontSize: "18px", marginBottom: "8px" }}>
          Animation Metadata
        </h2>

        {selectedMeta ? (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #d0d7de",
              fontSize: "14px",
            }}
          >
            <tbody>
              <tr style={{ borderBottom: "1px solid #d0d7de" }}>
                <th style={{ textAlign: "left", padding: "8px 12px", background: "#f6f8fa", width: "40%" }}>Animation Name</th>
                <td style={{ padding: "8px 12px" }}>{currentState}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #d0d7de" }}>
                <th style={{ textAlign: "left", padding: "8px 12px", background: "#f6f8fa" }}>Frame Count</th>
                <td style={{ padding: "8px 12px" }}>{selectedMeta.frameCount} frames</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #d0d7de" }}>
                <th style={{ textAlign: "left", padding: "8px 12px", background: "#f6f8fa" }}>Frames Per Second (FPS)</th>
                <td style={{ padding: "8px 12px" }}>{selectedMeta.fps} fps</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #d0d7de" }}>
                <th style={{ textAlign: "left", padding: "8px 12px", background: "#f6f8fa" }}>Loops</th>
                <td style={{ padding: "8px 12px" }}>{selectedMeta.loop ? "Yes" : "No"}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #d0d7de" }}>
                <th style={{ textAlign: "left", padding: "8px 12px", background: "#f6f8fa" }}>Is One-Shot</th>
                <td style={{ padding: "8px 12px" }}>{selectedMeta.oneShot ? "Yes" : "No"}</td>
              </tr>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 12px", background: "#f6f8fa" }}>Sprite Sheet Path</th>
                <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>/assets/character/{selectedMeta.sheet}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p style={{ color: "#666", fontSize: "14px" }}>Loading metadata...</p>
        )}
      </section>

      {/* Anti-Gravity CLI Activity Simulator */}
      <section aria-labelledby="simulator-heading" style={{ marginBottom: "24px" }}>
        <h2 id="simulator-heading" style={{ fontSize: "18px", marginBottom: "8px" }}>
          Anti-Gravity CLI Activity Simulator
        </h2>
        <p style={{ fontSize: "14px", color: "#555", marginBottom: "12px" }}>
          Preview how Byte reacts to Anti-Gravity CLI workflow states in real-time.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {SIMULATED_ACTIVITIES.map((activity) => {
            const isActive = currentActivity === activity.id;

            return (
              <div
                key={activity.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: isActive ? "#ddf4ff" : "#f6f8fa",
                  border: isActive ? "1px solid #0969da" : "1px solid #d0d7de",
                  borderRadius: "6px",
                }}
              >
                <div>
                  <div style={{ fontWeight: "600", fontSize: "14px", color: "#1f2328" }}>{activity.label}</div>
                  <div style={{ fontSize: "13px", color: "#57609a" }}>{activity.description}</div>
                </div>

                <button
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => handleSimulateActivity(activity.id)}
                  style={{
                    padding: "6px 12px",
                    fontSize: "13px",
                    fontWeight: "500",
                    background: isActive ? "#0969da" : "#ffffff",
                    color: isActive ? "#ffffff" : "#1f2328",
                    border: "1px solid #d0d7de",
                    borderRadius: "6px",
                    cursor: "pointer",
                    marginLeft: "12px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isActive ? "Simulating" : "Simulate"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Accessibility & Motion Preferences */}
      <footer style={{ borderTop: "1px solid #d0d7de", paddingTop: "16px", fontSize: "13px", color: "#666" }}>
        <p style={{ margin: "0 0 4px 0" }}>
          <strong>Motion Setting:</strong> {isReducedMotion ? "Reduced motion active (animations paused)." : "Standard motion active."}
        </p>
        <p style={{ margin: 0 }}>
          All controls are fully keyboard-navigable and adhere to WCAG accessibility guidelines.
        </p>
      </footer>
    </div>
  );
};

export default ByteWebsite;
