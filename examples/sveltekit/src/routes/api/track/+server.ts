import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { SpotifyWebApi } from "spotify-effect";
import { runTraced } from "$lib/server/telemetry";

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  if (typeof b.accessToken !== "string" || typeof b.trackId !== "string") {
    return json({ message: "Missing required fields: accessToken, trackId" }, { status: 400 });
  }

  const spotify = new SpotifyWebApi({}, { accessToken: b.accessToken });

  try {
    const track = await runTraced(spotify.tracks.getTrack(b.trackId), "sveltekit.api.track");
    return json(track);
  } catch (err) {
    return json(err, { status: 500 });
  }
};
