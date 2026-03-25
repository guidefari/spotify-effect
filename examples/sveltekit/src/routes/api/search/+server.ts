import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { SpotifyWebApi } from "spotify-effect";
import { runTraced } from "$lib/server/telemetry";
import type { SearchType } from "spotify-effect";

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

  const spotify = new SpotifyWebApi({}, { accessToken: b.accessToken });

  try {
    const results = await runTraced(
      spotify.search.search(b.query, b.types as ReadonlyArray<SearchType>),
      "sveltekit.api.search",
    );
    return json(results);
  } catch (err) {
    return json(err, { status: 500 });
  }
};
