# Replace vitest mocks with Effect layers

## Motive

When you use Effect, dependency injection is a first-class concept — services declare their dependencies in the type system via the `R` (Requirements) type parameter, and layers satisfy those dependencies at the edge. Vitest mocks (`vi.mock`, `vi.fn`, `vi.stubGlobal`, `vi.spyOn`) bypass this entirely by mutating global state, which defeats the purpose of using Effect in the first place.

This change enforces that pattern at the tooling level (oxlint) and refactors all existing tests to use Effect layers instead of mocks.

## What changed

### 1. Oxlint installed and configured

- Added `oxlint` as a dev dependency at the monorepo root.
- Created `oxlintrc.json` with a rule that **errors** on `vi.mock()`, `vi.stubGlobal()`, `vi.spyOn()`, and `vi.fn()`, using `jest/no-restricted-jest-methods` (which works for vitest's `vi` object too).
- Added a `bun run lint` script to the root `package.json`.

### 2. `HttpClient` made a proper Effect dependency

Previously, `makeSpotifyRequest` hardcoded `Effect.provide(FetchHttpClient.layer)` at the end of every request, which eliminated the `HttpClient` requirement from the return type. This made it impossible to swap the HTTP layer in tests without resorting to global fetch mocking.

Now:

- `SpotifyRequest.getJson()` returns `Effect<A, SpotifyRequestError, HttpClient>` — the `HttpClient` dependency flows through the type system.
- `TracksApi` methods propagate the `HttpClient` requirement.
- `SpotifyWebApi` (the user-facing class) provides `FetchHttpClient.layer` at the boundary, so consumers don't need to manage layers themselves. It also accepts an optional `httpClientLayer` for testing.

### 3. Test HTTP client layer

Created `src/test/TestHttpClient.ts` with a `makeTestHttpClient` helper:

```ts
const { layer, requests } = makeTestHttpClient(
  () =>
    new Response(JSON.stringify(fixture), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
);

const result = await Effect.runPromise(someEffect.pipe(Effect.provide(layer)));

expect(requests[0]?.url).toBe("https://api.spotify.com/v1/tracks/foo");
```

It returns a test `HttpClient` layer (for `Effect.provide`) and a `requests` array that captures every request made, replacing the role of `vi.fn().mock.calls`.

### 4. All test files rewritten

All three test files (`Tracks.test.ts`, `SpotifyWebApi.test.ts`, `SpotifyRequest.test.ts`) were rewritten to use `Effect.provide(layer)` instead of `vi.stubGlobal("fetch", ...)` and `vi.fn()`. No `afterEach` cleanup is needed — each test creates its own isolated layer.

## Advantages

- **Type-safe test doubles.** The test `HttpClient` layer satisfies the same interface as the real one. If the `HttpClient` interface changes, tests fail at compile time — not silently at runtime like mocks.
- **No global mutation.** `vi.stubGlobal("fetch", ...)` replaces the global `fetch` for the entire test process. Effect layers are scoped to the effect they're provided to, so tests are isolated by construction without needing `afterEach` cleanup.
- **The dependency graph is visible in types.** When a function returns `Effect<A, E, HttpClient>`, you can see at a glance that it needs an HTTP client. With mocks, dependencies are invisible — you only discover them when something breaks.
- **Composable.** Need to test with a rate-limited client, a client that fails on the 3rd request, or a client with latency? Compose layers. With mocks, you'd need increasingly complex `mockImplementation` chains.
- **Enforced via linting.** The oxlint rule prevents regression — any new `vi.mock()`, `vi.fn()`, `vi.stubGlobal()`, or `vi.spyOn()` call is a lint error with a message pointing to the Effect layer approach.
