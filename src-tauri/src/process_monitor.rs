/**
 * Privacy-safe Anti-Gravity CLI activity monitor.
 *
 * This observes only process liveness, CPU activity, and the modification time
 * of Anti-Gravity's local history file. Terminal text, command arguments,
 * prompts, file paths, and error output never cross the native/UI boundary.
 */
use serde::{Deserialize, Serialize};
use std::process::Command;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CliActivityEvent {
    pub detected: bool,
    pub process_name: String,
    pub phase: String,
    pub confidence: String,
    pub observed_at: u64,
    pub history_updated: bool,
}

const POLL_INTERVAL: Duration = Duration::from_millis(750);
// A CLI's agent work is often I/O-bound; its parent process can show only a
// trace of CPU while a search/tool runs. Treat any sustained non-trivial work
// as coding, while a quiet open prompt remains user interaction.
const WORKING_CPU_THRESHOLD: f32 = 0.02;
const CODING_GRACE: Duration = Duration::from_secs(4);

struct MonitorState {
    previous_history_modified: Option<SystemTime>,
    coding_until: Option<Instant>,
    previous_phase: String,
}

impl Default for MonitorState {
    fn default() -> Self {
        Self {
            previous_history_modified: None,
            coding_until: None,
            previous_phase: "inactive".to_string(),
        }
    }
}

/// Starts a monitor dedicated to Anti-Gravity. Other coding CLIs are never
/// detected, so the pet represents only the tool the user selected.
pub fn start_monitor(app_handle: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut state = MonitorState::default();

        loop {
            tokio::time::sleep(POLL_INTERVAL).await;
            let history_updated = antigravity_history_changed(&mut state.previous_history_modified);
            let activity = check_antigravity_activity(history_updated, &mut state);
            let _ = app_handle.emit("cli://status", &activity);
        }
    });
}

/// Checks history metadata only. Reading its contents could expose prompts or
/// project information to the companion UI.
fn antigravity_history_changed(previous: &mut Option<SystemTime>) -> bool {
    let Some(home) = std::env::var_os("HOME") else {
        return false;
    };
    let history_path = std::path::Path::new(&home).join(".gemini/antigravity-cli/history.jsonl");
    let Ok(modified) = std::fs::metadata(history_path).and_then(|metadata| metadata.modified())
    else {
        return false;
    };

    let changed = previous.is_some_and(|last_seen| modified > last_seen);
    *previous = Some(modified);
    changed
}

fn check_antigravity_activity(history_updated: bool, state: &mut MonitorState) -> CliActivityEvent {
    let cpu = antigravity_process_cpu();
    let now = Instant::now();
    if history_updated {
        // History updates happen once the user submits a request. Keep Run
        // through the initial hand-off even when the CLI immediately waits on
        // a child search/tool process.
        state.coding_until = Some(now + CODING_GRACE);
    }

    let (detected, phase) = match cpu {
        Some(cpu) if cpu > WORKING_CPU_THRESHOLD => {
            state.coding_until = Some(now + CODING_GRACE);
            (true, "coding")
        }
        // Keep the running loop through brief I/O-bound pauses instead of
        // flickering from Run to Fall between tool calls.
        Some(_) if state.coding_until.is_some_and(|until| now < until) => (true, "coding"),
        // A process monitor cannot distinguish “task is complete” from “the
        // agent needs approval.” Do not guess: a quiet CLI remains an ordinary
        // prompt, and approval animation is reserved for an explicit future
        // Anti-Gravity integration event.
        Some(_) => (true, "interacting"),
        // A direct agent-process exit is the only inferred completion signal.
        None if state.previous_phase == "coding" => (false, "completed"),
        None => (false, "inactive"),
    };
    state.previous_phase = phase.to_string();

    CliActivityEvent {
        detected,
        process_name: if detected {
            "Anti-Gravity CLI".to_string()
        } else {
            String::new()
        },
        phase: phase.to_string(),
        confidence: "inferred".to_string(),
        observed_at: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64,
        history_updated,
    }
}

fn antigravity_process_cpu() -> Option<f32> {
    #[cfg(target_os = "macos")]
    {
        let output = Command::new("ps")
            .args(["-A", "-o", "%cpu=,command="])
            .output()
            .ok()?;
        let text = String::from_utf8_lossy(&output.stdout);

        text.lines()
            .filter_map(parse_process_line)
            .filter(|(_, command)| is_antigravity_command(command))
            .map(|(cpu, _)| cpu)
            .max_by(f32::total_cmp)
    }

    #[cfg(not(target_os = "macos"))]
    {
        None
    }
}

fn parse_process_line(line: &str) -> Option<(f32, &str)> {
    let trimmed = line.trim_start();
    let split_at = trimmed.find(char::is_whitespace)?;
    let cpu = trimmed[..split_at].parse::<f32>().ok()?;
    Some((cpu, trimmed[split_at..].trim_start()))
}

fn is_antigravity_command(command: &str) -> bool {
    let lower = command.to_ascii_lowercase();
    !lower.contains("antigravity ide.app")
        && (lower.contains("antigravity") || lower.contains("/agy") || lower.starts_with("agy "))
}
