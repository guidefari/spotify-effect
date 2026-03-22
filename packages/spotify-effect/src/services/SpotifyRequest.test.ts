import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";
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
    let attempt = 0
    let invalidated = false
    const { layer } = makeTestHttpClient(() => {
      attempt += 1

      if (attempt === 1) {
        return new Response(JSON.stringify({ error: { status: 401, message: "Unauthorized" } }), {
          status: 401,
          headers: { "content-type": "application/json" },
        })
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    })

    const request = makeSpotifyRequest({
      getAccessToken: () => Effect.succeed(invalidated ? "fresh-token" : "stale-token"),
      invalidateAccessToken: () =>
        Effect.sync(() => {
          invalidated = true
        }),
    })

    const response = await Effect.runPromise(
      request.getJson<{ ok: boolean }>("/tracks/retry").pipe(Effect.provide(layer)),
    )

    expect(response).toEqual({ ok: true })
    expect(attempt).toBe(2)
    expect(invalidated).toBe(true)
  })
});
