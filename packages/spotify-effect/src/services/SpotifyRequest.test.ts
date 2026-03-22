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
      getAccessToken: () => "token",
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
});
