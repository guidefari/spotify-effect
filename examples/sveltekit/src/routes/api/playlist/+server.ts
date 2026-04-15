import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as Effect from "effect/Effect";
import { Playlists } from "@spotify-effect/core";
import { makeAccessTokenLayer } from "$lib/server/spotify";
import { runTraced } from "$lib/server/telemetry";

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  if (typeof b.accessToken !== "string" || typeof b.playlistId !== "string") {
    return json({ message: "Missing required fields: accessToken, playlistId" }, { status: 400 });
  }
  const accessToken = b.accessToken;
  const playlistId = b.playlistId;

  try {
    const result = await runTraced(
      Effect.gen(function* () {
        const playlists = yield* Playlists;
        return yield* playlists.getPlaylist(playlistId);
      }).pipe(Effect.provide(makeAccessTokenLayer(accessToken))),
      "sveltekit.api.playlist",
    );
    return json(result);
  } catch (err) {
    return json(err, { status: 500 });
  }
};
