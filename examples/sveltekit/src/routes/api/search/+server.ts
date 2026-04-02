import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as Effect from "effect/Effect";
import { Search } from "spotify-effect";
import type { SearchType } from "spotify-effect";
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

  if (typeof b.accessToken !== "string" || typeof b.query !== "string" || !Array.isArray(b.types)) {
    return json({ message: "Missing required fields: accessToken, query, types" }, { status: 400 });
  }

  try {
    const results = await runTraced(
      Effect.gen(function* () {
        const search = yield* Search;
        return yield* search.search(b.query, b.types as ReadonlyArray<SearchType>);
      }).pipe(Effect.provide(makeAccessTokenLayer(b.accessToken))),
      "sveltekit.api.search",
    );
    return json(results);
  } catch (err) {
    return json(err, { status: 500 });
  }
};
