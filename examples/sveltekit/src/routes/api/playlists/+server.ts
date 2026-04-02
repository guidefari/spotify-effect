import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as Effect from "effect/Effect";
import { Playlists } from "spotify-effect";
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

  if (typeof b.accessToken !== "string") {
    return json({ message: "Missing required field: accessToken" }, { status: 400 });
  }

  const limit = typeof b.limit === "number" ? b.limit : 50;
  const offset = typeof b.offset === "number" ? b.offset : 0;

  try {
    const results = await runTraced(
      Effect.gen(function* () {
        const playlists = yield* Playlists;
        return yield* playlists.getMyPlaylists({ limit, offset });
      }).pipe(Effect.provide(makeAccessTokenLayer(b.accessToken))),
      "sveltekit.api.playlists",
    );
    return json(results);
  } catch (err) {
    return json(err, { status: 500 });
  }
};
