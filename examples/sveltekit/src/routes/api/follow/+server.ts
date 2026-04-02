import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as Effect from "effect/Effect";
import { Follow, Users } from "spotify-effect";
import { makeAccessTokenLayer } from "$lib/server/spotify";
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

  const layer = makeAccessTokenLayer(accessToken);

  try {
    if (action === "load_followed_artists") {
      const after = typeof body.after === "string" ? body.after : undefined;
      const artists = await runTraced(
        Effect.gen(function* () {
          const follow = yield* Follow;
          return yield* follow.getFollowedArtists({ limit: 10, after });
        }).pipe(Effect.provide(layer)),
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
          Effect.gen(function* () {
            const follow = yield* Follow;
            return yield* follow.isFollowingArtists(ids);
          }).pipe(Effect.provide(layer)),
          "sveltekit.api.follow.check_artists",
        );
        return json({ following: result });
      }

      if (targetType === "user") {
        const result = await runTraced(
          Effect.gen(function* () {
            const follow = yield* Follow;
            return yield* follow.isFollowingUsers(ids);
          }).pipe(Effect.provide(layer)),
          "sveltekit.api.follow.check_users",
        );
        return json({ following: result });
      }

      const currentUser = await runTraced(
        Effect.gen(function* () {
          const users = yield* Users;
          return yield* users.getCurrentUserProfile();
        }).pipe(Effect.provide(layer)),
        "sveltekit.api.follow.current_user",
      );
      const result = await runTraced(
        Effect.gen(function* () {
          const follow = yield* Follow;
          return yield* follow.areFollowingPlaylist(ids[0], [currentUser.id]);
        }).pipe(Effect.provide(layer)),
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
          Effect.gen(function* () {
            const follow = yield* Follow;
            return yield* (mode === "follow" ? follow.followArtists(ids) : follow.unfollowArtists(ids));
          }).pipe(Effect.provide(layer)),
          `sveltekit.api.follow.${mode}_artists`,
        );
        return json({ ok: true });
      }

      if (targetType === "user") {
        await runTraced(
          Effect.gen(function* () {
            const follow = yield* Follow;
            return yield* (mode === "follow" ? follow.followUsers(ids) : follow.unfollowUsers(ids));
          }).pipe(Effect.provide(layer)),
          `sveltekit.api.follow.${mode}_users`,
        );
        return json({ ok: true });
      }

      await runTraced(
        Effect.gen(function* () {
          const follow = yield* Follow;
          return yield* (mode === "follow"
            ? follow.followPlaylist(ids[0], { public: body.public === true })
            : follow.unfollowPlaylist(ids[0]));
        }).pipe(Effect.provide(layer)),
        `sveltekit.api.follow.${mode}_playlist`,
      );
      return json({ ok: true });
    }

    return json({ message: "Unsupported action" }, { status: 400 });
  } catch (err) {
    return json(err, { status: 500 });
  }
};
