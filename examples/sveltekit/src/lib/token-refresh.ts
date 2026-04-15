import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Duration from "effect/Duration";
import * as Schedule from "effect/Schedule";
import type { Session } from "./session.svelte";

const REFRESH_BUFFER_MS = 5 * 60 * 1000;
const MIN_SLEEP_MS = 10 * 1000;

let fiber: Fiber.Fiber<number> | null = null;

const makeRefreshLoop = (session: Session) =>
  Effect.gen(function* () {
    const expiresIn = session.tokenExpiresIn;
    if (expiresIn === null) return;

    const sleepMs = Math.max(expiresIn - REFRESH_BUFFER_MS, MIN_SLEEP_MS);
    yield* Effect.sleep(Duration.millis(sleepMs));
    yield* Effect.tryPromise({
      try: () => session.refreshTokens(),
      catch: () => new Error("Token refresh failed"),
    });
  }).pipe(Effect.ignore(), Effect.repeat(Schedule.forever));

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
