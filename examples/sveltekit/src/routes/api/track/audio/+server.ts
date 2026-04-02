import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as Effect from "effect/Effect";
import { Tracks } from "spotify-effect";
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
  const trackId = typeof body.trackId === "string" ? body.trackId : null;

  if (!accessToken || !trackId) {
    return json({ message: "Missing required fields: accessToken, trackId" }, { status: 400 });
  }

  try {
    const layer = makeAccessTokenLayer(accessToken);
    const [features, analysis] = await Promise.all([
      runTraced(
        Effect.gen(function* () {
          const tracks = yield* Tracks;
          return yield* tracks.getAudioFeaturesForTrack(trackId);
        }).pipe(Effect.provide(layer)),
        "sveltekit.api.track.audio_features",
      ),
      runTraced(
        Effect.gen(function* () {
          const tracks = yield* Tracks;
          return yield* tracks.getAudioAnalysisForTrack(trackId);
        }).pipe(Effect.provide(layer)),
        "sveltekit.api.track.audio_analysis",
      ),
    ]);

    return json({ features, analysis });
  } catch (err) {
    return json(err, { status: 500 });
  }
};
