import React, { useState, useCallback, useEffect, useRef } from "react";
import CharacterSprite from "../../components/CharacterSprite";
import { cli as cliBridge, settings as settingsBridge } from "../../bridge";
import { useSettingsStore } from "../../store/settings";
import type { CharacterState } from "../../shared/types";
import { initialPetReaction, reducePetReaction, type PetReaction } from "../../animation/antigravityPet";

type CompanionActionState = "idle" | "walking" | "running" | "jumping" | "falling" | "action";

const CompanionWindow: React.FC = () => {
  const [actionState, setActionState] = useState<CompanionActionState>("idle");
  const [forcedAnimation, setForcedAnimation] = useState<CharacterState | undefined>("Idle");
  const [isDragging, setIsDragging] = useState(false);
  const [petReaction, setPetReaction] = useState<PetReaction>(() => initialPetReaction());

  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMouseDownRef = useRef(false);
  const dragTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { settings } = useSettingsStore();

  // Ensure window receives mouse/cursor events
  useEffect(() => {
    settingsBridge.toggleClickThrough(false).catch(console.warn);
  }, []);

  // Trigger animation state
  const triggerAction = useCallback((state: CompanionActionState) => {
    setActionState(state);

    switch (state) {
      case "idle":
        setForcedAnimation("Idle");
        break;
      case "walking":
        setForcedAnimation("Walk");
        break;
      case "running":
        setForcedAnimation("Run");
        break;
      case "jumping":
        setForcedAnimation("Jump");
        break;
      case "falling":
        setForcedAnimation("Fall");
        break;
      case "action":
        setForcedAnimation("Combo1");
        break;
    }
  }, []);

  // The native feed contains broad Anti-Gravity phases only, never terminal
  // contents, command arguments, prompts, or file paths.
  useEffect(() => {
    let unlistenStatus: (() => void) | undefined;

    cliBridge.listenToCliActivity((activity) => {
      if (!settings.reactionsEnabled || isDragging) return;
      setPetReaction((current) => {
        const next = reducePetReaction(current, activity);
        if (next !== current) {
          setActionState(
            next.mood === "working" ? "running"
              : next.mood === "thinking" ? "walking"
                : next.mood === "attention" ? "falling"
                  : next.mood === "celebrating" ? "action"
                    : "idle",
          );
          setForcedAnimation(next.animation);
        }
        return next;
      });
    }).then((status) => {
      unlistenStatus = status;
    });

    return () => {
      unlistenStatus?.();
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, [settings.reactionsEnabled, isDragging]);

  // Track user typing in webview / terminal window -> walk in place continuously while typing
  const handleUserActivity = useCallback(() => {
    if (actionState === "running" || actionState === "action" || isDragging) return;
    triggerAction("walking");
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      triggerAction("idle");
    }, 1800);
  }, [actionState, isDragging, triggerAction]);

  useEffect(() => {
    const handleKeyDown = () => handleUserActivity();
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUserActivity]);

  const handleAnimationComplete = useCallback((state: CharacterState) => {
    // A confirmed/inferred task completion gets a short two-part combo. The
    // first hit is triggered by the activity reducer; it never interrupts the
    // continuous Run/Walk/FallLoop states used while work is in progress.
    if (petReaction.mood === "celebrating" && state === "Combo1") {
      setForcedAnimation("Combo1End");
      return;
    }
    if (state === "Combo1End" || state === "Jump" || state === "Fall" || state === "Combo1") {
      if (!isDragging && actionState !== "running") {
        setForcedAnimation("Idle");
        setActionState("idle");
      }
    }
  }, [isDragging, actionState, petReaction.mood]);

  // Pet interaction (Click)
  const handlePet = useCallback(() => {
    triggerAction("jumping");

    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      triggerAction("idle");
    }, 1200);
  }, [triggerAction]);

  // Mouse down: Initiate window drag and "picked up" pet state
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isMouseDownRef.current = true;

    // Call native OS window drag immediately
    settingsBridge.startWindowDrag();

    // If held, show dangling/picked up animation
    dragTimeoutRef.current = setTimeout(() => {
      if (isMouseDownRef.current) {
        setIsDragging(true);
        triggerAction("falling");
      }
    }, 100);
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
    if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
    if (isDragging) {
      setIsDragging(false);
      triggerAction("idle");
    }
  };

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  });

  return (
    <div
      className={`companion-window ${isDragging ? "companion-window--dragging" : ""}`}
      id="companion-window"
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => {
        e.preventDefault();
        settingsBridge.openSettingsWindow().catch(console.warn);
      }}
    >
      {/* Pet Character (Clickable to jump, Draggable to move) */}
      {settings.reactionsEnabled && petReaction.thought && !isDragging && (
        <div className="companion-window__thought-bubble" aria-live="polite">
          {petReaction.thought}
        </div>
      )}
      <div
        className="companion-window__character"
        onClick={() => {
          if (!isDragging) {
            handlePet();
          }
        }}
      >
        <CharacterSprite
          state={forcedAnimation}
          size={320}
          onAnimationComplete={handleAnimationComplete}
        />
      </div>
    </div>
  );
};

export default CompanionWindow;
