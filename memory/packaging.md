# Packaging & Release — Memory

**Last updated:** 2026-08-17

## Build Targets

| Platform | Target triple                    | Output            |
|----------|----------------------------------|-------------------|
| macOS    | `universal-apple-darwin`         | `.dmg`            |
| Windows  | `x86_64-pc-windows-msvc`         | NSIS `.exe` + `.msi` |

## macOS Universal Build

```bash
npm run tauri build -- --target universal-apple-darwin
```

Requires both Rust targets installed:
```bash
rustup target add aarch64-apple-darwin x86_64-apple-darwin
```

Output: `src-tauri/target/universal-apple-darwin/release/bundle/dmg/`

## Windows Build

Done on GitHub Actions `windows-latest` runner only (no cross-compilation from macOS).
Local Windows testing requires a Windows machine or VM.

## Code Signing (CI)

Two GitHub Actions secrets required:
- `TAURI_SIGNING_PRIVATE_KEY` — base64-encoded PEM
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — passphrase

Generate with: `npm run tauri signer generate`

## Minimum OS Versions

- macOS: 11.0 (Big Sur) — set in `tauri.conf.json` `bundle.macOS.minimumSystemVersion`
- Windows: Windows 10 x64 (Tauri v2 default)

## Release Checklist

1. Update `CHANGELOG.md` under `[Unreleased]`
2. Bump version in `src-tauri/Cargo.toml` and `tauri.conf.json`
3. Tag `git tag v0.x.0`
4. Push — CI builds both platforms and attaches artifacts to the GitHub release

See `skills/cut-a-release.md` for the full step-by-step procedure.
