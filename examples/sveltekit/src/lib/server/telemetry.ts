import * as Effect from "effect/Effect";
import * as ManagedRuntime from "effect/ManagedRuntime";
import { makeNodeTelemetryLayer } from "@spotify-effect/otel-node";

const isTracingEnabled = (): boolean => process.env.SPOTIFY_EFFECT_TRACE === "1";

const telemetryRuntime = isTracingEnabled()
  ? ManagedRuntime.make(makeNodeTelemetryLayer("spotify-effect-example-sveltekit"))
  : undefined;

export type TracedResult<A> = {
  data: A | null;
  error: string | null;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const parts: string[] = [];

    if ("_tag" in error && typeof error._tag === "string") {
      parts.push(error._tag);
    }

    if ("description" in error && typeof error.description === "string" && error.description.length > 0) {
      parts.push(error.description);
    }

    if ("method" in error && typeof error.method === "string") {
      parts.push(error.method);
    }

    if ("url" in error && typeof error.url === "string") {
      parts.push(error.url);
    }

    if (parts.length > 0) {
      return parts.join(" · ");
    }

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
};

const getErrorDetails = (error: unknown): string | null => {
  if (error instanceof Error && error.stack) {
    return error.stack;
  }

  if (typeof error === "object" && error !== null) {
    try {
      return JSON.stringify(error, null, 2);
    } catch {
      return null;
    }
  }

  return null;
};

export const logServerError = (label: string, error: unknown): void => {
  const summary = getErrorMessage(error);
  console.error(`[${label}] ${summary}`);

  if (process.env.SPOTIFY_EFFECT_VERBOSE_ERRORS === "1") {
    const details = getErrorDetails(error);
    if (details) {
      console.error(details);
    }
  }
};

export const runTraced = <A, E>(effect: Effect.Effect<A, E>, spanName: string): Promise<A> => {
  const traced = Effect.withSpan(effect, spanName);
  const promise = telemetryRuntime !== undefined
    ? telemetryRuntime.runPromise(traced)
    : Effect.runPromise(traced);
  return promise.catch((error) => {
    logServerError(spanName, error);
    throw error;
  });
};

export const runTracedResult = async <A, E>(
  effect: Effect.Effect<A, E>,
  spanName: string,
): Promise<TracedResult<A>> => {
  try {
    return { data: await runTraced(effect, spanName), error: null };
  } catch (error) {
    return { data: null, error: getErrorMessage(error) };
  }
};

export const runTracedPromise = <A>(spanName: string, run: () => Promise<A>): Promise<A> =>
  runTraced(
    Effect.tryPromise({
      try: run,
      catch: (error) => error,
    }),
    spanName,
  );
