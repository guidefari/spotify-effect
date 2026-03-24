import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";
import { SpotifyRateLimitError } from "../errors/SpotifyError";
import { makeTestHttpClient } from "../test/TestHttpClient";
import { makeSpotifyRequest } from "./SpotifyRequest";

describe("makeSpotifyRequest", () => {
  it("maps non-2xx responses to SpotifyHttpError", async () => {
    const { layer } = makeTestHttpClient(
      () =>
        new Response(JSON.stringify({ error: { status: 404, message: "Track not found" } }), {
          status: 404,
          headers: { "content-type": "application/json" },
        }),
    );

    const request = makeSpotifyRequest({
      getAccessToken: () => Effect.succeed("token"),
      invalidateAccessToken: () => Effect.void,
    });

    const error = await Effect.runPromise(
      request.getJson<unknown>("/tracks/missing").pipe(Effect.flip, Effect.provide(layer)),
    );

    expect(error).toMatchObject({
      _tag: "SpotifyHttpError",
      status: 404,
      method: "GET",
      url: "https://api.spotify.com/v1/tracks/missing",
      apiMessage: "Track not found",
      body: { error: { status: 404, message: "Track not found" } },
    });
  });

  it("invalidates and retries once on unauthorized responses", async () => {
    let attempt = 0;
    let invalidated = false;
    const { layer } = makeTestHttpClient(() => {
      attempt += 1;

      if (attempt === 1) {
        return new Response(JSON.stringify({ error: { status: 401, message: "Unauthorized" } }), {
          status: 401,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const request = makeSpotifyRequest({
      getAccessToken: () => Effect.succeed(invalidated ? "fresh-token" : "stale-token"),
      invalidateAccessToken: () =>
        Effect.sync(() => {
          invalidated = true;
        }),
    });

    const response = await Effect.runPromise(
      request.getJson<{ ok: boolean }>("/tracks/retry").pipe(Effect.provide(layer)),
    );

    expect(response).toEqual({ ok: true });
    expect(attempt).toBe(2);
    expect(invalidated).toBe(true);
  });

  it("retries 429 with Retry-After header and eventually succeeds", async () => {
    let attempt = 0;
    const { layer, requests } = makeTestHttpClient(() => {
      attempt += 1;

      if (attempt <= 2) {
        return new Response(JSON.stringify({ error: { status: 429, message: "Rate limited" } }), {
          status: 429,
          headers: { "content-type": "application/json", "retry-after": "1" },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const request = makeSpotifyRequest(
      {
        getAccessToken: () => Effect.succeed("token"),
        invalidateAccessToken: () => Effect.void,
      },
      { maxRetries: 3, baseDelayMs: 10 },
    );

    const response = await Effect.runPromise(
      request.getJson<{ ok: boolean }>("/tracks/ratelimit").pipe(Effect.provide(layer)),
    );

    expect(response).toEqual({ ok: true });
    expect(attempt).toBe(3);
    expect(requests).toHaveLength(3);
  });

  it("returns SpotifyRateLimitError when 429 retries are exhausted", async () => {
    const { layer } = makeTestHttpClient(() =>
      new Response(JSON.stringify({ error: { status: 429, message: "Rate limited" } }), {
        status: 429,
        headers: { "content-type": "application/json", "retry-after": "0" },
      }),
    );

    const request = makeSpotifyRequest(
      {
        getAccessToken: () => Effect.succeed("token"),
        invalidateAccessToken: () => Effect.void,
      },
      { maxRetries: 2, baseDelayMs: 10 },
    );

    const error = await Effect.runPromise(
      request.getJson<unknown>("/tracks/ratelimit").pipe(Effect.flip, Effect.provide(layer)),
    );

    expect(error).toMatchObject({
      _tag: "SpotifyRateLimitError",
      method: "GET",
      url: "https://api.spotify.com/v1/tracks/ratelimit",
    });
  });

  it("retries 500 errors with exponential backoff and eventually succeeds", async () => {
    let attempt = 0;
    const { layer } = makeTestHttpClient(() => {
      attempt += 1;

      if (attempt <= 2) {
        return new Response(JSON.stringify({ error: { status: 500, message: "Internal error" } }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const request = makeSpotifyRequest(
      {
        getAccessToken: () => Effect.succeed("token"),
        invalidateAccessToken: () => Effect.void,
      },
      { maxRetries: 3, baseDelayMs: 10 },
    );

    const response = await Effect.runPromise(
      request.getJson<{ ok: boolean }>("/tracks/servererror").pipe(Effect.provide(layer)),
    );

    expect(response).toEqual({ ok: true });
    expect(attempt).toBe(3);
  });

  it("returns SpotifyHttpError when 500 retries are exhausted", async () => {
    const { layer } = makeTestHttpClient(() =>
      new Response(JSON.stringify({ error: { status: 500, message: "Internal error" } }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    );

    const request = makeSpotifyRequest(
      {
        getAccessToken: () => Effect.succeed("token"),
        invalidateAccessToken: () => Effect.void,
      },
      { maxRetries: 2, baseDelayMs: 10 },
    );

    const error = await Effect.runPromise(
      request.getJson<unknown>("/tracks/servererror").pipe(Effect.flip, Effect.provide(layer)),
    );

    expect(error).toMatchObject({
      _tag: "SpotifyHttpError",
      status: 500,
      method: "GET",
    });
  });

  it("does NOT retry 400/403 errors", async () => {
    let requestCount = 0;
    const { layer } = makeTestHttpClient(() => {
      requestCount += 1;
      return new Response(JSON.stringify({ error: { status: 400, message: "Bad request" } }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    });

    const request = makeSpotifyRequest(
      {
        getAccessToken: () => Effect.succeed("token"),
        invalidateAccessToken: () => Effect.void,
      },
      { maxRetries: 3, baseDelayMs: 10 },
    );

    const error = await Effect.runPromise(
      request.getJson<unknown>("/tracks/badrequest").pipe(Effect.flip, Effect.provide(layer)),
    );

    expect(error).toMatchObject({
      _tag: "SpotifyHttpError",
      status: 400,
    });
    expect(requestCount).toBe(1);
  });

  it("custom retry config with maxRetries: 0 disables retry", async () => {
    let requestCount = 0;
    const { layer } = makeTestHttpClient(() => {
      requestCount += 1;
      return new Response(JSON.stringify({ error: { status: 500, message: "Server error" } }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    });

    const request = makeSpotifyRequest(
      {
        getAccessToken: () => Effect.succeed("token"),
        invalidateAccessToken: () => Effect.void,
      },
      { maxRetries: 0 },
    );

    const error = await Effect.runPromise(
      request.getJson<unknown>("/tracks/error").pipe(Effect.flip, Effect.provide(layer)),
    );

    expect(error).toMatchObject({
      _tag: "SpotifyHttpError",
      status: 500,
    });
    expect(requestCount).toBe(1);
  });

  it("401 auth-retry works with retryable errors in both attempts", async () => {
    let attempt = 0;
    let invalidated = false;
    const { layer } = makeTestHttpClient(() => {
      attempt += 1;

      if (attempt === 1) {
        return new Response(JSON.stringify({ error: { status: 401, message: "Unauthorized" } }), {
          status: 401,
          headers: { "content-type": "application/json" },
        });
      }

      if (attempt === 2) {
        return new Response(JSON.stringify({ error: { status: 500, message: "Server error" } }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const request = makeSpotifyRequest(
      {
        getAccessToken: () => Effect.succeed(invalidated ? "fresh-token" : "stale-token"),
        invalidateAccessToken: () =>
          Effect.sync(() => {
            invalidated = true;
          }),
      },
      { maxRetries: 2, baseDelayMs: 10 },
    );

    const response = await Effect.runPromise(
      request.getJson<{ ok: boolean }>("/tracks/auth-retry").pipe(Effect.provide(layer)),
    );

    expect(response).toEqual({ ok: true });
    expect(attempt).toBe(3);
    expect(invalidated).toBe(true);
  });
});
