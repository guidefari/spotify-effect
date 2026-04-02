import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as Effect from "effect/Effect";
import { Personalization } from "spotify-effect";
import { makeAccessTokenLayer } from "$lib/server/spotify";
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
  const limit = typeof body.limit === "number" ? body.limit : 10;
  const timeRange =
    body.timeRange === "long_term" || body.timeRange === "medium_term" || body.timeRange === "short_term"
      ? body.timeRange
      : "medium_term";

  if (!accessToken) {
    return json({ message: "Missing required field: accessToken" }, { status: 400 });
  }

  const layer = makeAccessTokenLayer(accessToken);
  const [artists, tracks] = await Promise.all([
    runTracedResult(
      Effect.gen(function* () {
        const personalization = yield* Personalization;
        return yield* personalization.getMyTopArtists({ limit, time_range: timeRange });
      }).pipe(Effect.provide(layer)),
      "sveltekit.api.top.artists",
    ),
    runTracedResult(
      Effect.gen(function* () {
        const personalization = yield* Personalization;
        return yield* personalization.getMyTopTracks({ limit, time_range: timeRange });
      }).pipe(Effect.provide(layer)),
      "sveltekit.api.top.tracks",
    ),
  ]);

  return json({
    artists: artists.data,
    tracks: tracks.data,
    timeRange,
    errors: {
      artists: artists.error,
      tracks: tracks.error,
    },
  });
};
