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

- package code now lives under `packages/spotify-effect/src`
- `packages/spotify-effect/src/index.ts` is still a placeholder export
- `packages/spotify-effect/src/http.ts` started as a minimal fetch wrapper and has been superseded by the Effect HTTP-based request direction
- `packages/spotify-effect/src/api/Tracks.ts` is empty
- the repo already contains useful handwritten Spotify types in `packages/spotify-effect/src/model`
- the upstream `TracksApi` implementation is thin, which is good for a first tracer bullet
- Effect v4 consolidates core abstractions into `effect`, so the request layer should lean on Effect's HTTP client abstractions rather than a handwritten `fetch` wrapper

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

Proposed file:

- `packages/spotify-effect/src/SpotifyWebApi.ts`

### Tracks API module

Responsibilities:

- expose `getTrack(trackId, options?)`
- map parity options like `market` into the request layer
- remain intentionally thin

Proposed file:

- `packages/spotify-effect/src/api/Tracks.ts`

### Request module

Responsibilities:

- adapt Effect HTTP client into a package-local request API
- build authenticated JSON GET requests
- inject bearer auth headers
- encode query parameters
- handle response status
- parse JSON response bodies
- classify failures into tagged domain errors

This should be the first deep module in the codebase.

Proposed files:

- `packages/spotify-effect/src/services/SpotifyRequest.ts`
- `packages/spotify-effect/src/errors/SpotifyError.ts`
- optional split later if request logic grows

Initial request API shape:

- `getJson(path, options)`
- `options` should support query params and a provided access token
- the module should hide raw Effect HTTP request and response details from resource modules

### Error module

Initial error set:

- `SpotifyTransportError`
- `SpotifyHttpError`
- `SpotifyParseError` only if JSON parsing is classified separately in this slice

These should be package-level tagged errors rather than raw Effect HTTP client errors.

### Access token context

Responsibilities:

- represent the provided bearer token for this slice
- give the request module a stable input for auth header injection
- leave room for later token-provider based auth without changing `TracksApi`

Proposed file:

- `packages/spotify-effect/src/internal/accessToken.ts`

### Test fixtures and helpers

Responsibilities:

- bring in only the upstream fixtures needed for `getTrack`
- mock the underlying HTTP execution path for behavior-focused tests
- adapt parity tests to assert observable behavior instead of spying on generated services

Proposed files:

- `packages/spotify-effect/src/fixtures/trackFixture.ts`
- `packages/spotify-effect/src/test/request.test.ts` or resource-local tests if that stays smaller

## Deep module boundary

The deep module for this slice should be the request layer, not `TracksApi`.

`TracksApi` should stay boring:

- construct endpoint path
- pass query parameters
- call the shared request module
- return the typed result

The request module should encapsulate:

- auth header formatting
- Effect HTTP client execution
- HTTP status handling
- JSON parsing
- failure classification

That keeps future resource modules shallow and reusable while centralizing complexity in one stable place.

The public package should not expose raw Effect HTTP client types. Resource modules should depend only on the package-local request adapter.

## Concrete module boundary sketch

### `SpotifyWebApi`

Responsibilities:

- own constructor-level config
- hold the provided access token for this slice
- construct grouped API modules

Should know about:

- client options
- access token credentials
- `TracksApi`

Should not know about:

- request execution details
- HTTP status handling
- query serialization

### `TracksApi`

Responsibilities:

- expose `getTrack(trackId, options?)`
- build the endpoint path
- pass `market` through as query parameters
- delegate everything else to the request module

Should know about:

- `Track`
- `MarketOptions`
- package-local request adapter

Should not know about:

- auth headers
- raw HTTP client details
- transport failures

### `request`

Responsibilities:

- use Effect HTTP client internally
- create GET requests against Spotify's base API URL
- inject bearer auth
- encode query values
- convert non-success statuses into tagged errors
- parse JSON into typed values

Should know about:

- base URL
- access token
- request options
- package-local errors

Should not know about:

- resource-specific response types beyond generic typing
- Spotify endpoint group structure

### `errors`

Responsibilities:

- define tagged error shapes used by the package
- normalize failures coming from request execution

### `accessToken`

Responsibilities:

- model the provided access token for `#10`
- provide a seam for later token-provider and refresh support

## Testing plan

Port only the upstream `getTrack` tests first.

Adapt them from generated-service spying to request-level observable assertions.

Tests for this slice should cover:

- returns track data without options
- sends `market` query when provided
- includes `Authorization: Bearer <token>`
- returns a tagged error on non-2xx responses
- returns a tagged error on invalid JSON only if parsing classification is added now

The broader upstream `spotifyApi` auth tests belong to later auth-focused issues, especially `#12`.

Test structure recommendation:

- one public API test for constructing the client and calling `tracks.getTrack`
- one `TracksApi` behavior test ported from upstream intent
- one request-layer test file for success, header injection, query handling, and tagged failure mapping

## Recommended implementation order

1. replace the placeholder export in `packages/spotify-effect/src/index.ts`
2. add `packages/spotify-effect/src/SpotifyWebApi.ts` with parity-style constructor and `tracks`
3. add the minimal access token module for this slice
4. implement package-level tagged errors
5. implement the shared request adapter on top of Effect HTTP client
6. implement `packages/spotify-effect/src/api/Tracks.ts` with `getTrack`
7. add the minimum fixtures needed for track tests
8. port and adapt the upstream `getTrack` tests
9. remove or fold `packages/spotify-effect/src/http.ts` into the new request path to avoid duplicate abstractions

## Concrete implementation checklist

- create `SpotifyWebApi` with config and optional `{ accessToken }`
- export `SpotifyWebApi` from package entrypoint
- create `TracksApi` constructor that receives request dependencies
- create request adapter using Effect HTTP client internals
- support `GET /tracks/{id}` with optional `market` query
- map request failures into tagged package errors
- add minimal fixtures for successful track responses
- add tests for public client construction and `tracks.getTrack`
- add tests for headers, query params, and failure mapping
- delete or replace the old `http.ts` spike once the new path exists

## Design decisions for this slice

- preserve upstream naming in the public API
- return `Effect` from public methods immediately
- use the current handwritten `Track` and `MarketOptions` types for this tracer bullet
- use Effect HTTP client internally instead of the handwritten `fetch` wrapper
- mock the HTTP execution boundary in tests instead of hitting the network
- skip runtime schema validation for `#10` to keep the slice thin
- keep raw Effect HTTP types internal to the package

## Risks and watchouts

- introducing full runtime schema validation now will likely make `#10` too large
- the current tests are disposable experiments and should not shape the target architecture
- overfitting the request adapter to `getTrack` would make later slices harder; it should be small but generic enough to reuse
- spending too much time perfecting the Effect HTTP abstraction in this first slice would slow delivery

## Default call

For `#10`, typed success means TypeScript-typed return values plus tagged transport and HTTP failures.

Runtime response validation is intentionally deferred to a later slice.

Effect HTTP client should be used internally through a package-local request adapter rather than exposing raw transport concerns at the public API boundary.
