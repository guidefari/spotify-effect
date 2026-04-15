import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Duration from "effect/Duration";
import type { Session } from "./session.svelte";

const REFRESH_BUFFER_MS = 5 * 60 * 1000;
const MIN_SLEEP_MS = 10 * 1000;
const MAX_REFRESH_FAILURES = 3;

let fiber: Fiber.Fiber<void> | null = null;

const makeRefreshLoop = (session: Session) =>
  Effect.gen(function* () {
    while (session.isLoggedIn) {
      const expiresIn = session.tokenExpiresIn;
      if (expiresIn === null) return;

      const sleepMs = Math.max(expiresIn - REFRESH_BUFFER_MS, MIN_SLEEP_MS);
      yield* Effect.sleep(Duration.millis(sleepMs));

      yield* Effect.tryPromise({
        try: () => session.refreshTokens(),
        catch: () => new Error("Token refresh failed"),
      }).pipe(Effect.retry({ times: MAX_REFRESH_FAILURES - 1 }));
    }
  }).pipe(Effect.ignore());

export function startAutoRefresh(session: Session): void {
  stopAutoRefresh();
  fiber = Effect.runFork(makeRefreshLoop(session));
}

export function stopAutoRefresh(): void {
  if (fiber) {
    Effect.runFork(Fiber.interrupt(fiber));
    fiber = null;
  }
}
