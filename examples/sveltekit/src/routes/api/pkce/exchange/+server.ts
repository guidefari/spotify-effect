import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as Effect from "effect/Effect";
import { SpotifyAuth } from "spotify-effect";
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
    typeof b.code !== "string" ||
    typeof b.codeVerifier !== "string"
  ) {
    return json(
      { message: "Missing required fields: clientId, redirectUri, code, codeVerifier" },
      { status: 400 },
    );
  }
  const clientId = b.clientId;
  const redirectUri = b.redirectUri;
  const code = b.code;
  const codeVerifier = b.codeVerifier;


  try {
    const tokens = await runTraced(
      Effect.gen(function* () {
        const auth = yield* SpotifyAuth;
        return yield* auth.getRefreshableUserTokensWithPkce({
          clientId,
          code,
          codeVerifier,
        });
      }).pipe(Effect.provide(makeConfiguredSpotifyLayer({ clientId, redirectUri }))),
      "sveltekit.api.pkce.exchange",
    );
    return json(tokens);
  } catch (err) {
    return json(err, { status: 500 });
  }
};
