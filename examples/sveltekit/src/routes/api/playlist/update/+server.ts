import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as Effect from "effect/Effect";
import { Playlists } from "spotify-effect";
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
  const playlistId = typeof body.playlistId === "string" ? body.playlistId.trim() : "";
  const name = typeof body.name === "string" ? body.name : undefined;
  const description = typeof body.description === "string" ? body.description : undefined;
  const isPublic = typeof body.public === "boolean" ? body.public : undefined;
  const collaborative = typeof body.collaborative === "boolean" ? body.collaborative : undefined;

  if (!accessToken || playlistId.length === 0) {
    return json({ message: "Missing required fields: accessToken, playlistId" }, { status: 400 });
  }

  if (
    name === undefined &&
    description === undefined &&
    isPublic === undefined &&
    collaborative === undefined
  ) {
    return json({ message: "Provide at least one playlist field to update" }, { status: 400 });
  }

  try {
    await runTraced(
      Effect.gen(function* () {
        const playlists = yield* Playlists;
        return yield* playlists.changePlaylistDetails(playlistId, {
          name,
          description,
          public: isPublic,
          collaborative,
        });
      }).pipe(Effect.provide(makeAccessTokenLayer(accessToken))),
      "sveltekit.api.playlist.update",
    );
    return json({ ok: true });
  } catch (err) {
    return json(err, { status: 500 });
  }
};
