import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as Effect from "effect/Effect";
import { Playlists, Users } from "@spotify-effect/core";
import { makeAccessTokenLayer } from "$lib/server/spotify";
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
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description : undefined;
  const isPublic = typeof body.public === "boolean" ? body.public : undefined;
  const collaborative = typeof body.collaborative === "boolean" ? body.collaborative : undefined;

  if (!accessToken || name.length === 0) {
    return json({ message: "Missing required fields: accessToken, name" }, { status: 400 });
  }

  try {
    const layer = makeAccessTokenLayer(accessToken);
    const currentUser = await runTraced(
      Effect.gen(function* () {
        const users = yield* Users;
        return yield* users.getCurrentUserProfile();
      }).pipe(Effect.provide(layer)),
      "sveltekit.api.playlist.create.current_user",
    );
    const playlist = await runTraced(
      Effect.gen(function* () {
        const playlists = yield* Playlists;
        return yield* playlists.createPlaylist(currentUser.id, name, {
          description,
          public: isPublic,
          collaborative,
        });
      }).pipe(Effect.provide(layer)),
      "sveltekit.api.playlist.create",
    );
    return json(playlist);
  } catch (err) {
    return json(err, { status: 500 });
  }
};
