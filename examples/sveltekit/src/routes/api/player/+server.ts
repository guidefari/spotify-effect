import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { SpotifyWebApi } from "spotify-effect";
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

  const spotify = new SpotifyWebApi({}, { accessToken });

  const [playback, currentlyPlaying, devices, recent, queue] = await Promise.all([
    runTracedResult(
      spotify.player.getPlaybackInfo(),
      "sveltekit.api.player.playback",
    ),
    runTracedResult(
      spotify.player.getCurrentlyPlayingTrack(),
      "sveltekit.api.player.currently_playing",
    ),
    runTracedResult(
      spotify.player.getMyDevices(),
      "sveltekit.api.player.devices",
    ),
    runTracedResult(
      spotify.player.getRecentlyPlayedTracks({ limit: 6 }),
      "sveltekit.api.player.recent",
    ),
    runTracedResult(
      spotify.player.getQueue(),
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
