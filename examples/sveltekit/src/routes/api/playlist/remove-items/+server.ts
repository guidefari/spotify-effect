import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { SpotifyWebApi } from "spotify-effect";
import { runTraced } from "$lib/server/telemetry";

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
  const playlistId = typeof body.playlistId === "string" ? body.playlistId.trim() : "";
  const uris = Array.isArray(body.uris)
    ? body.uris.filter((uri): uri is string => typeof uri === "string" && uri.trim().length > 0)
    : [];
  const snapshotId = typeof body.snapshotId === "string" ? body.snapshotId : undefined;

  if (!accessToken || playlistId.length === 0 || uris.length === 0) {
    return json({ message: "Missing required fields: accessToken, playlistId, uris" }, { status: 400 });
  }

  const spotify = new SpotifyWebApi({}, { accessToken });

  try {
    const response = await runTraced(
      spotify.playlists.removePlaylistItems(playlistId, uris, snapshotId),
      "sveltekit.api.playlist.remove_items",
    );
    return json(response);
  } catch (err) {
    return json(err, { status: 500 });
  }
};
