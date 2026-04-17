# Issue #53 Effect Audit

## Scope

Audit the request and error layers for Effect-native behavior at the boundaries that matter:

- error typing vs ad hoc exceptions
- retry, rate-limit, and auth-refresh control flow
- docs vs implementation parity
- separation between parse, config, transport, and runtime failures

## Findings

### 1. Rate-limit failures were not stable at the request boundary

`SpotifyRequest` slept on `429` and then failed with `SpotifyHttpError`. Only after retries were exhausted did it convert that failure to `SpotifyRateLimitError`, and even then it dropped the real `Retry-After` value.

Impact:

- consumers saw different error shapes for the same failure depending on retry config
- `retryAfterSeconds` was always `0` after exhaustion
- the code path was Effect-shaped but still encoded rate-limit semantics imperatively inside the request body

### 2. Browser automatic refresh docs were ahead of the implementation

The browser docs claimed automatic refresh, but the browser layer only seeded the core layer with `accessToken`. It dropped `refreshToken` and `accessTokenExpiresAt`, so the underlying core session could not do expiry-based refresh. The browser service also updated browser storage without syncing the already-constructed core session state.

Impact:

- restored browser sessions could not auto-refresh
- `setTokens` updated storage but not the live in-memory client state
- post-login flows risked using stale credentials until the whole layer was rebuilt

### 3. Token decode failures were classified as configuration failures

`SpotifyAuth` mapped schema decode failures from Spotify's token endpoint to `SpotifyConfigurationError`.

Impact:

- remote decode failures were collapsed into local misconfiguration
- docs and runtime behavior disagreed on parse vs config boundaries

### 4. Auth and error-handling docs had smaller parity mismatches

- `authentication.mdx` used `expiresAt` instead of `accessTokenExpiresAt`
- browser docs described logout as storage-only even though the live in-memory session also matters

## Plan

### Request layer

- classify request `429` responses immediately as `SpotifyRateLimitError`
- preserve `Retry-After` in the typed error
- let built-in retry consume the typed rate-limit error instead of translating from `SpotifyHttpError` later

### Auth layer

- classify token endpoint schema decode failures as `SpotifyParseError`
- classify token endpoint `429` responses as `SpotifyRateLimitError`

### Browser layer

- seed the core layer with full stored credentials
- sync `exchangeCode`, `refreshToken`, `setTokens`, and `logout` with the live `SpotifySession`

### Docs

- align error-handling guidance with typed `SpotifyRateLimitError`
- fix auth credential field names
- document the browser refresh preconditions explicitly

### Verification

- add regression tests for exhausted request rate limits
- add regression tests for token endpoint decode and rate-limit classification
- add browser tests for stored-token refresh and manual token synchronization

## Status

Implemented in this pass.
