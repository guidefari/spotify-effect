import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as Effect from "effect/Effect";
import { Albums } from "@spotify-effect/core";
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

  if (typeof b.accessToken !== "string" || typeof b.albumId !== "string") {
    return json({ message: "Missing required fields: accessToken, albumId" }, { status: 400 });
  }
  const accessToken = b.accessToken;
  const albumId = b.albumId;


  try {
    const album = await runTraced(
      Effect.gen(function* () {
        const albums = yield* Albums;
        return yield* albums.getAlbum(albumId);
      }).pipe(Effect.provide(makeAccessTokenLayer(accessToken))),
      "sveltekit.api.album",
    );
    return json(album);
  } catch (err) {
    return json(err, { status: 500 });
  }
};
