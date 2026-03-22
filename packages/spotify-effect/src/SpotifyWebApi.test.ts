import * as Effect from "effect/Effect"
import { afterEach, describe, expect, it, vi } from "vitest"
import { SpotifyWebApi } from "./SpotifyWebApi"
import { trackFixture } from "./fixtures/trackFixture"

describe("SpotifyWebApi", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

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
    )

    expect(spotify.getAccessToken()).toBe("token")
    expect(spotify.clientId).toBe("foo")
    expect(spotify.clientSecret).toBe("bar")
    expect(spotify.redirectUri).toBe("baz")
  })

  it("gets and sets the access token", () => {
    const spotify = new SpotifyWebApi({}, { accessToken: "token" })

    expect(spotify.getAccessToken()).toBe("token")
    spotify.setAccessToken("newToken")
    expect(spotify.getAccessToken()).toBe("newToken")
  })

  it("fetches a track through the parity-style client", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(trackFixture), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      ),
    )

    vi.stubGlobal("fetch", fetchMock)

    const spotify = new SpotifyWebApi({}, { accessToken: "token" })
    const track = await Effect.runPromise(spotify.tracks.getTrack("foo"))

    expect(track).toEqual(trackFixture)

    const firstCall = fetchMock.mock.calls[0]

    if (firstCall === undefined) {
      throw new Error("Expected fetch to be called")
    }

    const [url, options] = firstCall
    expect(String(url)).toBe("https://api.spotify.com/v1/tracks/foo")
    expect(options.headers.authorization).toBe("Bearer token")
  })
})
