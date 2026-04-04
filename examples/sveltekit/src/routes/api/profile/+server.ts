import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as Effect from "effect/Effect";
import { SpotifySession, Users } from "@spotify-effect/core";
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
    typeof b.accessToken !== "string" ||
    typeof b.refreshToken !== "string" ||
    typeof b.accessTokenExpiresAt !== "number"
  ) {
    return json(
      {
        message:
          "Missing required fields: clientId, redirectUri, accessToken, refreshToken, accessTokenExpiresAt",
      },
      { status: 400 },
    );
  }

  const layer = makeConfiguredSpotifyLayer(
    { clientId: b.clientId, redirectUri: b.redirectUri },
    {
      accessToken: b.accessToken,
      accessTokenExpiresAt: b.accessTokenExpiresAt,
      refreshToken: b.refreshToken,
    },
  );

  try {
    const result = await runTraced(
      Effect.gen(function* () {
        const users = yield* Users;
        const session = yield* SpotifySession;
        const profile = yield* users.getCurrentUserProfile();

        return {
          profile,
          credentials: {
            accessToken: session.getStoredAccessToken(),
            accessTokenExpiresAt: session.getStoredAccessTokenExpiresAt(),
            refreshToken: session.getStoredRefreshToken(),
          },
        };
      }).pipe(Effect.provide(layer)),
      "sveltekit.api.profile",
    );
    return json(result);
  } catch (err) {
    return json(err, { status: 500 });
  }
};
