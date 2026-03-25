# Plan: Centralized Retry and Rate-Limit Handling (#16)

## Context

All Spotify API calls go through `makeSpotifyRequest` in `SpotifyRequest.ts`. Currently there's no retry logic for transient failures (5xx, network errors) or rate limits (429). The only retry is a hardcoded single-retry on 401 for token refresh. The upstream library has no retry handling either — this is an enhancement.

Spotify returns `429` with a `Retry-After` header (seconds). The existing code already reads this header for OTel annotation but doesn't act on it.

## Approach

### 1. New error: `SpotifyRateLimitError`

**File:** `packages/spotify-effect/src/errors/SpotifyError.ts`

Add a new tagged error for when 429 retries are exhausted:

```typescript
export class SpotifyRateLimitError extends Data.TaggedError("SpotifyRateLimitError")<{
  readonly method: string;
  readonly url: string;
  readonly retryAfterSeconds: number;
}> {}
```

Add to `SpotifyRequestError` union. Add `isRetryableError` helper that returns true for `SpotifyTransportError` and `SpotifyHttpError` with status 429 or >= 500.

### 2. Retry config type

**File:** `packages/spotify-effect/src/services/SpotifyRequest.ts`

```typescript
export interface SpotifyRetryConfig {
  readonly maxRetries?: number; // default: 3
  readonly baseDelayMs?: number; // default: 1000
  readonly maxDelayMs?: number; // default: 30000
}
```

Passed into `makeSpotifyRequest` as optional second arg. Sensible defaults — works out of the box with no config.

### 3. Refactor `makeSpotifyRequest` — the core change

**File:** `packages/spotify-effect/src/services/SpotifyRequest.ts`

The two methods (`getJson`, `getJsonWithSchema`) are ~40 lines each and nearly identical — they differ only in the decode step. Refactor into a shared `executeRequest` helper parameterized by a decode function.

**Retry wrapping strategy:**

```
executeRequest(token, path, decode, options)
  = sendRequest(token, path, options)
  → annotate response
  → 2xx: decode(response)
  → 429: sleep(Retry-After), then fail (retryable)
  → 5xx: fail (retryable)
  → 4xx: fail (not retryable)

withRetry(fn)
  = Effect.retry(fn, { schedule: exponentialBackoff, while: isRetryableError })
  → if 429 retries exhausted: convert to SpotifyRateLimitError

Full flow for getJson/getJsonWithSchema:
  1. Get access token
  2. withRetry(executeRequest(token, ...))
  3. If 401: invalidate token, get fresh token, withRetry(executeRequest(freshToken, ...))
```

The 401 auth-retry stays separate and wraps the retryable block — both the initial attempt and the auth-retry get transient-failure retries.

**429 delay handling:** When we get a 429, sleep for `Retry-After` seconds inside the retried effect before re-failing. The schedule adds a small extra delay on top, which is acceptable. Not worth the complexity of a custom schedule to avoid it.

**Schedule:** `Schedule.exponential(baseDelayMs, 2)` capped at `maxDelayMs`, intersected with `Schedule.recurs(maxRetries)`.

### 4. Thread config through the facade

**File:** `packages/spotify-effect/src/SpotifyWebApi.ts`

Add optional `retry?: SpotifyRetryConfig` to `SpotifyWebApiOptions`. Pass it to `makeSpotifyRequest(accessTokenResolver, options.retry)`.

### 5. Exports

**File:** `packages/spotify-effect/src/index.ts`

Export `SpotifyRateLimitError` and `SpotifyRetryConfig`.

### 6. Tests

**File:** `packages/spotify-effect/src/services/SpotifyRequest.test.ts`

- 429 with Retry-After → retried and succeeds
- 429 retries exhausted → `SpotifyRateLimitError` with `retryAfterSeconds`
- 500 → retried with backoff and succeeds
- 500 retries exhausted → `SpotifyHttpError`
- Transport error → retried
- 400/403 → NOT retried
- 401 auth-retry still works (existing test preserved)
- Custom retry config (e.g., `maxRetries: 0`) disables retry

### 7. OTel annotations

Inside the retry loop, annotate spans with:

- `spotify.retry.attempt` — attempt number (via a `Ref` counter)
- `spotify.retry.exhausted` — true when retries run out

The existing `spotify.http.retry_after` annotation stays.

## File Changes

| File                                                          | Change                                                                              |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `packages/spotify-effect/src/errors/SpotifyError.ts`          | Add `SpotifyRateLimitError`, `isRetryableError`, update union                       |
| `packages/spotify-effect/src/services/SpotifyRequest.ts`      | Add `SpotifyRetryConfig`, refactor into shared `executeRequest`, add retry wrapping |
| `packages/spotify-effect/src/SpotifyWebApi.ts`                | Add `retry` to options, pass through                                                |
| `packages/spotify-effect/src/index.ts`                        | Export new types                                                                    |
| `packages/spotify-effect/src/services/SpotifyRequest.test.ts` | Add retry/rate-limit tests                                                          |

## Verification

1. `bun run test` — all existing + new tests pass
2. `bun run typecheck` — no type errors
3. `bun run build` — builds cleanly
4. `bun run example:basic -- --help` — still works (default retry config, no visible change)
