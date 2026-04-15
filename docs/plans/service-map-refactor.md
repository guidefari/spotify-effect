# Plan: ServiceMap Native API

This refactor moves the package from constructor-wired API classes to `ServiceMap.Service` contracts with layers as the primary integration surface.

## Goals

- Define service contracts in `packages/spotify-effect/src/services/`
- Implement live layers in `packages/spotify-effect/src/api/`
- Make layer composition the default entrypoint for consumers and examples
- Keep auth, session, and request orchestration explicit in the layer graph
- Stop centering the public API around `SpotifyWebApi` and exported `*Api` classes

## Target Shape

```ts
const layer = makeSpotifyLayer(
  { clientId, clientSecret, redirectUri },
  { accessToken, refreshToken, accessTokenExpiresAt },
);

const program = Effect.gen(function* () {
  const tracks = yield* Tracks;
  return yield* tracks.getTrack(trackId);
}).pipe(Effect.provide(layer));
```

## Service Graph

- `SpotifyConfig` - normalized runtime config reference
- `SpotifySessionConfig` - initial credential/session reference
- `SpotifyAuth` - token exchange and refresh contract
- `SpotifySession` - mutable token state and refresh coordination
- `SpotifyRequest` - authenticated request contract with retry behavior
- `Albums` / `Artists` / `Browse` / `Follow` / `Library` / `Markets` / `Personalization` / `Player` / `Playlists` / `Search` / `Tracks` / `Users` - domain contracts

## Layer Graph

```text
SpotifyConfig
SpotifySessionConfig
  -> SpotifyAuth.layer
  -> SpotifySession.layer
  -> SpotifyRequest.layer
  -> domain layers from src/api/
```

## Migration Steps

1. Convert infra modules to `ServiceMap.Service`
2. Add domain service contracts under `src/services/`
3. Export live domain layers from `src/api/`
4. Add `makeSpotifyLayer` as the composition helper
5. Update examples to consume services through layers
6. Remove or de-emphasize the legacy facade from the public surface

## Status

- [x] ServiceMap-based `SpotifyAuth`, `SpotifySession`, and `SpotifyRequest`
- [x] Domain service contracts under `src/services/`
- [x] Domain live layers exported from `src/api/`
- [ ] `makeSpotifyLayer` public helper
- [ ] Root exports switched to the service-first public API
- [ ] Examples migrated off `SpotifyWebApi`
