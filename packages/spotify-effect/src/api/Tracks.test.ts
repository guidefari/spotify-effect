import * as Effect from "effect/Effect"
import { afterEach, describe, expect, it, vi } from "vitest"
import { makeSpotifyRequest } from "../services/SpotifyRequest"
import { trackFixture } from "../fixtures/trackFixture"
import { TracksApi } from "./Tracks"

const fetchMock = vi.fn()

vi.stubGlobal("fetch", fetchMock)

describe("TracksApi", () => {
  afterEach(() => {
    fetchMock.mockReset()
  })

  it("should get a track without options", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(trackFixture), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      ),
    )

    const tracks = new TracksApi(
      makeSpotifyRequest({
        getAccessToken: () => "token",
      }),
    )

    const response = await Effect.runPromise(tracks.getTrack("foo"))

    expect(response).toEqual(trackFixture)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const firstCall = fetchMock.mock.calls[0]

    if (firstCall === undefined) {
      throw new Error("Expected fetch to be called")
    }

    const [url] = firstCall
    expect(String(url)).toBe("https://api.spotify.com/v1/tracks/foo")
  })

  it("should get a track with options", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(trackFixture), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      ),
    )

    const tracks = new TracksApi(
      makeSpotifyRequest({
        getAccessToken: () => "token",
      }),
    )

    const response = await Effect.runPromise(
      tracks.getTrack("foo", { market: "bar" }),
    )

    expect(response).toEqual(trackFixture)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const firstCall = fetchMock.mock.calls[0]

    if (firstCall === undefined) {
      throw new Error("Expected fetch to be called")
    }

    const [url, options] = firstCall
    expect(String(url)).toBe("https://api.spotify.com/v1/tracks/foo?market=bar")
    expect(options.headers.authorization).toBe("Bearer token")
  })
})
