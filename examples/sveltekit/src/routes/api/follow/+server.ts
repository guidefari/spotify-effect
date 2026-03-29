import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { SpotifyWebApi } from "spotify-effect";
import { runTraced } from "$lib/server/telemetry";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

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
  const action = typeof body.action === "string" ? body.action : null;

  if (!accessToken || !action) {
    return json({ message: "Missing required fields: accessToken, action" }, { status: 400 });
  }

  const spotify = new SpotifyWebApi({}, { accessToken });

  try {
    if (action === "load_followed_artists") {
      const after = typeof body.after === "string" ? body.after : undefined;
      const artists = await runTraced(
        spotify.follow.getFollowedArtists({ limit: 10, after }),
        "sveltekit.api.follow.load_followed_artists",
      );
      return json(artists);
    }

    if (action === "check") {
      const targetType = body.targetType;
      const ids = getStringArray(body.ids);

      if ((targetType !== "artist" && targetType !== "user" && targetType !== "playlist") || ids.length === 0) {
        return json({ message: "Missing required fields: targetType, ids" }, { status: 400 });
      }

      if (targetType === "artist") {
        const result = await runTraced(
          spotify.follow.isFollowingArtists(ids),
          "sveltekit.api.follow.check_artists",
        );
        return json({ following: result });
      }

      if (targetType === "user") {
        const result = await runTraced(
          spotify.follow.isFollowingUsers(ids),
          "sveltekit.api.follow.check_users",
        );
        return json({ following: result });
      }

      const currentUser = await runTraced(
        spotify.users.getCurrentUserProfile(),
        "sveltekit.api.follow.current_user",
      );
      const result = await runTraced(
        spotify.follow.areFollowingPlaylist(ids[0], [currentUser.id]),
        "sveltekit.api.follow.check_playlist",
      );
      return json({ following: result });
    }

    if (action === "mutate") {
      const targetType = body.targetType;
      const mode = body.mode;
      const ids = getStringArray(body.ids);

      if (
        (targetType !== "artist" && targetType !== "user" && targetType !== "playlist") ||
        (mode !== "follow" && mode !== "unfollow") ||
        ids.length === 0
      ) {
        return json({ message: "Missing required fields: targetType, mode, ids" }, { status: 400 });
      }

      if (targetType === "artist") {
        await runTraced(
          mode === "follow" ? spotify.follow.followArtists(ids) : spotify.follow.unfollowArtists(ids),
          `sveltekit.api.follow.${mode}_artists`,
        );
        return json({ ok: true });
      }

      if (targetType === "user") {
        await runTraced(
          mode === "follow" ? spotify.follow.followUsers(ids) : spotify.follow.unfollowUsers(ids),
          `sveltekit.api.follow.${mode}_users`,
        );
        return json({ ok: true });
      }

      await runTraced(
        mode === "follow"
          ? spotify.follow.followPlaylist(ids[0], { public: body.public === true })
          : spotify.follow.unfollowPlaylist(ids[0]),
        `sveltekit.api.follow.${mode}_playlist`,
      );
      return json({ ok: true });
    }

    return json({ message: "Unsupported action" }, { status: 400 });
  } catch (err) {
    return json(err, { status: 500 });
  }
};
