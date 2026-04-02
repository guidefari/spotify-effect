# spotify-effect

## 0.2.0

### Minor Changes

- Refactor the public API around Effect-native services and layers.

  - Add `ServiceMap.Service` contracts for auth, session, request, and each Spotify domain module
  - Add `makeSpotifyLayer` as the primary composition entrypoint for consumers
  - Export live domain layers and service tags instead of the old `SpotifyWebApi` facade and `*Api` classes
  - Migrate the examples to the new layer-first API, including SvelteKit and browser flows
  - Replace facade/class tests with service-runtime coverage across the composed layer graph

  This release removes the previous OO-style surface and replaces it with the new service/layer API.

## 0.1.0

### Minor Changes

- 465e01e: Add Effect-native Spotify auth flows and browser examples for access-token, client-credentials, and PKCE-driven user flows.
