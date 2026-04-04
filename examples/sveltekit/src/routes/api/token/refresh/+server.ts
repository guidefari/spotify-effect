import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as Effect from "effect/Effect";
import { SpotifyAuth } from "@spotify-effect/core";
import { makeConfiguredSpotifyLayer } from "$lib/server/spotify";
import { runTraced } from "$lib/server/telemetry";

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  if (
    typeof b.clientId !== "string" ||
    typeof b.redirectUri !== "string" ||
    typeof b.refreshToken !== "string"
  ) {
    return json(
      { message: "Missing required fields: clientId, redirectUri, refreshToken" },
      { status: 400 },
    );
  }
  const clientId = b.clientId;
  const redirectUri = b.redirectUri;
  const refreshToken = b.refreshToken;


  try {
    const tokens = await runTraced(
      Effect.gen(function* () {
        const auth = yield* SpotifyAuth;
        return yield* auth.getRefreshedAccessToken(refreshToken);
      }).pipe(Effect.provide(makeConfiguredSpotifyLayer({ clientId, redirectUri }))),
      "sveltekit.api.token.refresh",
    );

    return json({
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in,
    });
  } catch (err) {
    return json(err, { status: 500 });
  }
};
