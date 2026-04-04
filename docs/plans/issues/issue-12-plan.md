# Issue #12 Plan

## Goal

Build the first complete user-authentication slice:

- generate authorization URLs for authorization code and PKCE flows
- exchange authorization codes for refreshable user tokens
- refresh access tokens with a stored refresh token
- let the client use refreshable credentials without manual token swapping
- provide both automated tests and a browser-oriented example for manual verification

## Scope

### In scope

- authorization code URL generation
- authorization code + PKCE URL generation
- code exchange for refreshable user tokens
- refresh token exchange
- a refreshable token provider for client requests
- a browser example in `examples/` that can exercise the auth flow manually
- docs explaining PKCE, when to use it, and how Spotify uses it

### Out of scope

- long-lived token persistence beyond in-memory or browser-local demo needs
- full browser E2E login automation against real Spotify accounts in CI
- broad user resource coverage beyond one thin authenticated proof path

## Modules to build or extend

### `SpotifyWebApi`

- add parity-style auth URL helpers
- add parity-style token exchange helpers
- support a refreshable token provider path for authenticated requests

### `services/SpotifyAuth`

- add authorization code exchange
- add PKCE code exchange
- add refresh token exchange
- keep request shaping centralized and testable

### `services/SpotifyRequest`

- allow an effectful token resolver to refresh and return a usable bearer token
- keep the request facade stable while auth behavior grows behind it

### `examples/browser`

- provide a manual browser playground for auth work
- keep the example thin by delegating auth logic to the library rather than re-encoding flows in the UI

### `docs/auth/pkce.md`

- explain what PKCE is
- explain why it exists and where it is used
- explain the Spotify-specific flow and constraints
- collect reading material for deeper learning

## Thin vertical slice

- generate a Spotify authorization URL
- exchange the returned code for refreshable tokens
- refresh the access token when needed
- make one authenticated request through the refreshable token path
- verify the flow with behavior-focused tests and a browser example

## Testing strategy

- pure tests for authorization URL generation
- behavior-focused HTTP tests for code exchange and refresh request shapes
- client-level tests proving refreshed tokens power authenticated requests
- no real Spotify login in CI; use the browser example for manual verification

## Default call

Use automated tests for request shaping and token lifecycle behavior, then rely on the browser example for the last-mile “does this feel right in a real browser flow?” check.

Automatic refresh should happen only when the token provider knows the access token is missing or expired, and the first implementation should keep that expiry logic simple and in-memory.
