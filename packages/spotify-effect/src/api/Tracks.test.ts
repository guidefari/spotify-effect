import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";
import { getTracksFixture } from "../fixtures/getTracksFixture";
import { makeSpotifyRequest } from "../services/SpotifyRequest";
import { makeTestHttpClient } from "../test/TestHttpClient";
import { trackFixture } from "../fixtures/trackFixture";
import { TracksApi } from "./Tracks";

const makeTracksWithTestClient = (response: Response) => {
  const testClient = makeTestHttpClient(() => response);

  const tracks = new TracksApi(
    makeSpotifyRequest({
      getAccessToken: () => "token",
    }),
  );

  return { tracks, ...testClient };
};

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

describe("TracksApi", () => {
  it("should get a track without options", async () => {
    const { tracks, layer, requests } = makeTracksWithTestClient(jsonResponse(trackFixture));

    const response = await Effect.runPromise(tracks.getTrack("foo").pipe(Effect.provide(layer)));

    expect(response).toEqual(trackFixture);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://api.spotify.com/v1/tracks/foo");
  });

  it("should get a track with options", async () => {
    const { tracks, layer, requests } = makeTracksWithTestClient(jsonResponse(trackFixture));

    const response = await Effect.runPromise(
      tracks.getTrack("foo", { market: "bar" }).pipe(Effect.provide(layer)),
    );

    expect(response).toEqual(trackFixture);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://api.spotify.com/v1/tracks/foo?market=bar");
    expect(requests[0]?.headers.authorization).toBe("Bearer token");
  });

  it("should get several tracks without options", async () => {
    const { tracks, layer, requests } = makeTracksWithTestClient(jsonResponse(getTracksFixture));

    const response = await Effect.runPromise(
      tracks.getTracks(["foo", "bar"]).pipe(Effect.provide(layer)),
    );

    expect(response).toEqual(getTracksFixture.tracks);
    expect(requests[0]?.url).toBe("https://api.spotify.com/v1/tracks?ids=foo%2Cbar");
  });

  it("should get several tracks with options", async () => {
    const { tracks, layer, requests } = makeTracksWithTestClient(jsonResponse(getTracksFixture));

    const response = await Effect.runPromise(
      tracks.getTracks(["foo", "bar"], { market: "baz" }).pipe(Effect.provide(layer)),
    );

    expect(response).toEqual(getTracksFixture.tracks);
    expect(requests[0]?.url).toBe("https://api.spotify.com/v1/tracks?ids=foo%2Cbar&market=baz");
    expect(requests[0]?.headers.authorization).toBe("Bearer token");
  });
});
