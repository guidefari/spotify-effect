# Spotify Effect PRD

## Problem Statement

The goal is to build an Effect-based alternative to `spotify-web-api-ts` that keeps the ergonomics of the original library while improving its runtime model, safety, and extensibility.

From the user perspective, the current gap is not just "there is no Effect version yet." The bigger problem is that existing Spotify API wrappers are Promise-first, rely on mutable auth state, and do not offer the kinds of primitives that make Effect valuable in real applications: typed failures, composable dependency injection, cancellation, retry policies, observability hooks, and safer token lifecycle management.

The desired result is a library that feels familiar to users of `spotify-web-api-ts`, works in both server and browser environments, and provides a better foundation for production use without overcomplicating the public API.

## Solution

Build a close-parity Spotify Web API client whose public surface remains organized around the same resource groups as `spotify-web-api-ts`, but whose operations return `Effect` values instead of `Promise`s.

The implementation will use generated Spotify OpenAPI types as the canonical source for request and response contracts, while layering a thin handwritten Effect-native facade on top. The library will be designed to work in truly isomorphic environments from the start, with authentication handled through dedicated token provider capabilities rather than mutable shared globals.

The main value added beyond parity will be:

- typed error modeling
- automatic token refresh support
- first-class retry and rate-limit behavior
- observability hooks around requests

The project will start by importing the upstream test suite from `spotify-web-api-ts` and using that as the initial compatibility harness, adapting tests where needed for Effect semantics.

## User Stories

1. As a TypeScript developer, I want a Spotify client with grouped resources like `albums`, `artists`, `tracks`, and `users`, so that the API feels familiar and easy to discover.
2. As a user of `spotify-web-api-ts`, I want a similar method layout in the new library, so that migration cost stays low.
3. As an Effect user, I want all client operations to return `Effect` values, so that Spotify calls compose naturally with the rest of my application.
4. As a backend developer, I want to use client credentials authentication, so that I can access public Spotify catalog endpoints from a server.
5. As a full-stack developer, I want authorization code and refresh token flows, so that I can build user-authenticated Spotify features.
6. As a browser-focused developer, I want PKCE support, so that I can authenticate users safely in public clients.
7. As a library consumer, I want auth URL generation helpers, so that I can start Spotify authorization flows without rebuilding low-level details.
8. As a library consumer, I want token exchange helpers, so that I can turn Spotify auth responses into usable client credentials.
9. As a library consumer, I want refresh logic encapsulated in a token provider, so that I do not need to manually manage token expiry.
10. As a developer integrating this client into an application, I want auth state to be instance-local or environment-local, so that multiple users or sessions do not interfere with each other.
11. As a server developer, I want to create multiple isolated Spotify clients, so that I can safely serve concurrent requests.
12. As a browser developer, I want the same client shape to work without Node-specific assumptions, so that I can share code across runtimes.
13. As a package consumer, I want the request layer to be internal and stable, so that endpoint modules remain simple and consistent.
14. As a maintainer, I want generated types sourced from Spotify OpenAPI definitions, so that the wire contracts are reproducible and easier to update.
15. As a maintainer, I want handwritten code isolated from generated code, so that regeneration does not destroy Effect-specific behavior.
16. As a library consumer, I want typed request options, so that endpoint usage is discoverable and safe in editors.
17. As a library consumer, I want typed response values, so that Spotify data structures are available without hand-rolled casting.
18. As a library consumer, I want typed domain failures, so that I can distinguish transport, auth, decode, and Spotify API errors.
19. As a developer handling failures, I want rate-limit failures to be explicit, so that I can make better retry and UX decisions.
20. As a developer handling expired credentials, I want unauthorized failures to be distinguishable from transport failures, so that I can react appropriately.
21. As a maintainer, I want one shared request primitive, so that auth injection, retries, decoding, and instrumentation are implemented once.
22. As a maintainer, I want the request primitive to centralize query serialization, so that endpoint wrappers stay thin.
23. As a maintainer, I want the request primitive to capture response metadata, so that rate-limit and observability features can evolve without rewriting every endpoint.
24. As a library consumer, I want retry support for transient failures, so that common Spotify/network blips are easier to tolerate.
25. As a library consumer, I want retry behavior to be configurable, so that I can balance resilience and latency.
26. As a library consumer, I want to observe requests and failures, so that I can integrate logging and tracing into my app.
27. As a maintainer, I want observability hooks to live near the request layer, so that instrumentation stays consistent across endpoints.
28. As a developer using read-only endpoints, I want a simple path to call endpoints like album details or track details first, so that the library can become useful early.
29. As a developer using user-scoped endpoints later, I want the same client model to scale to library, playlist, and playback APIs, so that the package does not split into unrelated abstractions.
30. As a library consumer, I want one-shot paginated endpoint access, so that the basic parity surface is straightforward.
31. As a future library consumer, I want room for streaming pagination helpers, so that large collections can be processed idiomatically with Effect.
32. As a maintainer, I want parity tests copied from the upstream project, so that the new client can be validated against known behavior.
33. As a maintainer, I want tests to focus on observable behavior rather than internal implementation, so that internal refactors remain safe.
34. As a maintainer, I want deep modules around auth, request execution, and error modeling, so that the hardest logic is isolated and testable.
35. As a package consumer, I want the public exports to stay compact and deliberate, so that the package feels approachable.
36. As a maintainer, I want incremental milestone delivery, so that the project can ship useful slices before full API coverage exists.
37. As a maintainer, I want compatibility with existing Spotify wire formats, so that generated contracts stay faithful to the API.
38. As a maintainer, I want to avoid global mutable singletons, so that the architecture remains safe in production and test environments.
39. As a user evaluating the library, I want a clear migration story from `spotify-web-api-ts`, so that I know what remains compatible and what changes.
40. As a maintainer, I want an architecture that supports future additions like pagination streams and richer policies, so that the project can evolve without rewriting the foundation.

