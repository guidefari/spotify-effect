import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { SpotifyWebApi } from "spotify-effect";
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

  const spotify = new SpotifyWebApi(
    { clientId: b.clientId, redirectUri: b.redirectUri },
    {
      accessToken: b.accessToken,
      accessTokenExpiresAt: b.accessTokenExpiresAt,
      refreshToken: b.refreshToken,
    },
  );

  try {
    const profile = await runTraced(spotify.users.getCurrentUserProfile(), "sveltekit.api.profile");
    return json({
      profile,
      credentials: {
        accessToken: spotify.getAccessToken(),
        accessTokenExpiresAt: spotify.getAccessTokenExpiresAt(),
        refreshToken: spotify.getRefreshToken(),
      },
    });
  } catch (err) {
    return json(err, { status: 500 });
  }
};
