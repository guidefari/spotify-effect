import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as Effect from "effect/Effect";
import { Tracks } from "@spotify-effect/core";
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

  if (typeof b.accessToken !== "string" || typeof b.trackId !== "string") {
    return json({ message: "Missing required fields: accessToken, trackId" }, { status: 400 });
  }
  const accessToken = b.accessToken;
  const trackId = b.trackId;

  try {
    const track = await runTraced(
      Effect.gen(function* () {
        const tracks = yield* Tracks;
        return yield* tracks.getTrack(trackId);
      }).pipe(Effect.provide(makeAccessTokenLayer(accessToken))),
      "sveltekit.api.track",
    );
    return json(track);
  } catch (err) {
    return json(err, { status: 500 });
  }
};
