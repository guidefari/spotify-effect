import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";
import { makeSpotifyLayer } from "../makeSpotifyLayer";
import { SpotifyConfigurationError, makeSpotifyHttpError } from "../errors/SpotifyError";
import { makeTestHttpClient } from "../test/TestHttpClient";
import { SpotifyAuth, type SpotifyAuthService } from "./SpotifyAuth";

const authEffect = <A>(
  run: (auth: SpotifyAuthService) => Effect.Effect<A, unknown>,
  options: Parameters<typeof makeSpotifyLayer>[0],
  httpClientLayer: ReturnType<typeof makeTestHttpClient>["layer"],
) =>
  Effect.gen(function* () {
    const auth = yield* SpotifyAuth;
    return yield* run(auth);
  }).pipe(Effect.provide(makeSpotifyLayer({ ...options, httpClientLayer })));

describe("SpotifyAuth", () => {
  it("requests refreshable user tokens with authorization code flow", async () => {
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
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );

    const tokens = await Effect.runPromise(
      authEffect(
        (auth) => auth.getRefreshableUserTokens("auth-code"),
        {
          clientId: "client-id",
          clientSecret: "client-secret",
          redirectUri: "https://example.com/callback",
        },
        layer,
      ),
    );

    expect(tokens.refresh_token).toBe("refresh-token");
    expect(requests[0]?.body).toBe(
      "code=auth-code&grant_type=authorization_code&redirect_uri=https%3A%2F%2Fexample.com%2Fcallback",
    );
  });

  it("requests refreshable user tokens with PKCE flow", async () => {
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
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );

    await Effect.runPromise(
      authEffect(
        (auth) =>
          auth.getRefreshableUserTokensWithPkce({
            clientId: "browser-client-id",
            code: "auth-code",
            codeVerifier: "code-verifier",
          }),
        {
          clientId: "client-id",
          clientSecret: "client-secret",
          redirectUri: "https://example.com/callback",
        },
        layer,
      ),
    );

    expect(requests[0]?.headers.authorization).toBeUndefined();
    expect(requests[0]?.body).toBe(
      "client_id=browser-client-id&code=auth-code&code_verifier=code-verifier&grant_type=authorization_code&redirect_uri=https%3A%2F%2Fexample.com%2Fcallback",
    );
  });

  it("requests refreshed access tokens", async () => {
    const { layer, requests } = makeTestHttpClient(
      () =>
        new Response(
          JSON.stringify({
            access_token: "refreshed-token",
            token_type: "Bearer",
            expires_in: 1800,
            scope: "user-read-private",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );

    const tokens = await Effect.runPromise(
      authEffect(
        (auth) => auth.getRefreshedAccessToken("refresh-token"),
        { clientId: "client-id", clientSecret: "client-secret" },
        layer,
      ),
    );

    expect(tokens.access_token).toBe("refreshed-token");
    expect(requests[0]?.body).toBe("grant_type=refresh_token&refresh_token=refresh-token");
  });

  it("requests temporary app tokens with client credentials", async () => {
    const { layer, requests } = makeTestHttpClient(
      () =>
        new Response(
          JSON.stringify({
            access_token: "temporary-token",
            token_type: "Bearer",
            expires_in: 3600,
            scope: "",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );

    const tokens = await Effect.runPromise(
      authEffect(
        (auth) => auth.getTemporaryAppTokens(),
        { clientId: "client-id", clientSecret: "client-secret" },
        layer,
      ),
    );

    expect(tokens.access_token).toBe("temporary-token");
    expect(requests[0]?.headers.authorization).toBe("Basic Y2xpZW50LWlkOmNsaWVudC1zZWNyZXQ=");
    expect(requests[0]?.body).toBe("grant_type=client_credentials");
  });

  it("maps token endpoint failures to SpotifyHttpError", async () => {
    const { layer } = makeTestHttpClient(
      () =>
        new Response(JSON.stringify({ error: "invalid_client", error_description: "Invalid client" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        }),
    );

    const error = await Effect.runPromise(
      Effect.flip(
        authEffect(
          (auth) => auth.getTemporaryAppTokens(),
          { clientId: "client-id", clientSecret: "client-secret" },
          layer,
        ),
      ),
    );

    expect(error).toEqual(
      makeSpotifyHttpError({
        status: 401,
        method: "POST",
        url: "https://accounts.spotify.com/api/token",
        apiMessage: "Invalid client",
        body: { error: "invalid_client", error_description: "Invalid client" },
      }),
    );
  });

  it("requires redirectUri for authorization code exchange", async () => {
    const { layer } = makeTestHttpClient(() => new Response(null, { status: 500 }));

    const error = await Effect.runPromise(
      Effect.flip(
        authEffect(
          (auth) => auth.getRefreshableUserTokens("auth-code"),
          { clientId: "client-id", clientSecret: "client-secret" },
          layer,
        ),
      ),
    );

    expect(error).toEqual(
      new SpotifyConfigurationError({
        message: "redirectUri is required for authorization code exchange",
      }),
    );
  });
});
