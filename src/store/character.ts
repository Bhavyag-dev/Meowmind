/**
 * @fileoverview Zustand store for character animation state and position.
 *
 * The CharacterSprite component reads from this store to know what
 * animation to play and where to render.
 */

import { create } from "zustand";
import { type CharacterState } from "../shared/types";

interface CharacterState_ {
  animationState: CharacterState;
  posX: number;
  posY: number;
  facingRight: boolean;

  // Actions
  setAnimation: (state: CharacterState) => void;
  setPosition: (x: number, y: number) => void;
  setFacing: (right: boolean) => void;
}

export const useCharacterStore = create<CharacterState_>((set) => ({
  animationState: "Idle",
  posX: 100,
  posY: 400, // bottom of screen by default
  facingRight: true,

  setAnimation: (animationState) => set({ animationState }),
  setPosition: (posX, posY) => set({ posX, posY }),
  setFacing: (facingRight) => set({ facingRight }),
}));
