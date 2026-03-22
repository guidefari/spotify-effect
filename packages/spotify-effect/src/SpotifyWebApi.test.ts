import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";
import { AUTHORIZE_URL } from "./constants";
import { SpotifyConfigurationError } from "./errors/SpotifyError";
import { currentUserProfileFixture } from "./fixtures/currentUserProfileFixture";
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

  it("gets an authorization code URL", () => {
    const spotify = new SpotifyWebApi({ clientId: "foo", redirectUri: "baz" })

    expect(spotify.getAuthorizationCodeUrl()).toBe(
      `${AUTHORIZE_URL}?client_id=foo&redirect_uri=baz&response_type=code`,
    )
    expect(spotify.getAuthorizationCodeUrl({ state: "qux" })).toBe(
      `${AUTHORIZE_URL}?client_id=foo&redirect_uri=baz&response_type=code&state=qux`,
    )
  })

  it("gets a PKCE authorization URL", () => {
    const spotify = new SpotifyWebApi({ clientId: "foo", redirectUri: "baz" })

    expect(
      spotify.getAuthorizationCodePKCEUrl("foo", {
        code_challenge: "challenge",
        code_challenge_method: "S256",
        state: "state",
      }),
    ).toBe(
      `${AUTHORIZE_URL}?client_id=foo&redirect_uri=baz&response_type=code&state=state&code_challenge=challenge&code_challenge_method=S256`,
    )
  })

  it("gets a temporary authorization URL", () => {
    const spotify = new SpotifyWebApi({ clientId: "foo", redirectUri: "baz" })

    expect(spotify.getTemporaryAuthorizationUrl()).toBe(
      `${AUTHORIZE_URL}?client_id=foo&redirect_uri=baz&response_type=token`,
    )
  })

  it("exchanges an authorization code and stores refreshable tokens", async () => {
    const { layer, requests } = makeTestHttpClient(
      () =>
        new Response(
          JSON.stringify({
            access_token: "user-token",
            token_type: "Bearer",
            expires_in: 3600,
            scope: "user-read-private",
            refresh_token: "refresh-token",
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
    )

    const spotify = new SpotifyWebApi({
      clientId: "foo",
      clientSecret: "bar",
      redirectUri: "baz",
      httpClientLayer: layer,
    })

    const tokens = await Effect.runPromise(spotify.getTokenWithAuthenticateCode("qux"))

    expect(tokens.refresh_token).toBe("refresh-token")
    expect(spotify.getAccessToken()).toBe("user-token")
    expect(requests[0]?.body).toBe("code=qux&grant_type=authorization_code&redirect_uri=baz")
  })

  it("exchanges a PKCE authorization code", async () => {
    const { layer, requests } = makeTestHttpClient(
      () =>
        new Response(
          JSON.stringify({
            access_token: "user-token",
            token_type: "Bearer",
            expires_in: 3600,
            scope: "user-read-private",
            refresh_token: "refresh-token",
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
    )

    const spotify = new SpotifyWebApi({ redirectUri: "baz", httpClientLayer: layer })

    await Effect.runPromise(spotify.getTokenWithAuthenticateCodePKCE("qux", "verifier", "browser-id"))

    expect(requests[0]?.body).toBe(
      "client_id=browser-id&code=qux&code_verifier=verifier&grant_type=authorization_code&redirect_uri=baz",
    )
    expect(requests[0]?.headers.authorization).toBeUndefined()
  })

  it("refreshes an expired access token automatically for requests", async () => {
    let tokenRequests = 0
    const { layer, requests } = makeTestHttpClient((request) => {
      if (request.url === "https://accounts.spotify.com/api/token") {
        tokenRequests += 1

        return new Response(
          JSON.stringify({
            access_token: "refreshed-user-token",
            token_type: "Bearer",
            expires_in: 3600,
            scope: "user-read-private",
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        )
      }

      return new Response(JSON.stringify(trackFixture), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    })

    const spotify = new SpotifyWebApi(
      {
        clientId: "foo",
        clientSecret: "bar",
        redirectUri: "baz",
        httpClientLayer: layer,
      },
      {
        accessToken: "stale-token",
        accessTokenExpiresAt: Date.now() - 1000,
        refreshToken: "refresh-token",
      },
    )

    const track = await Effect.runPromise(spotify.tracks.getTrack("foo"))

    expect(track).toEqual(trackFixture)
    expect(tokenRequests).toBe(1)
    expect(requests[1]?.headers.authorization).toBe("Bearer refreshed-user-token")
  })

  it("gets the current user profile with refreshable user tokens", async () => {
    const { layer, requests } = makeTestHttpClient((request) => {
      if (request.url === "https://accounts.spotify.com/api/token") {
        return new Response(
          JSON.stringify({
            access_token: "fresh-user-token",
            token_type: "Bearer",
            expires_in: 3600,
            scope: "user-read-private",
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        )
      }

      return new Response(JSON.stringify(currentUserProfileFixture), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    })

    const spotify = new SpotifyWebApi(
      {
        clientId: "foo",
        clientSecret: "bar",
        redirectUri: "baz",
        httpClientLayer: layer,
      },
      {
        accessToken: "expired-token",
        accessTokenExpiresAt: Date.now() - 1000,
        refreshToken: "refresh-token",
      },
    )

    const profile = await Effect.runPromise(spotify.users.getCurrentUserProfile())

    expect(profile).toEqual(currentUserProfileFixture)
    expect(requests[1]?.url).toBe("https://api.spotify.com/v1/me")
    expect(requests[1]?.headers.authorization).toBe("Bearer fresh-user-token")
  })

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
