# Effect-Native Auth Refactor Plan

## Goal

Refactor the current auth and request architecture so the core runtime behavior becomes more Effect-native, especially around token lifecycle management, request execution, and browser/session integration.

The immediate focus is not adding more Spotify surface area. It is deepening the modules that already exist so future endpoints and auth flows sit on a safer foundation.

## Why this refactor exists

The current implementation works, but several important parts are still not very Effect-native:

- `SpotifyWebApi` owns mutable auth state directly
- token expiry and refresh decisions are handled with object mutation and `Date.now()`
- request decoding still relies on unchecked casts
- auth flow logic is spread across the client, auth service, and browser example
- browser example logic still owns session orchestration that should increasingly live in reusable library code

That makes the library harder to reason about, harder to test under concurrency, and harder to extend cleanly.

## Refactor objectives

- move auth/session lifecycle into Effect-native services
- make token acquisition and refresh composable Effects instead of hidden object mutation
- make request execution a deeper reusable module with consistent decode/error/retry hooks
- prepare the codebase for `effect/Schema` at the API boundary
- reduce custom auth/session plumbing in examples by pushing shared logic into the library

## Current status

- Phase 1 is underway: `SpotifySession` now owns the core token/session state that used to live directly on `SpotifyWebApi`.
- Phase 2 is underway: `SpotifyRequest` now supports auth invalidation and a single retry path for unauthorized responses.
- Phase 3 is underway: token responses and the current-user profile path are starting to move to `effect/Schema` decoding at the boundary.

## Phase 1: Extract auth session service

### Purpose

Move mutable auth state out of `SpotifyWebApi` and into a dedicated auth/session service.

### Current pain

- access token, refresh token, expiry, and app tokens live in mutable class fields
- refresh behavior is not coordinated across concurrent callers
- app token reuse is in-memory but not modeled as a shared capability

### Refactor target

Create a service responsible for:

- current auth mode
- access token lookup
- temporary app token caching
- refreshable user token caching
- expiry checks using Effect time abstractions
- shared refresh execution so multiple callers do not stampede

### Likely modules

- `services/SpotifySession.ts`
- `services/SpotifyAuth.ts` remains focused on exchanging tokens, not owning session state
- `SpotifyWebApi.ts` becomes a thinner wiring layer

### Benefit

- safer concurrency
- deterministic tests
- less hidden mutation in the public client
- easier reuse in Node and browser environments

## Phase 2: Deepen request execution

### Purpose

Turn `SpotifyRequest` into the single robust boundary for transport, auth injection, classification, and decoding.

### Current pain

- response bodies are still cast with `as`
- request classification is manual and minimal
- no first-class retry/rate-limit hooks
- no built-in 401-aware recovery path

### Refactor target

Deepen `services/SpotifyRequest.ts` so it owns:

- auth header injection from the session service
- consistent status classification
- optional refresh-and-retry path for unauthorized responses
- future retry and backoff hooks
- future schema decoding hooks

### Benefit

- every endpoint gets the same runtime behavior
- fewer endpoint-level seams
- easier future additions for retries, rate limits, and observability

## Phase 3: Introduce Schema at the boundary

### Purpose

Replace unchecked success-path casts with schema-based boundary decoding for shipped slices.

### Initial targets

- track responses
- multi-track responses
- current user profile
- token responses
- Spotify error bodies

### Refactor target

Add schema-aware decode helpers inside the request/auth boundary without rewriting the whole model layer at once.

### Benefit

- catches upstream contract drift at runtime
- makes invalid responses explicit and typed
- improves confidence in auth/token handling

## Phase 4: Thin out browser auth plumbing

### Purpose

Reduce custom session orchestration in `examples/browser` by moving reusable browser-safe auth helpers into the package.

### Current pain

- the example currently owns verifier generation, storage, callback parsing, and token persistence orchestration
- this is fine for a proving ground, but too much of it will become duplicated logic if reused elsewhere

### Refactor target

Extract reusable browser-facing helpers for:

- PKCE verifier/challenge generation
- callback parsing
- storage-backed session state
- effectful exchange/profile flows

### Benefit

- thinner examples
- more reusable browser integration story
- easier testing and future framework integration

## Recommended implementation order

1. extract a session/auth state service from `SpotifyWebApi`
2. rewire `SpotifyRequest` to depend on that service rather than mutable class fields
3. add token refresh coordination and expiry through Effect-native state/time
4. introduce schema decoding for token and current shipped endpoint responses
5. move reusable browser auth utilities out of the example and into the package

## Constraints

- preserve current public API ergonomics where possible
- avoid sweeping endpoint rewrites during the refactor
- keep the browser example working while internals change
- prefer deep modules over scattered micro-abstractions

## Success criteria

- `SpotifyWebApi` is thinner and owns less mutable runtime state
- auth/session lifecycle is modeled by dedicated Effect-native services
- request execution becomes the single boundary for transport and decoding behavior
- current tests still pass with stronger internals
- browser auth flow becomes easier to reason about and reuse
