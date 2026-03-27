import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";
import {
  currentlyPlayingContextFixture,
  currentlyPlayingFixture,
  devicesResponseFixture,
  queueFixture,
  recentlyPlayedFixture,
} from "../fixtures/playerFixture";
import { makeSpotifyRequest } from "../services/SpotifyRequest";
import { makeTestHttpClient } from "../test/TestHttpClient";
import { PlayerApi } from "./Player";

const makePlayerWithTestClient = (response: Response) => {
  const testClient = makeTestHttpClient(() => response);
  const player = new PlayerApi(
    makeSpotifyRequest({
      getAccessToken: () => Effect.succeed("token"),
      invalidateAccessToken: () => Effect.void,
    }),
  );
  return { player, ...testClient };
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const emptyResponse = () =>
  new Response(null, { status: 200, headers: { "content-type": "application/json" } });

describe("PlayerApi", () => {
  it("gets playback info", async () => {
    const { player, layer, requests } = makePlayerWithTestClient(
      jsonResponse(currentlyPlayingContextFixture),
    );
    const result = await Effect.runPromise(
      player.getPlaybackInfo().pipe(Effect.provide(layer)),
    );
    expect(result.device.id).toBe("abc123");
    expect(result.is_playing).toBe(true);
    expect(requests[0]?.url).toBe("https://api.spotify.com/v1/me/player");
    expect(requests[0]?.method).toBe("GET");
  });

  it("gets playback info with options", async () => {
    const { player, layer, requests } = makePlayerWithTestClient(
      jsonResponse(currentlyPlayingContextFixture),
    );
    await Effect.runPromise(
      player.getPlaybackInfo({ market: "US" }).pipe(Effect.provide(layer)),
    );
    expect(requests[0]?.url).toContain("market=US");
  });

  it("gets devices", async () => {
    const { player, layer, requests } = makePlayerWithTestClient(
      jsonResponse(devicesResponseFixture),
    );
    const result = await Effect.runPromise(
      player.getMyDevices().pipe(Effect.provide(layer)),
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("My Computer");
    expect(requests[0]?.url).toBe("https://api.spotify.com/v1/me/player/devices");
  });

  it("gets currently playing track", async () => {
    const { player, layer, requests } = makePlayerWithTestClient(
      jsonResponse(currentlyPlayingFixture),
    );
    const result = await Effect.runPromise(
      player.getCurrentlyPlayingTrack().pipe(Effect.provide(layer)),
    );
    expect(result.is_playing).toBe(true);
    expect(requests[0]?.url).toBe("https://api.spotify.com/v1/me/player/currently-playing");
  });

  it("gets recently played tracks", async () => {
    const { player, layer, requests } = makePlayerWithTestClient(
      jsonResponse(recentlyPlayedFixture),
    );
    const result = await Effect.runPromise(
      player.getRecentlyPlayedTracks({ limit: 10 }).pipe(Effect.provide(layer)),
    );
    expect(result.items).toHaveLength(1);
    expect(result.cursors.after).toBe("1234567890");
    expect(requests[0]?.url).toContain("limit=10");
  });

  it("gets queue", async () => {
    const { player, layer, requests } = makePlayerWithTestClient(
      jsonResponse(queueFixture),
    );
    const result = await Effect.runPromise(
      player.getQueue().pipe(Effect.provide(layer)),
    );
    expect(result.queue).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://api.spotify.com/v1/me/player/queue");
  });

  it("transfers playback", async () => {
    const { player, layer, requests } = makePlayerWithTestClient(emptyResponse());
    await Effect.runPromise(
      player.transferPlayback("device123", { play: true }).pipe(Effect.provide(layer)),
    );
    expect(requests[0]?.method).toBe("PUT");
    expect(requests[0]?.url).toBe("https://api.spotify.com/v1/me/player");
    const body = JSON.parse(requests[0]?.body ?? "{}");
    expect(body.device_ids).toEqual(["device123"]);
    expect(body.play).toBe(true);
  });

  it("starts playback with context", async () => {
    const { player, layer, requests } = makePlayerWithTestClient(emptyResponse());
    await Effect.runPromise(
      player
        .play({ context_uri: "spotify:album:abc", device_id: "dev1" })
        .pipe(Effect.provide(layer)),
    );
    expect(requests[0]?.method).toBe("PUT");
    expect(requests[0]?.url).toContain("/me/player/play");
    expect(requests[0]?.url).toContain("device_id=dev1");
    const body = JSON.parse(requests[0]?.body ?? "{}");
    expect(body.context_uri).toBe("spotify:album:abc");
  });

  it("resumes playback without options", async () => {
    const { player, layer, requests } = makePlayerWithTestClient(emptyResponse());
    await Effect.runPromise(player.play().pipe(Effect.provide(layer)));
    expect(requests[0]?.method).toBe("PUT");
    expect(requests[0]?.url).toBe("https://api.spotify.com/v1/me/player/play");
  });

  it("pauses playback", async () => {
    const { player, layer, requests } = makePlayerWithTestClient(emptyResponse());
    await Effect.runPromise(
      player.pause({ device_id: "dev1" }).pipe(Effect.provide(layer)),
    );
    expect(requests[0]?.method).toBe("PUT");
    expect(requests[0]?.url).toContain("/me/player/pause");
    expect(requests[0]?.url).toContain("device_id=dev1");
  });

  it("seeks to position", async () => {
    const { player, layer, requests } = makePlayerWithTestClient(emptyResponse());
    await Effect.runPromise(
      player.seek(25000).pipe(Effect.provide(layer)),
    );
    expect(requests[0]?.method).toBe("PUT");
    expect(requests[0]?.url).toContain("position_ms=25000");
  });

  it("sets repeat mode", async () => {
    const { player, layer, requests } = makePlayerWithTestClient(emptyResponse());
    await Effect.runPromise(
      player.setRepeat("track").pipe(Effect.provide(layer)),
    );
    expect(requests[0]?.method).toBe("PUT");
    expect(requests[0]?.url).toContain("state=track");
  });

  it("sets volume", async () => {
    const { player, layer, requests } = makePlayerWithTestClient(emptyResponse());
    await Effect.runPromise(
      player.setVolume(75).pipe(Effect.provide(layer)),
    );
    expect(requests[0]?.method).toBe("PUT");
    expect(requests[0]?.url).toContain("volume_percent=75");
  });

  it("sets shuffle", async () => {
    const { player, layer, requests } = makePlayerWithTestClient(emptyResponse());
    await Effect.runPromise(
      player.setShuffle(true).pipe(Effect.provide(layer)),
    );
    expect(requests[0]?.method).toBe("PUT");
    expect(requests[0]?.url).toContain("state=true");
  });

  it("skips to next", async () => {
    const { player, layer, requests } = makePlayerWithTestClient(emptyResponse());
    await Effect.runPromise(player.skipToNext().pipe(Effect.provide(layer)));
    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.url).toContain("/me/player/next");
  });

  it("skips to previous", async () => {
    const { player, layer, requests } = makePlayerWithTestClient(emptyResponse());
    await Effect.runPromise(player.skipToPrevious().pipe(Effect.provide(layer)));
    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.url).toContain("/me/player/previous");
  });

  it("adds to queue", async () => {
    const { player, layer, requests } = makePlayerWithTestClient(emptyResponse());
    await Effect.runPromise(
      player.addToQueue("spotify:track:abc").pipe(Effect.provide(layer)),
    );
    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.url).toContain("/me/player/queue");
    expect(requests[0]?.url).toContain("uri=spotify%3Atrack%3Aabc");
  });

  it("skips to next with device_id", async () => {
    const { player, layer, requests } = makePlayerWithTestClient(emptyResponse());
    await Effect.runPromise(
      player.skipToNext({ device_id: "dev1" }).pipe(Effect.provide(layer)),
    );
    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.url).toContain("device_id=dev1");
  });
});
