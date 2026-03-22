# Issue #10 Plan

## Goal

Prove the first parity-shaped vertical slice of the library:

- a consumer can construct a Spotify client with a provided access token
- `spotify.tracks.getTrack(trackId, options?)` returns an `Effect`
- success returns the existing typed `Track` shape
- failures return tagged domain errors
- the slice is covered by adapted parity-style tests

## What this slice should prove

- a parity-style client can be constructed with an explicit access token
- `tracks.getTrack` works end-to-end through a shared internal request path
- the public API returns `Effect`, not `Promise`
- transport and HTTP failures are classified into tagged errors
- parity testing can be adapted from the upstream library without copying the entire suite at once

## Current repo state

- `src/index.ts` is still a placeholder export
- `src/http.ts` is a minimal fetch wrapper and not yet a suitable shared request primitive
- `src/api/Tracks.ts` is empty
- the repo already contains useful handwritten Spotify types in `src/types`
- the upstream `TracksApi` implementation is thin, which is good for a first tracer bullet

## Scope for #10

### In scope

- client construction with an access token
- `tracks.getTrack(trackId, options?)`
- a minimal shared authenticated JSON request primitive
- a minimal tagged error model for observable failures
- imported and adapted parity tests for `getTrack`

### Out of scope

- `getTracks`
- auth URL helpers
- token exchange flows
- token refresh
- retry and rate-limit policies beyond shaping the request layer for later work
- full upstream test import

## Modules to build or replace

### Public client module

Responsibilities:

- expose the parity-style entrypoint
- accept config and provided access token
- expose `tracks`

Expected shape:

- preserve upstream naming for v1
- support `new SpotifyWebApi(..., { accessToken })`

### Tracks API module

Responsibilities:

- expose `getTrack(trackId, options?)`
- map parity options like `market` into the request layer
- remain intentionally thin

### Request module

Responsibilities:

- build authenticated JSON GET requests
- inject bearer auth headers
- handle response status
- parse JSON
- classify failures into tagged domain errors

This should be the first deep module in the codebase.

### Error module

Initial error set:

- `TransportError`
- `HttpError`
- `DecodeError` only if runtime decoding is introduced now

### Test fixtures and helpers

Responsibilities:

- bring in only the upstream fixtures needed for `getTrack`
- mock `fetch` for behavior-focused tests
- adapt parity tests to assert observable behavior instead of spying on generated services

## Deep module boundary

The deep module for this slice should be the request layer, not `TracksApi`.

`TracksApi` should stay boring:

- construct endpoint path
- pass query parameters
- call the shared request module
- return the typed result

The request module should encapsulate:

- auth header formatting
- fetch execution
- HTTP status handling
- JSON parsing
- failure classification

That keeps future resource modules shallow and reusable while centralizing complexity in one stable place.

## Testing plan

Port only the upstream `getTrack` tests first.

Adapt them from generated-service spying to request-level observable assertions.

Tests for this slice should cover:

- returns track data without options
- sends `market` query when provided
- includes `Authorization: Bearer <token>`
- returns a tagged error on non-2xx responses
- returns a tagged error on invalid JSON only if runtime decoding/parsing classification is added now

The broader upstream `spotifyApi` auth tests belong to later auth-focused issues, especially `#12`.

## Recommended implementation order

1. replace the placeholder export in `src/index.ts`
2. define the minimal public client constructor for access-token usage
3. implement the shared authenticated request module
4. implement tagged errors for transport and HTTP failures
5. implement `tracks.getTrack`
6. add the minimum fixtures needed for track tests
7. port and adapt the upstream `getTrack` tests
8. retire or fold `src/http.ts` into the shared request path to avoid duplicate abstractions

## Design decisions for this slice

- preserve upstream naming in the public API
- return `Effect` from public methods immediately
- use the current handwritten `Track` and `MarketOptions` types for this tracer bullet
- mock `fetch` in tests instead of hitting the network
- skip runtime schema validation for `#10` to keep the slice thin

## Risks and watchouts

- introducing full runtime schema validation now will likely make `#10` too large
- `tsconfig.json` currently does not include `src`, so typecheck coverage likely needs to be fixed as part of real implementation work
- the current tests are disposable experiments and should not shape the target architecture

## Default call

For `#10`, typed success means TypeScript-typed return values plus tagged transport and HTTP failures.

Runtime response validation is intentionally deferred to a later slice.
