## Planning/initial prompt
- the next step is making sure there's no need for the make spotifyLayer or makeBrowser layer. 
- let's try find a way to improve the api to not need this
- basically, the consumer shouldn't need to have effect to make use of this library on the browser
- startPkceLogin feels like it belongs to `SpotifyAuth`


# `spotify-effect/browser` — Design Notes

## What we built

A `spotify-effect/browser` subpath export that provides a `SpotifyBrowser` service — a single Effect service that composes all 12 Spotify domain services + browser-specific auth into one `yield*`.

### Consumer API

```ts
import { SpotifyBrowser } from "spotify-effect/browser";

const program = Effect.gen(function* () {
  const spotify = yield* SpotifyBrowser;

  // PKCE login (returns URL, consumer navigates)
  const url = yield* spotify.auth.startPkceLogin({ scopes: [...] });

  // After redirect — exchanges code, stores tokens internally
  const tokens = yield* spotify.auth.exchangeCode(code);

  // Authenticated API calls
  const profile = yield* spotify.users.getCurrentUserProfile();
  const albums = yield* spotify.library.getSavedAlbums({ limit: 12 });
});

Effect.runPromise(program.pipe(
  Effect.provide(SpotifyBrowser.layer({ clientId: "...", session: { ... } }))
));
```

No `makeSpotifyLayer`, no individual service imports, no manual `Effect.provide` per call.

## Why we built it

### CORS problem

Effect's `FetchHttpClient` injects tracing propagation headers (`B3`, `Traceparent`) on all outgoing requests by default. These are non-simple headers under the CORS spec, which forces the browser to send a preflight OPTIONS request. Both `accounts.spotify.com/api/token` and `api.spotify.com/v1/*` reject preflights with these headers.

See `docs/tracing/cors-browser-tracing.md` for the full investigation with screenshots.

The fix: `spotify-effect/browser` builds its HTTP client layer with `HttpClient.TracerPropagationEnabled` set to `false`. This is done in `browserHttpClientLayer` inside `src/browser/index.ts:31-34`.

### API ergonomics

Before this work, browser consumers had to:
1. Import `makeSpotifyLayer`, `createPkceCodeVerifier`, `createPkceCodeChallenge`, `getAuthorizationUrl`, `makeSpotifyBrowserSession` separately
2. Wire `Effect.provide(makeSpotifyLayer(...))` on every single API call
3. Know about `httpClientLayer` and `TracerPropagationEnabled` to fix CORS

Now they import `SpotifyBrowser`, call `.layer()` once, and use `yield* SpotifyBrowser` everywhere.

## Architecture

### `SpotifyBrowser` is a `ServiceMap.Service`

```
SpotifyBrowser.layer(options)
  └── makeSpotifyBrowserLayer (FetchHttpClient + TracerPropagation=false)
       └── makeSpotifyLayer (all domain service layers composed)
            ├── Albums, Artists, Browse, Follow, Library, ...
            ├── SpotifyAuth, SpotifySession, SpotifyRequest
            └── SpotifyConfig, SpotifySessionConfig
```

The `make` Effect resolves all 12 domain services + SpotifyAuth from the layer via `yield*`, then returns them directly as namespaced properties. The domain service instances (`albums`, `users`, etc.) are the real service implementations — no wrapper delegation.

The `auth` namespace is custom — it wraps `SpotifyAuth.getRefreshableUserTokensWithPkce` with PKCE state management, token storage, and URL cleanup.

### Key files

| File | Role |
|---|---|
| `packages/spotify-effect/src/browser/index.ts` | `SpotifyBrowser` service, `makeSpotifyBrowserLayer`, browser HTTP client layer |
| `packages/spotify-effect/src/browser/SpotifyBrowserSession.ts` | PKCE state + token storage (sessionStorage/localStorage) |
| `packages/spotify-effect/src/makeSpotifyLayer.ts` | Core layer composition (environment-agnostic) |
| `packages/spotify-effect/package.json` | `./browser` subpath export + `tsup` dual entry build |
| `examples/solid/src/session.ts` | Reference consumer using `SpotifyBrowser` |

### Package exports

```json
{
  ".": "src/index.ts",
  "./browser": "src/browser/index.ts"
}
```

Built with `tsup src/index.ts src/browser/index.ts --format cjs,esm --dts`.

## Tradeoffs accepted

### Mutable token state inside the service

`SpotifyBrowser.layer()` captures a mutable `currentToken` variable. When `auth.exchangeCode()` or `auth.setTokens()` is called, it updates this variable so subsequent API calls use the new token.

This breaks Effect's purity philosophy — the service has hidden mutable state. We accepted this because:
- Browser auth flows are inherently stateful (tokens arrive via redirect, stored in localStorage)
- The alternative (rebuilding the layer after every token change) would be impractical for consumers
- The state is scoped to the layer instance, not global

**Known issue:** The token is captured at layer construction time in `getCredentials()`, which is called once when building `spotifyLayer`. This means `currentToken` mutations may not propagate to the underlying `SpotifySession` service. This needs testing — if the session service caches the initial credentials, token refresh won't work correctly. A fix would involve either rebuilding the layer per-call or using a `Ref`/`SynchronizedRef` for the token.

### `makeSpotifyBrowserLayer` still exported

Power users who want the layer-based approach (e.g., composing with custom layers, testing with mock HTTP clients) can still import `makeSpotifyBrowserLayer`. The `SpotifyBrowser` service is the recommended API but not the only option.

### All 71 methods exposed

Every domain service method is available on `SpotifyBrowser`. We chose full parity over a curated subset because:
- The domain services are resolved directly from the layer — no manual delegation code to maintain
- Consumers discover the API via autocomplete on the namespace objects

### Browser globals in the service

`SpotifyBrowser` references `window.location.origin` as a default for `redirectUri` and `window.location.href` in `clearCallbackParams`. This is intentional — the browser subpath is explicitly for browser environments.

## Future work

- **Token refresh integration**: `auth.refreshToken()` exists but isn't automatically triggered on 401s. The SvelteKit example has an auto-refresh fiber pattern in `SpotifySession` — something similar could be built into `SpotifyBrowser`.
- **Non-Effect wrapper**: A Promise-based API that hides Effect entirely (`spotify.users.getCurrentUserProfile()` returns `Promise<PrivateUser>`) for consumers who don't want Effect in their app code.
- **Token propagation**: Verify that `currentToken` mutations after `exchangeCode` actually reach the underlying HTTP client. If `SpotifySession` caches the initial access token from layer construction, we'll need to refactor to use a shared `Ref`.
