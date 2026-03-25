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

  if (typeof b.accessToken !== "string" || typeof b.albumId !== "string") {
    return json({ message: "Missing required fields: accessToken, albumId" }, { status: 400 });
  }

  const spotify = new SpotifyWebApi({}, { accessToken: b.accessToken });

  try {
    const album = await runTraced(spotify.albums.getAlbum(b.albumId), "sveltekit.api.album");
    return json(album);
  } catch (err) {
    return json(err, { status: 500 });
  }
};
