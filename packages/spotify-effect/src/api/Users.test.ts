import * as Effect from "effect/Effect"
import { describe, expect, it } from "vitest"
import { currentUserProfileFixture } from "../fixtures/currentUserProfileFixture"
import { makeSpotifyRequest } from "../services/SpotifyRequest"
import { makeTestHttpClient } from "../test/TestHttpClient"
import { UsersApi } from "./Users"

describe("UsersApi", () => {
  it("gets the current user profile", async () => {
    const { layer, requests } = makeTestHttpClient(
      () =>
        new Response(JSON.stringify(currentUserProfileFixture), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    )

    const users = new UsersApi(
      makeSpotifyRequest({
        getAccessToken: () => Effect.succeed("token"),
      }),
    )

    const response = await Effect.runPromise(users.getCurrentUserProfile().pipe(Effect.provide(layer)))

    expect(response).toEqual(currentUserProfileFixture)
    expect(requests[0]?.url).toBe("https://api.spotify.com/v1/me")
    expect(requests[0]?.headers.authorization).toBe("Bearer token")
  })
})
