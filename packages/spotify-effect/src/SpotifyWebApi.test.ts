import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";
import { SpotifyConfigurationError } from "./errors/SpotifyError";
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

  it("acquires and reuses temporary app tokens for client credentials requests", async () => {
    let tokenRequests = 0;

    const { layer, requests } = makeTestHttpClient((request) => {
      if (request.url === "https://accounts.spotify.com/api/token") {
        tokenRequests += 1;

        return new Response(
          JSON.stringify({
            access_token: "temporary-token",
            token_type: "Bearer",
            expires_in: 3600,
            scope: "",
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify(trackFixture), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const spotify = new SpotifyWebApi(
      { clientId: "client-id", clientSecret: "client-secret", httpClientLayer: layer },
      undefined,
    );

    const firstTrack = await Effect.runPromise(spotify.tracks.getTrack("foo"));
    const secondTrack = await Effect.runPromise(spotify.tracks.getTrack("bar"));

    expect(firstTrack).toEqual(trackFixture);
    expect(secondTrack).toEqual(trackFixture);
    expect(tokenRequests).toBe(1);
    expect(requests[1]?.headers.authorization).toBe("Bearer temporary-token");
    expect(requests[2]?.headers.authorization).toBe("Bearer temporary-token");
  });

  it("gets temporary app tokens directly", async () => {
    const { layer, requests } = makeTestHttpClient(
      (request) =>
        request.url === "https://accounts.spotify.com/api/token"
          ? new Response(
              JSON.stringify({
                access_token: "temporary-token",
                token_type: "Bearer",
                expires_in: 3600,
                scope: "",
              }),
              {
                status: 200,
                headers: { "content-type": "application/json" },
              },
            )
          : new Response(null, { status: 500 }),
    );

    const spotify = new SpotifyWebApi({
      clientId: "client-id",
      clientSecret: "client-secret",
      httpClientLayer: layer,
    });

    const tokens = await Effect.runPromise(spotify.getTemporaryAppTokens());

    expect(tokens.access_token).toBe("temporary-token");
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://accounts.spotify.com/api/token");
  });

  it("surfaces a configuration error when no auth configuration is provided", async () => {
    const spotify = new SpotifyWebApi();

    const error = await Effect.runPromise(Effect.flip(spotify.tracks.getTrack("foo")));

    expect(error).toEqual(
      new SpotifyConfigurationError({
        message: "Provide an access token or configure clientId and clientSecret",
      }),
    );
  });
});
