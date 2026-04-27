import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";
import { makeSpotifyLayer } from "../makeSpotifyLayer";
import { SpotifyRateLimitError } from "../errors/SpotifyError";
import { makeTestHttpClient } from "../test/TestHttpClient";
import { SpotifyRequest, type SpotifyRequestService } from "./SpotifyRequest";

const requestEffect = <A>(
  run: (request: SpotifyRequestService) => Effect.Effect<A, unknown>,
  options: Parameters<typeof makeSpotifyLayer>[0],
  credentials: Parameters<typeof makeSpotifyLayer>[1],
  httpClientLayer: ReturnType<typeof makeTestHttpClient>["layer"],
) =>
  Effect.gen(function* () {
    const request = yield* SpotifyRequest;
    return yield* run(request);
  }).pipe(Effect.provide(makeSpotifyLayer({ ...options, httpClientLayer }, credentials)));

describe("SpotifyRequest", () => {
  it("maps non-2xx responses to SpotifyHttpError", async () => {
    const { layer } = makeTestHttpClient(
      () =>
        new Response(JSON.stringify({ error: { status: 404, message: "Track not found" } }), {
          status: 404,
          headers: { "content-type": "application/json" },
        }),
    );

    const error = await Effect.runPromise(
      Effect.flip(
        requestEffect(
          (request) => request.getJson("/tracks/missing"),
          {},
          { accessToken: "token" },
          layer,
        ),
      ),
    );

    expect(error).toMatchObject({
      _tag: "SpotifyHttpError",
      status: 404,
      method: "GET",
      url: "https://api.spotify.com/v1/tracks/missing",
      apiMessage: "Track not found",
    });
  });

  it("invalidates and retries with a refreshed token on unauthorized responses", async () => {
    let attempt = 0;
    const { layer, requests } = makeTestHttpClient((request) => {
      const url = request.url.toString();

      if (url === "https://accounts.spotify.com/api/token") {
        return new Response(
          JSON.stringify({
            access_token: "fresh-token",
            token_type: "Bearer",
            expires_in: 1800,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

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

    const response = await Effect.runPromise(
      requestEffect(
        (request) => request.getJson("/tracks/retry"),
        { clientId: "client-id", clientSecret: "client-secret" },
        { accessToken: "stale-token", refreshToken: "refresh-token" },
        layer,
      ),
    );

    expect(response).toEqual({ ok: true });
    expect(requests[0]?.headers.authorization).toBe("Bearer stale-token");
    expect(requests[2]?.headers.authorization).toBe("Bearer fresh-token");
  });

  it("retries 429 responses and eventually succeeds", async () => {
    let attempt = 0;
    const { layer, requests } = makeTestHttpClient(() => {
      attempt += 1;

      if (attempt <= 2) {
        return new Response(JSON.stringify({ error: { status: 429, message: "Rate limited" } }), {
          status: 429,
          headers: { "content-type": "application/json", "retry-after": "0" },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const response = await Effect.runPromise(
      requestEffect(
        (request) => request.getJson("/tracks/ratelimit"),
        { retry: { maxRetries: 3, baseDelayMs: 1 } },
        { accessToken: "token" },
        layer,
      ),
    );

    expect(response).toEqual({ ok: true });
    expect(requests).toHaveLength(3);
  });

  it("returns SpotifyRateLimitError with retry-after when retries are exhausted", async () => {
    const { layer } = makeTestHttpClient(
      () =>
        new Response(JSON.stringify({ error: { status: 429, message: "Rate limited" } }), {
          status: 429,
          headers: { "content-type": "application/json", "retry-after": "1" },
        }),
    );

    const error = await Effect.runPromise(
      Effect.flip(
        requestEffect(
          (request) => request.getJson("/tracks/ratelimit"),
          { retry: { maxRetries: 0, baseDelayMs: 1 } },
          { accessToken: "token" },
          layer,
        ),
      ),
    );

    expect(error).toEqual(
      new SpotifyRateLimitError({
        method: "GET",
        url: "https://api.spotify.com/v1/tracks/ratelimit",
        retryAfterSeconds: 1,
      }),
    );
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

    const response = await Effect.runPromise(
      requestEffect(
        (request) => request.getJson("/tracks/servererror"),
        { retry: { maxRetries: 3, baseDelayMs: 1 } },
        { accessToken: "token" },
        layer,
      ),
    );

    expect(response).toEqual({ ok: true });
    expect(attempt).toBe(3);
  });
});
