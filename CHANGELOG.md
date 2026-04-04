# @spotify-effect/core

## 0.3.0

### Minor Changes

- Add browser support that now lives in `@spotify-effect/browser`, with CORS-safe defaults and `SpotifyBrowser`
- New `SpotifyBrowser` ServiceMap service that composes all 12 domain services + browser-specific PKCE auth into a single `yield*`
- Disable Effect's `HttpClient.TracerPropagationEnabled` by default in browser layer to prevent CORS preflight failures on Spotify endpoints
- Add `SpotifyBrowser.layer()` — one-call setup that wires HTTP client, tracing config, auth, and all domain services internally
- Add `auth.startPkceLogin()`, `auth.exchangeCode()`, `auth.refreshToken()` with automatic token storage
- Add Solid browser example demonstrating full PKCE login + library + albums UI

### Documentation

- Add `docs/tracing/cors-browser-tracing.md` — investigation into CORS preflight failures caused by Effect tracing headers
- Add `docs/architecture/browser-subpath.md` — architecture notes, tradeoffs, and future work for next contributors

## 0.2.0

See git history for changes in this release.

## 0.0.6

### Patch Changes

- 5160ce9: ping pong

## 0.0.5

### Patch Changes

- fcb53ad: mic check

## 0.0.4

### Patch Changes

- 2f7427f: Make package public. wonder if that helps?

## 0.0.3

### Patch Changes

- 890176e: Still trying to figure out the workflow

## 0.0.2

### Patch Changes

- 1e1da9b: Initial publish...
- a7a7d57: Is anyone there?
- 70c2785: Changeset Bot installed to the repo
