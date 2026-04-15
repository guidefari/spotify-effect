import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as Effect from "effect/Effect";
import { Artists } from "@spotify-effect/core";
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

  if (typeof b.accessToken !== "string" || typeof b.artistId !== "string") {
    return json({ message: "Missing required fields: accessToken, artistId" }, { status: 400 });
  }
  const accessToken = b.accessToken;
  const artistId = b.artistId;

  try {
    const artist = await runTraced(
      Effect.gen(function* () {
        const artists = yield* Artists;
        return yield* artists.getArtist(artistId);
      }).pipe(Effect.provide(makeAccessTokenLayer(accessToken))),
      "sveltekit.api.artist",
    );
    return json(artist);
  } catch (err) {
    return json(err, { status: 500 });
  }
};
