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
    typeof b.code !== "string" ||
    typeof b.codeVerifier !== "string"
  ) {
    return json(
      { message: "Missing required fields: clientId, redirectUri, code, codeVerifier" },
      { status: 400 },
    );
  }

  const spotify = new SpotifyWebApi({ clientId: b.clientId, redirectUri: b.redirectUri });

  try {
    const tokens = await runTraced(
      spotify.getTokenWithAuthenticateCodePKCE(b.code, b.codeVerifier, b.clientId),
      "sveltekit.api.pkce.exchange",
    );
    return json(tokens);
  } catch (err) {
    return json(err, { status: 500 });
  }
};
