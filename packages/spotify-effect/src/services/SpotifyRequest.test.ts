import * as Effect from "effect/Effect"
import { afterEach, describe, expect, it, vi } from "vitest"
import { makeSpotifyRequest } from "./SpotifyRequest"

describe("makeSpotifyRequest", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("maps non-2xx responses to SpotifyHttpError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { status: 404 } }), {
          status: 404,
          headers: {
            "content-type": "application/json",
          },
        }),
      ),
    )

    const request = makeSpotifyRequest({
      getAccessToken: () => "token",
    })

    const error = await Effect.runPromise(
      Effect.flip(request.getJson<unknown>("/tracks/missing")),
    )

    expect(error._tag).toBe("SpotifyHttpError")

    if (error._tag === "SpotifyHttpError") {
      expect(error.status).toBe(404)
      expect(error.method).toBe("GET")
      expect(error.url).toBe("https://api.spotify.com/v1/tracks/missing")
    }
  })
})
