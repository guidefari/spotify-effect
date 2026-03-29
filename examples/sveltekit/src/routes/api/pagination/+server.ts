import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { SpotifyWebApi, cursorPaginateAll, paginateAll } from "spotify-effect";
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

  const [playlists, followedArtists] = await Promise.all([
    runTracedResult(
      paginateAll((offset, limit) => spotify.playlists.getMyPlaylists({ offset, limit }), 10),
      "sveltekit.api.pagination.playlists",
    ),
    runTracedResult(
      cursorPaginateAll((options) => spotify.follow.getFollowedArtists(options), 10),
      "sveltekit.api.pagination.followed_artists",
    ),
  ]);

  return json({
    playlists: playlists.data,
    followedArtists: followedArtists.data,
    playlistCount: playlists.data?.length ?? 0,
    followedArtistCount: followedArtists.data?.length ?? 0,
    errors: {
      playlists: playlists.error,
      followedArtists: followedArtists.error,
    },
  });
};
