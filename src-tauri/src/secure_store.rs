// Meowmind — src-tauri/src/secure_store.rs
//
// Cross-platform secure credential storage.
// Uses macOS Keychain on Apple platforms, Windows Credential Manager on Windows,
// and the system secret service on Linux — all via the `keyring` crate.

use anyhow::{Context, Result};
use keyring::Entry;

const SERVICE: &str = "com.meowmind.app";

/// Store an API key in the OS native secure store.
///
/// `provider` becomes the username portion of the keyring entry,
/// allowing multiple providers to coexist under the same service name.
pub fn save_key(provider: &str, key: &str) -> Result<()> {
    let entry = Entry::new(SERVICE, provider)
        .with_context(|| format!("Failed to create keyring entry for provider '{provider}'"))?;
    entry
        .set_password(key)
        .with_context(|| format!("Failed to save key for provider '{provider}'"))?;
    Ok(())
}

/// Retrieve an API key from the OS native secure store.
///
/// Returns `None` if no key has been saved for this provider yet.
pub fn get_key(provider: &str) -> Result<Option<String>> {
    let entry = Entry::new(SERVICE, provider)
        .with_context(|| format!("Failed to create keyring entry for provider '{provider}'"))?;
    match entry.get_password() {
        Ok(key) => Ok(Some(key)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(anyhow::anyhow!(
            "Keyring error for provider '{provider}': {e}"
        )),
    }
}

/// Delete an API key from the OS native secure store.
pub fn delete_key(provider: &str) -> Result<()> {
    let entry = Entry::new(SERVICE, provider)
        .with_context(|| format!("Failed to create keyring entry for provider '{provider}'"))?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()), // already gone — treat as success
        Err(e) => Err(anyhow::anyhow!(
            "Failed to delete key for provider '{provider}': {e}"
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore = "requires real keyring access — run manually"]
    fn roundtrip_key() {
        let provider = "test-provider";
        let secret = "sk-test-1234";
        save_key(provider, secret).unwrap();
        let retrieved = get_key(provider).unwrap();
        assert_eq!(retrieved, Some(secret.to_string()));
        delete_key(provider).unwrap();
        assert_eq!(get_key(provider).unwrap(), None);
    }
}
