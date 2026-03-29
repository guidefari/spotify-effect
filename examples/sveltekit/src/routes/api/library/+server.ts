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
  const limit = typeof body.limit === "number" ? body.limit : 8;
  const offset = typeof body.offset === "number" ? body.offset : 0;

  if (!accessToken) {
    return json({ message: "Missing required field: accessToken" }, { status: 400 });
  }

  const spotify = new SpotifyWebApi({}, { accessToken });

  const [albums, tracks] = await Promise.all([
    runTracedResult(spotify.library.getSavedAlbums({ limit, offset }), "sveltekit.api.library.albums"),
    runTracedResult(spotify.library.getSavedTracks({ limit, offset }), "sveltekit.api.library.tracks"),
  ]);

  return json({
    albums: albums.data,
    tracks: tracks.data,
    limit,
    offset,
    errors: {
      albums: albums.error,
      tracks: tracks.error,
    },
  });
};