## Implementation Decisions

- The public API will target close parity with `spotify-web-api-ts`, especially in top-level resource grouping and general method discoverability.
- The implementation will be Effect-first under the hood, with endpoint methods returning `Effect` values rather than `Promise`s.
- Generated Spotify OpenAPI types will be the canonical contract source for requests and responses.
- Generated artifacts and handwritten modules will be kept clearly separated, with handwritten modules responsible for Effect integration and ergonomic facades.
- The first deep module will be a shared request execution layer that owns transport concerns, auth injection, query/body encoding, response decoding, retry hooks, rate-limit handling points, and observability hooks.
- A dedicated auth/token module will encapsulate client credentials, authorization code, refresh token, and PKCE flows.
- Token handling will avoid mutable global singleton state and instead use per-client or per-environment capabilities.
- Token lifecycle behavior will include automatic refresh support where refresh tokens are available.
- Error handling will use tagged domain errors rather than a single generic API error.
- The client surface will be organized around resource modules such as albums, artists, browse, player, playlists, tracks, and users.
- Initial implementation should favor a thin facade over the generated contracts rather than adding large amounts of endpoint-specific business logic.
- The first implementation slice should prioritize foundational modules and a small set of catalog read endpoints before broader coverage.
- The project should remain truly isomorphic, so core modules must not assume server-only globals, secret storage models, or transport behavior.
- Observability should be designed into the request layer from the beginning so logging and tracing can be added without breaking the public API.
- Retry and rate-limit behavior should be centralized, configurable, and explicit rather than hidden in ad hoc endpoint wrappers.
- Pagination will begin with parity-friendly page fetches, while leaving room for later `Stream`-based helpers.
- Upstream tests from `spotify-web-api-ts` will be copied before major implementation work and treated as the starting compatibility suite.
- Parity-facing request option names will preserve Spotify and upstream wire naming exactly in v1 so migration and compatibility remain straightforward.

## Testing Decisions

- Good tests should validate external behavior and public contracts, not internal implementation details.
- Good tests should verify what a consumer experiences: resource method behavior, auth helper behavior, typed failure behavior, retry behavior, and generated request shaping where it is externally visible.
- The imported upstream `spotify-web-api-ts` tests will serve as prior art and as the initial parity benchmark.
- The shared request execution module should have strong tests because it is a deep module with most of the transport, retry, and decoding complexity.
- The auth/token module should have strong tests because token exchange, expiry, refresh, and PKCE behavior are central to correctness.
- The error modeling layer should be tested for observable classification behavior so consumers can reliably branch on failures.
- Resource modules should be tested primarily for public behavior and parity, not for their internal delegation to generated code.
- The generated code itself should not become the focus of bespoke unit testing beyond integration points; the handwritten facade and request/auth modules are the primary testing targets.
- Tests imported from the upstream library will likely need adaptation from Promise-based expectations to Effect-based execution, but the intended observable outcomes should remain the same.

## Out of Scope

- Full Spotify Web API coverage in the very first implementation slice.
- Large endpoint-specific abstractions beyond what is needed for parity and Effect integration.
- A fully redesigned public API that abandons the familiar grouped shape of `spotify-web-api-ts`.
- Immediate delivery of pagination streams for every paginated endpoint.
- Advanced caching, batching, or speculative concurrency features beyond the core request/auth foundation.
- Legacy authorization flows that do not materially support the target server/browser use cases.
- Reworking Spotify wire contracts into an entirely custom domain model.

## Further Notes

- The current repository already contains some copied Spotify type definitions and a minimal HTTP experiment, but the architecture is still effectively blank, which makes this a good moment to establish clean deep-module boundaries.
- The highest leverage early deliverables are not endpoint count but foundation quality: request execution, auth capabilities, error taxonomy, and parity test import.
- A practical milestone order is: copy tests, wire code generation, build request core, build auth core, ship a small catalog slice, then expand resource coverage.
