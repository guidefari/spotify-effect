# spotify-effect

A TypeScript SDK for the Spotify Web API built with [Effect](https://effect.website/) — a functional, type-safe approach to handling async operations, errors, and observability.

## What is this?

This is an **isomorphic** (works in both Node.js and browser environments) Effect-based wrapper around the Spotify Web API, inspired by [spotify-web-api-ts](https://github.com/inferrinizzard/spotify-web-api). It provides:

- **Type-safe API calls** with full TypeScript support
- **Functional error handling** using Effect's composable error management
- **Built-in retries & batching** via Effect's request resolvers
- **OpenTelemetry tracing** for observability (optional, via `SPOTIFY_EFFECT_TRACE=1`)
- **PKCE OAuth flow** support for browser-based authentication
- **Comprehensive test coverage** with Vitest

## Packages

- **`packages/spotify-effect`** — Core SDK with API clients for Tracks, Users, and authentication

## Examples

- **`examples/basic`** — Node.js example with tracing
- **`examples/browser`** — Browser-based PKCE authentication flow
- **`examples/otel`** — Ready-to-run OpenTelemetry collector stack

## Quick Start

```typescript
import { SpotifyWebApi } from "spotify-effect";
import { Effect } from "effect";

const program = Effect.gen(function* () {
  const spotify = yield* SpotifyWebApi.create({
    accessToken: "your-access-token",
  });

  const track = yield* spotify.tracks.getTrack("4iV5W9uYEdYUVa79Axb7Rh");

  return track;
});

Effect.runPromise(program);
```

## Learning Resources

- [Intro To Effect, Part 1: What Is Effect?](https://ybogomolov.me/01-effect-intro)
- [Effect Introduction](https://github.com/antoine-coulon/effect-introduction)
- [Generic batching & retries examples](https://gist.github.com/mikearnaldi/4a13fe6f51b28ad0b07fd7bbe3f4c49a)

## Observability

Request and auth flows emit Effect tracing spans at shared boundaries. Enable local tracing with `SPOTIFY_EFFECT_TRACE=1`. See `markdown/otel.md` for setup notes and `examples/otel/` for a ready-to-run collector stack.

## Additional Notes

See notes in `/markdown` for more detailed documentation.
