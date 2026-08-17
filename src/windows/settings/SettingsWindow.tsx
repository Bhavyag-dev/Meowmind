/**
 * @fileoverview SettingsWindow — full-page settings UI.
 *
 * Sections:
 *   - AI Provider + Model
 *   - API Key management (masked, stored in OS keychain)
 *   - Character behavior toggles
 *   - Pomodoro durations
 *   - Credits / About
 */

import React, { useState, useEffect, useCallback } from "react";
import { useSettingsStore } from "../../store/settings";
import { saveApiKey, getApiKey, deleteApiKey, listModels } from "../../bridge/ai";
import { saveSettings } from "../../bridge/settings";
import type { Provider } from "../../shared/types";

const PROVIDERS: { id: Provider; label: string }[] = [
  { id: "openai",    label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "gemini",    label: "Google Gemini" },
  { id: "grok",      label: "Grok (xAI)" },
  { id: "ollama",    label: "Ollama (Local)" },
  { id: "custom",    label: "Custom Endpoint" },
];

const SettingsWindow: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const [models, setModels] = useState<string[]>([]);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [savedKeyMask, setSavedKeyMask] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [activeSection, setActiveSection] = useState<"ai" | "behavior" | "timer" | "credits">("ai");

  // Load model list and key mask when provider changes
  useEffect(() => {
    listModels(settings.provider).then(setModels).catch(console.warn);
    getApiKey(settings.provider).then(setSavedKeyMask).catch(console.warn);
  }, [settings.provider]);

  const handleSaveKey = useCallback(async () => {
    if (!apiKeyInput.trim()) return;
    await saveApiKey(settings.provider, apiKeyInput.trim());
    setApiKeyInput("");
    const mask = await getApiKey(settings.provider);
    setSavedKeyMask(mask);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  }, [settings.provider, apiKeyInput]);

  const handleDeleteKey = useCallback(async () => {
    await deleteApiKey(settings.provider);
    setSavedKeyMask(null);
  }, [settings.provider]);

  const handleSettingsSave = useCallback(async () => {
    try {
      await saveSettings(settings);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
    setTimeout(() => setSaveStatus("idle"), 2000);
  }, [settings]);

  return (
    <div className="settings" id="settings-window">
      <aside className="settings__sidebar">
        <div className="settings__logo">⚡ Meowmind</div>
        <nav className="settings__nav">
          {[
            { id: "ai",       label: "🤖 AI Provider" },
            { id: "behavior", label: "🎭 Character" },
            { id: "timer",    label: "⏱ Timer" },
            { id: "credits",  label: "📜 Credits" },
          ].map(({ id, label }) => (
            <button
              key={id}
              id={`settings-nav-${id}`}
              className={`settings__nav-item ${activeSection === id ? "settings__nav-item--active" : ""}`}
              onClick={() => setActiveSection(id as typeof activeSection)}
            >
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="settings__main">
        {/* AI Provider section */}
        {activeSection === "ai" && (
          <section className="settings__section" id="section-ai">
            <h2>AI Provider</h2>

            <div className="form-group">
              <label className="form-label" htmlFor="provider-select">Provider</label>
              <select
                id="provider-select"
                className="select"
                value={settings.provider}
                onChange={(e) => updateSettings({ provider: e.target.value as Provider })}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>

            {settings.provider === "custom" && (
              <div className="form-group">
                <label className="form-label" htmlFor="custom-url">Custom Base URL</label>
                <input
                  id="custom-url"
                  className="input"
                  placeholder="https://your-endpoint.com/v1"
                  value={settings.customUrl ?? ""}
                  onChange={(e) => updateSettings({ customUrl: e.target.value })}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="model-select">Model</label>
              <select
                id="model-select"
                className="select"
                value={settings.model}
                onChange={(e) => updateSettings({ model: e.target.value })}
              >
                {models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="api-key-input">
                API Key
                {savedKeyMask && (
                  <span className="badge badge--success">Saved: {savedKeyMask}</span>
                )}
              </label>
              <div className="input-row">
                <input
                  id="api-key-input"
                  type="password"
                  className="input"
                  placeholder="Paste API key…"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  autoComplete="off"
                />
                <button id="save-key-btn" className="btn btn--primary" onClick={handleSaveKey}>
                  Save to Keychain
                </button>
                {savedKeyMask && (
                  <button id="delete-key-btn" className="btn btn--danger btn--sm" onClick={handleDeleteKey}>
                    Remove
                  </button>
                )}
              </div>
              <p className="form-hint">
                Keys are stored in {navigator.platform.includes("Mac") ? "macOS Keychain" : "Windows Credential Manager"} — never in files or memory.
              </p>
            </div>
          </section>
        )}

        {/* Character behavior & appearance section */}
        {activeSection === "behavior" && (
          <section className="settings__section" id="section-behavior">
            <h2>Character & Appearance</h2>

            <div className="form-group">
              <label className="form-label">Character Outfit / Color Theme</label>
              <div className="skin-grid">
                {[
                  { id: "default",   name: "Classic Blue",     icon: "🔵", color: "#4d7cfe" },
                  { id: "crimson",   name: "Crimson Knight",   icon: "🔴", color: "#e53935" },
                  { id: "emerald",   name: "Emerald Ranger",   icon: "🟢", color: "#43a047" },
                  { id: "gold",      name: "Golden Paladin",   icon: "🟡", color: "#fbc02d" },
                  { id: "amethyst",  name: "Amethyst Mystic",  icon: "🟣", color: "#8e24aa" },
                  { id: "cyber",     name: "Cyber Neon",       icon: "💠", color: "#00e5ff" },
                  { id: "shadow",    name: "Shadow Assassin",  icon: "⚫", color: "#37474f" },
                ].map((skin) => (
                  <button
                    key={skin.id}
                    type="button"
                    className={`skin-card ${(settings.characterSkin || "default") === skin.id ? "skin-card--active" : ""}`}
                    onClick={() => updateSettings({ characterSkin: skin.id })}
                  >
                    <span className="skin-color-dot" style={{ backgroundColor: skin.color }} />
                    <span className="skin-name">{skin.icon} {skin.name}</span>
                  </button>
                ))}
              </div>
              <p className="form-hint">Changes the character's clothing and armor color in real-time.</p>
            </div>

            <div className="form-group">
              <label className="toggle-label" htmlFor="toggle-movement">
                <span>Move During CLI Activity</span>
                <input
                  id="toggle-movement"
                  type="checkbox"
                  className="toggle"
                  checked={settings.autonomousMovement}
                  onChange={(e) => updateSettings({ autonomousMovement: e.target.checked })}
                />
              </label>
              <p className="form-hint">Character moves only while a supported CLI is actively working.</p>
            </div>

            <div className="form-group">
              <label className="toggle-label" htmlFor="toggle-reactions">
                <span>AI Reaction Animations</span>
                <input
                  id="toggle-reactions"
                  type="checkbox"
                  className="toggle"
                  checked={settings.reactionsEnabled}
                  onChange={(e) => updateSettings({ reactionsEnabled: e.target.checked })}
                />
              </label>
              <p className="form-hint">Character reacts visually when the AI or CLI is generating or responds.</p>
            </div>
          </section>
        )}

        {/* Timer section */}
        {activeSection === "timer" && (
          <section className="settings__section" id="section-timer">
            <h2>Pomodoro Timer</h2>

            <div className="form-group">
              <label className="form-label" htmlFor="focus-minutes">Focus Duration (minutes)</label>
              <input
                id="focus-minutes"
                type="number"
                className="input input--narrow"
                min={1} max={120}
                value={settings.pomodoroFocusMinutes}
                onChange={(e) => updateSettings({ pomodoroFocusMinutes: parseInt(e.target.value, 10) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="break-minutes">Break Duration (minutes)</label>
              <input
                id="break-minutes"
                type="number"
                className="input input--narrow"
                min={1} max={60}
                value={settings.pomodoroBreakMinutes}
                onChange={(e) => updateSettings({ pomodoroBreakMinutes: parseInt(e.target.value, 10) })}
              />
            </div>
          </section>
        )}

        {/* Credits section */}
        {activeSection === "credits" && (
          <section className="settings__section" id="section-credits">
            <h2>Credits & Licenses</h2>

            <div className="credits-card">
              <h3>Character Sprite</h3>
              <p><strong>Fantasy Character Animation Action Platformer</strong></p>
              <p>© <strong>Ozzbit Games</strong></p>
              <p>Free version: Personal/non-commercial use only.</p>
              <a href="https://ozzbit-games.itch.io" target="_blank" rel="noreferrer" className="link">
                ozzbit-games.itch.io
              </a>
            </div>

            <div className="credits-card">
              <h3>Built With</h3>
              <ul>
                <li>Tauri v2 (MIT)</li>
                <li>React + TypeScript (MIT)</li>
                <li>Vite (MIT)</li>
                <li>Zustand (MIT)</li>
                <li>Zod (MIT)</li>
              </ul>
            </div>

            <div className="credits-card">
              <h3>About Meowmind</h3>
              <p>Version 0.1.0</p>
              <p>An AI companion desktop app. Local-first, no telemetry.</p>
            </div>
          </section>
        )}

        {/* Save button */}
        {activeSection !== "credits" && (
          <div className="settings__footer">
            <button id="save-settings-btn" className="btn btn--primary" onClick={handleSettingsSave}>
              {saveStatus === "saved" ? "✓ Saved" : saveStatus === "error" ? "Error" : "Save Settings"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default SettingsWindow;
