# Plan: Monorepo Maintenance (#22)

## Problem

The examples are partially set up as workspace packages but have two issues:

1. **OTel deps are in the wrong place.** All `@opentelemetry/*` and `@effect/opentelemetry` packages are root `devDependencies`. The examples rely on these at runtime, but they're only resolvable because of hoisting — not because the examples declare them.

2. **Shared OTel helper is a loose file, not a module.** Both `examples/basic` and `examples/browser` import `../../shared/nodeTelemetry.ts` via a fragile relative path. `examples/shared/` isn't a workspace package and has no `package.json`.

3. **Empty `packages/spotify-effect/src/otel/` directory** exists but serves no purpose.

## Proposed Changes

### 1. Move OTel deps from root into the examples that use them

Remove from root `package.json` devDependencies:

- `@effect/opentelemetry`
- `@opentelemetry/api`
- `@opentelemetry/exporter-trace-otlp-http`
- `@opentelemetry/resources`
- `@opentelemetry/sdk-logs`
- `@opentelemetry/sdk-metrics`
- `@opentelemetry/sdk-trace-base`
- `@opentelemetry/sdk-trace-node`
- `@opentelemetry/sdk-trace-web`
- `@opentelemetry/semantic-conventions`

Add to `examples/basic/package.json` dependencies:

- `@effect/opentelemetry`
- `@opentelemetry/api`
- `@opentelemetry/exporter-trace-otlp-http`
- `@opentelemetry/sdk-trace-base`
- `@opentelemetry/sdk-trace-node`

Add to `examples/browser/package.json` dependencies:

- `@effect/opentelemetry`
- `@opentelemetry/api`
- `@opentelemetry/exporter-trace-otlp-http`
- `@opentelemetry/sdk-trace-base`
- `@opentelemetry/sdk-trace-node` (server.js runs in Node)

Unused OTel packages (`sdk-logs`, `sdk-metrics`, `resources`, `sdk-trace-web`, `semantic-conventions`) get dropped entirely — nothing imports them today.

### 2. Inline the shared telemetry helper into each example

`examples/shared/nodeTelemetry.ts` is 45 lines. Rather than making it a third workspace package for a single file, copy it into each example that uses it:

- `examples/basic/src/nodeTelemetry.ts`
- `examples/browser/src/nodeTelemetry.ts`

Update imports in `main.ts` and `server.js` from `../../shared/nodeTelemetry` to `./nodeTelemetry`.

Then delete `examples/shared/`.

**Why inline instead of a shared package?** There are only two consumers, the file is small, and each example may want to diverge (e.g., browser example might add web-specific exporters later). A shared package adds workspace overhead for negligible deduplication.

### 3. Clean up empty `packages/spotify-effect/src/otel/` directory

Delete it. OTel instrumentation lives in `SpotifyRequest.ts` via Effect's tracing — there's no standalone otel module in the library.

### 4. Verify

- `bun install` resolves cleanly
- `bun run typecheck` passes
- `bun run test` passes
- `bun run example:basic -- --help` still works
- `bun run example:browser` still starts the dev server

## File Changes Summary

| Action | Path                                             |
| ------ | ------------------------------------------------ |
| Edit   | `package.json` (remove OTel deps)                |
| Edit   | `examples/basic/package.json` (add OTel deps)    |
| Edit   | `examples/browser/package.json` (add OTel deps)  |
| Create | `examples/basic/src/nodeTelemetry.ts`            |
| Create | `examples/browser/src/nodeTelemetry.ts`          |
| Edit   | `examples/basic/src/main.ts` (update import)     |
| Edit   | `examples/browser/src/server.js` (update import) |
| Delete | `examples/shared/`                               |
| Delete | `packages/spotify-effect/src/otel/`              |
