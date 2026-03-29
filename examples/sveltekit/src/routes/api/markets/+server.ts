import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { SpotifyWebApi } from "spotify-effect";
import { runTraced } from "$lib/server/telemetry";

export const POST: RequestHandler = async () => {
  const spotify = new SpotifyWebApi();

  try {
    const markets = await runTraced(spotify.markets.getMarkets(), "sveltekit.api.markets");
    return json({ markets });
  } catch (err) {
    return json(err, { status: 500 });
  }
};
