/**
 * @fileoverview CharacterSprite — renders the animated character on a canvas.
 *
 * Plays character states in place (Idle, Walk, Run, Jump, Fall, Combo1, etc.).
 * Window position is controlled solely by user mouse dragging.
 */

import React, { useEffect, useRef } from "react";
import { CharacterStateMachine } from "../animation/stateMachine";
import { loadFrameMap } from "../animation/frameMap";
import { useCharacterStore } from "../store/character";
import { useSettingsStore } from "../store/settings";
import type { CharacterState } from "../shared/types";

interface CharacterSpriteProps {
  /** Desired character state to play. */
  state?: CharacterState;
  /** Rendered size in px (square). Default: 320 */
  size?: number;
  /** Called when a one-shot animation completes. */
  onAnimationComplete?: (state: CharacterState) => void;
}

export const CHARACTER_SKINS = [
  { id: "default",   name: "Classic Blue",     icon: "🔵", filter: "none",                                              color: "#4d7cfe" },
  { id: "crimson",   name: "Crimson Knight",   icon: "🔴", filter: "hue-rotate(140deg) saturate(1.4)",                 color: "#e53935" },
  { id: "emerald",   name: "Emerald Ranger",   icon: "🟢", filter: "hue-rotate(240deg) saturate(1.3)",                 color: "#43a047" },
  { id: "gold",      name: "Golden Paladin",   icon: "🟡", filter: "hue-rotate(185deg) saturate(1.7) brightness(1.1)", color: "#fbc02d" },
  { id: "amethyst",  name: "Amethyst Mystic",  icon: "🟣", filter: "hue-rotate(60deg) saturate(1.4)",                  color: "#8e24aa" },
  { id: "cyber",     name: "Cyber Neon",       icon: "💠", filter: "hue-rotate(320deg) saturate(2.0)",                 color: "#00e5ff" },
  { id: "shadow",    name: "Shadow Assassin",  icon: "⚫", filter: "grayscale(0.8) contrast(1.4) brightness(0.85)",     color: "#37474f" },
] as const;

const CharacterSprite: React.FC<CharacterSpriteProps> = ({
  state = "Idle",
  size = 320,
  onAnimationComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const smRef = useRef<CharacterStateMachine | null>(null);

  const { facingRight } = useCharacterStore();
  const { settings } = useSettingsStore();

  const currentSkin = CHARACTER_SKINS.find((s) => s.id === settings.characterSkin) || CHARACTER_SKINS[0];

  // Initialize state machine on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let alive = true;

    loadFrameMap("/assets/character/").then((frameMap) => {
      if (!alive || !canvas) return;

      const sm = new CharacterStateMachine(canvas, frameMap, "/assets/character/", {
        onComplete: (s) => onAnimationComplete?.(s),
      });
      smRef.current = sm;
      sm.play(state || "Idle");
    }).catch((error) => console.warn("Unable to initialise character animation:", error));

    return () => {
      alive = false;
      smRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to state prop changes
  useEffect(() => {
    if (!smRef.current || !state) return;
    smRef.current.play(state, () => onAnimationComplete?.(state));
  }, [state, onAnimationComplete]);

  return (
    <canvas
      ref={canvasRef}
      width={128}
      height={128}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        imageRendering: "pixelated",
        display: "block",
        filter: currentSkin.filter,
        transform: facingRight ? "scaleX(1)" : "scaleX(-1)",
        transition: "filter 0.3s ease, transform 0.08s linear",
      }}
      aria-label="Meowmind companion character"
    />
  );
};

export default CharacterSprite;
