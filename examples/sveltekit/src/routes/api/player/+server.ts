import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as Effect from "effect/Effect";
import { Player } from "@spotify-effect/core";
import { makeAccessTokenLayer } from "$lib/server/spotify";
import { runTracedResult } from "$lib/server/telemetry";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ message: "Invalid JSON body" }, { status: 400 });
  }

  if (!isRecord(body)) {
    return json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const accessToken = typeof body.accessToken === "string" ? body.accessToken : null;
  if (!accessToken) {
    return json({ message: "Missing required field: accessToken" }, { status: 400 });
  }

  const layer = makeAccessTokenLayer(accessToken);
  const [playback, currentlyPlaying, devices, recent, queue] = await Promise.all([
    runTracedResult(
      Effect.gen(function* () {
        const player = yield* Player;
        return yield* player.getPlaybackInfo();
      }).pipe(Effect.provide(layer)),
      "sveltekit.api.player.playback",
    ),
    runTracedResult(
      Effect.gen(function* () {
        const player = yield* Player;
        return yield* player.getCurrentlyPlayingTrack();
      }).pipe(Effect.provide(layer)),
      "sveltekit.api.player.currently_playing",
    ),
    runTracedResult(
      Effect.gen(function* () {
        const player = yield* Player;
        return yield* player.getMyDevices();
      }).pipe(Effect.provide(layer)),
      "sveltekit.api.player.devices",
    ),
    runTracedResult(
      Effect.gen(function* () {
        const player = yield* Player;
        return yield* player.getRecentlyPlayedTracks({ limit: 6 });
      }).pipe(Effect.provide(layer)),
      "sveltekit.api.player.recent",
    ),
    runTracedResult(
      Effect.gen(function* () {
        const player = yield* Player;
        return yield* player.getQueue();
      }).pipe(Effect.provide(layer)),
      "sveltekit.api.player.queue",
    ),
  ]);

  return json({
    playback: playback.data,
    currentlyPlaying: currentlyPlaying.data,
    devices: devices.data,
    recent: recent.data,
    queue: queue.data,
    errors: {
      playback: playback.error,
      currentlyPlaying: currentlyPlaying.error,
      devices: devices.error,
      recent: recent.error,
      queue: queue.error,
    },
  });
};
