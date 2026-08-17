# Skill: Cut a Release

> Follow this procedure every time a new version is released.

## Pre-flight

- [ ] All tests pass: `npm run test && cd src-tauri && cargo test`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] `CHANGELOG.md` `[Unreleased]` section is up to date

## Steps

### 1. Bump the version

Edit **two** files:
- `src-tauri/Cargo.toml` → `version = "0.X.0"`
- `src-tauri/tauri.conf.json` → `"version": "0.X.0"`

### 2. Update CHANGELOG.md

Move `[Unreleased]` entries under a new `[0.X.0] - YYYY-MM-DD` section.

### 3. Commit

```bash
git add src-tauri/Cargo.toml src-tauri/tauri.conf.json CHANGELOG.md
git commit -m "chore: release v0.X.0"
```

### 4. Tag

```bash
git tag v0.X.0
git push origin main --tags
```

### 5. GitHub Release

- Go to GitHub → Releases → "Draft a new release"
- Select tag `v0.X.0`
- Copy CHANGELOG section as release notes
- Publish — CI will attach `.dmg`, `.exe`, and `.msi` artifacts automatically

### 6. Verify

- Download the macOS `.dmg` and test locally
- Check that the Windows artifacts are attached (even if not testable locally)
