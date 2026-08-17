/**
 * @fileoverview PomodoroTimer — focus/break timer with character reactions.
 *
 * States:
 *   idle → focus → break → focus → ...
 *
 * Character plays:
 *   - Idle during focus blocks
 *   - Walk (slow) during breaks
 *   - Combo1 + Combo1End when a session completes
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSettingsStore } from "../store/settings";
import { useCharacterStore } from "../store/character";

type TimerPhase = "idle" | "focus" | "break";

interface PomodoroTimerProps {
  onCharacterReaction?: (state: string) => void;
}

const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ onCharacterReaction }) => {
  const { settings } = useSettingsStore();
  const { setAnimation } = useCharacterStore();

  const [phase, setPhase] = useState<TimerPhase>("idle");
  const [secondsLeft, setSecondsLeft] = useState(settings.pomodoroFocusMinutes * 60);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const startFocus = useCallback(() => {
    setPhase("focus");
    setSecondsLeft(settings.pomodoroFocusMinutes * 60);
    setAnimation("Idle");
    onCharacterReaction?.("Idle");
  }, [settings.pomodoroFocusMinutes, setAnimation, onCharacterReaction]);

  const startBreak = useCallback(() => {
    setPhase("break");
    setSecondsLeft(settings.pomodoroBreakMinutes * 60);
    setAnimation("Walk");
    onCharacterReaction?.("Walk");
  }, [settings.pomodoroBreakMinutes, setAnimation, onCharacterReaction]);

  const stop = useCallback(() => {
    setPhase("idle");
    setSecondsLeft(settings.pomodoroFocusMinutes * 60);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setAnimation("Idle");
  }, [settings.pomodoroFocusMinutes, setAnimation]);

  useEffect(() => {
    if (phase === "idle") {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (phase === "focus") {
            setSessions((s) => s + 1);
            // Play victory animation then go to break
            setAnimation("Combo1");
            onCharacterReaction?.("Combo1");
            setTimeout(() => startBreak(), 1500);
          } else {
            startFocus();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [phase, startFocus, startBreak, setAnimation, onCharacterReaction]);

  return (
    <div className="pomodoro" id="pomodoro-timer">
      <div className="pomodoro__header">
        <span className="pomodoro__phase">{phase === "idle" ? "Pomodoro" : phase === "focus" ? "🎯 Focus" : "☕ Break"}</span>
        <span className="pomodoro__sessions">{sessions} sessions</span>
      </div>
      <div className="pomodoro__time">{formatTime(secondsLeft)}</div>
      <div className="pomodoro__controls">
        {phase === "idle" && (
          <button className="btn btn--primary" id="pomodoro-start" onClick={startFocus}>
            Start Focus
          </button>
        )}
        {phase !== "idle" && (
          <button className="btn btn--danger" id="pomodoro-stop" onClick={stop}>
            Stop
          </button>
        )}
      </div>
    </div>
  );
};

export default PomodoroTimer;
