# Skill: Add a New AI Provider

> Use when adding a new LLM provider (e.g. Cohere, Mistral, etc.)

## Steps

### 1. Add the provider to the Rust enum

In `src-tauri/src/commands/ai.rs`, add to `Provider`:
```rust
pub enum Provider {
    ...
    Cohere,
}
```

Add its `base_url()` and `keyring_name()` match arms:
```rust
Provider::Cohere => "https://api.cohere.ai/v1",
// keyring_name:
Provider::Cohere => "cohere",
```

Add a model list in `list_models()`.

If the provider uses a non-OpenAI streaming format, add an extraction branch
in `do_stream()` similar to `extract_anthropic_delta()`.

### 2. Add to the TypeScript union type

In `src/shared/types.ts`:
```typescript
export type Provider = ... | "cohere";
```

In `src/shared/schemas.ts`, add to `ProviderSchema`:
```typescript
export const ProviderSchema = z.enum([..., "cohere"]);
```

### 3. Add to the Settings UI

In `src/windows/settings/SettingsWindow.tsx`, add to `PROVIDERS`:
```tsx
{ id: "cohere", label: "Cohere" },
```

### 4. Update memory/ai-providers.md

Add a row to the provider table.

### 5. Run tests

```bash
npm run type-check
cd src-tauri && cargo check
```
