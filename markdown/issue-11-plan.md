# Issue #11 Plan

## Goal

Build the first auth-powered public catalog slice:

- a consumer can construct a Spotify client with `clientId` and `clientSecret`
- the client can acquire temporary app tokens through the client credentials flow
- public catalog calls like `tracks.getTrack` and `tracks.getTracks` work without manually providing an access token
- the token is reused until replaced or expired logic is introduced
- the slice is covered by behavior-focused tests

## Scope

### In scope

- client credentials token exchange
- a small token provider abstraction for app tokens
- automatic bearer token injection for public catalog reads
- public catalog verification through existing track endpoints
- tests for auth success and auth failure behavior
- a simple CLI example in `examples/` for manually verifying the client credentials flow

### Out of scope

- refreshable user tokens
- PKCE and authorization code flows
- automatic expiry refresh heuristics beyond a minimal reusable seam
- retries and observability policies beyond what already exists

## Modules to build or extend

### `SpotifyWebApi`

- add a path for client-credentials-backed usage
- preserve existing parity-style options and methods
- keep constructor-level config stable

### `services/SpotifyAuth`

- exchange client credentials for a temporary app token
- hide token endpoint details and form encoding
- surface tagged auth failures

### `services/SpotifyRequest`

- allow auth to come from a token resolver that may be effectful
- reuse the shared request path for public catalog reads

### `errors/SpotifyError`

- add or refine auth-specific failure classification as needed

### `examples/basic`

- support client credentials usage in addition to direct access tokens
- reuse library-facing construction flows rather than duplicating auth plumbing in the example

## Thin vertical slice

- configure `clientId` and `clientSecret`
- call `spotify.tracks.getTrack(id)` without a provided access token
- client credentials flow fetches a temporary app token
- request succeeds with the acquired bearer token
- tests prove token acquisition, token reuse, and auth failure behavior
- the example can fetch a track using `clientId` and `clientSecret` without re-implementing token exchange logic

## Testing plan

- verify token exchange request shape against Spotify token endpoint expectations
- verify the client reuses the acquired token for multiple catalog requests
- verify auth failures are surfaced as tagged errors
- verify existing track endpoints still behave the same from the consumer perspective
- verify the example stays thin and delegates auth behavior to the library

## Default call

Keep the token provider simple for this slice: acquire once and reuse in-memory.

Do not add expiry refresh behavior until the abstraction is proven and needed.
