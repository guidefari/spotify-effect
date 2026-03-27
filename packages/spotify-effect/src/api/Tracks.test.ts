import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";
import { audioAnalysisFixture, audioFeaturesFixture } from "../fixtures/audioFixture";
import { getTracksFixture } from "../fixtures/getTracksFixture";
import { makeSpotifyRequest } from "../services/SpotifyRequest";
import { makeTestHttpClient } from "../test/TestHttpClient";
import { trackFixture } from "../fixtures/trackFixture";
import { TracksApi } from "./Tracks";

const makeTracksWithTestClient = (response: Response) => {
  const testClient = makeTestHttpClient(() => response);

  const tracks = new TracksApi(
    makeSpotifyRequest({
      getAccessToken: () => Effect.succeed("token"),
      invalidateAccessToken: () => Effect.void,
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

  it("should get audio analysis for a track", async () => {
    const { tracks, layer, requests } = makeTracksWithTestClient(jsonResponse(audioAnalysisFixture));
    const result = await Effect.runPromise(
      tracks.getAudioAnalysisForTrack("trackId").pipe(Effect.provide(layer)),
    );
    expect(result.bars).toHaveLength(1);
    expect(result.sections).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://api.spotify.com/v1/audio-analysis/trackId");
  });

  it("should get audio features for a track", async () => {
    const { tracks, layer, requests } = makeTracksWithTestClient(jsonResponse(audioFeaturesFixture));
    const result = await Effect.runPromise(
      tracks.getAudioFeaturesForTrack("trackId").pipe(Effect.provide(layer)),
    );
    expect(result.danceability).toBe(0.585);
    expect(result.type).toBe("audio_features");
    expect(requests[0]?.url).toBe("https://api.spotify.com/v1/audio-features/trackId");
  });

  it("should get audio features for multiple tracks", async () => {
    const { tracks, layer, requests } = makeTracksWithTestClient(
      jsonResponse({ audio_features: [audioFeaturesFixture, null] }),
    );
    const result = await Effect.runPromise(
      tracks.getAudioFeaturesForTracks(["id1", "id2"]).pipe(Effect.provide(layer)),
    );
    expect(result).toHaveLength(2);
    expect(result[0]?.danceability).toBe(0.585);
    expect(result[1]).toBeNull();
    expect(requests[0]?.url).toContain("ids=id1%2Cid2");
  });
});
