import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as Effect from "effect/Effect";
import { Library } from "@spotify-effect/core";
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

  const albumIds = Array.isArray(b.albumIds)
    ? b.albumIds.filter((id): id is string => typeof id === "string")
    : [];
  if (albumIds.length === 0) {
    return json(
      { message: "Missing required field: albumIds (non-empty array of strings)" },
      { status: 400 },
    );
  }

  try {
    await runTraced(
      Effect.gen(function* () {
        const library = yield* Library;
        return yield* library.saveAlbums(albumIds);
      }).pipe(Effect.provide(makeAccessTokenLayer(b.accessToken))),
      "sveltekit.api.album.save",
    );
    return json({ saved: true });
  } catch (err) {
    return json(err, { status: 500 });
  }
};
