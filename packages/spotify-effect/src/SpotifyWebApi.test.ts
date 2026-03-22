import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";
import { SpotifyWebApi } from "./SpotifyWebApi";
import { trackFixture } from "./fixtures/trackFixture";
import { makeTestHttpClient } from "./test/TestHttpClient";

describe("SpotifyWebApi", () => {
  it("constructs a SpotifyWebApi instance with access token credentials", () => {
    const spotify = new SpotifyWebApi(
      {
        clientId: "foo",
        clientSecret: "bar",
        redirectUri: "baz",
      },
      {
        accessToken: "token",
      },
    );

    expect(spotify.getAccessToken()).toBe("token");
    expect(spotify.clientId).toBe("foo");
    expect(spotify.clientSecret).toBe("bar");
    expect(spotify.redirectUri).toBe("baz");
  });

  it("gets and sets the access token", () => {
    const spotify = new SpotifyWebApi({}, { accessToken: "token" });

    expect(spotify.getAccessToken()).toBe("token");
    spotify.setAccessToken("newToken");
    expect(spotify.getAccessToken()).toBe("newToken");
  });

  it("fetches a track through the parity-style client", async () => {
    const { layer, requests } = makeTestHttpClient(
      () =>
        new Response(JSON.stringify(trackFixture), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );

    const spotify = new SpotifyWebApi({ httpClientLayer: layer }, { accessToken: "token" });
    const track = await Effect.runPromise(spotify.tracks.getTrack("foo"));

    expect(track).toEqual(trackFixture);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://api.spotify.com/v1/tracks/foo");
    expect(requests[0]?.headers.authorization).toBe("Bearer token");
  });
});
