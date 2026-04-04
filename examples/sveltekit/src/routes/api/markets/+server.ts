import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as Effect from "effect/Effect";
import { Markets } from "@spotify-effect/core";
import { makeConfiguredSpotifyLayer } from "$lib/server/spotify";
import { runTraced } from "$lib/server/telemetry";

export const POST: RequestHandler = async () => {
  try {
    const markets = await runTraced(
      Effect.gen(function* () {
        const markets = yield* Markets;
        return yield* markets.getMarkets();
      }).pipe(Effect.provide(makeConfiguredSpotifyLayer())),
      "sveltekit.api.markets",
    );
    return json({ markets });
  } catch (err) {
    return json(err, { status: 500 });
  }
};
