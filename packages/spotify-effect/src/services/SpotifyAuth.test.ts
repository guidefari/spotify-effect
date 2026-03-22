import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";
import { makeSpotifyHttpError } from "../errors/SpotifyError";
import { makeTestHttpClient } from "../test/TestHttpClient";
import { makeSpotifyAuth } from "./SpotifyAuth";

describe("SpotifyAuth", () => {
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
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
    );

    const auth = makeSpotifyAuth({ clientId: "client-id", clientSecret: "client-secret" });
    const tokens = await Effect.runPromise(auth.getTemporaryAppTokens().pipe(Effect.provide(layer)));

    expect(tokens.access_token).toBe("temporary-token");
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://accounts.spotify.com/api/token");
    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.headers.authorization).toBe("Basic Y2xpZW50LWlkOmNsaWVudC1zZWNyZXQ=");
    expect(requests[0]?.body).toBe("grant_type=client_credentials");
  });

  it("maps token endpoint failures to SpotifyHttpError", async () => {
    const { layer } = makeTestHttpClient(
      () =>
        new Response(
          JSON.stringify({ error: "invalid_client", error_description: "Invalid client" }),
          {
            status: 401,
            headers: { "content-type": "application/json" },
          },
        ),
    );

    const auth = makeSpotifyAuth({ clientId: "client-id", clientSecret: "client-secret" });
    const error = await Effect.runPromise(
      Effect.flip(auth.getTemporaryAppTokens().pipe(Effect.provide(layer))),
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
});
