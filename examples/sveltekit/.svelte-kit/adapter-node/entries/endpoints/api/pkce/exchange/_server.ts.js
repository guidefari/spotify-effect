import { json } from "@sveltejs/kit";
import * as Effect4 from "effect/Effect";
import { S as SpotifyWebApi } from "../../../../../chunks/index2.js";
const POST = async ({ request }) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ message: "Invalid JSON body" }, { status: 400 });
  }
  const b = body;
  if (typeof b.clientId !== "string" || typeof b.redirectUri !== "string" || typeof b.code !== "string" || typeof b.codeVerifier !== "string") {
    return json({ message: "Missing required fields: clientId, redirectUri, code, codeVerifier" }, { status: 400 });
  }
  const spotify = new SpotifyWebApi({ clientId: b.clientId, redirectUri: b.redirectUri });
  try {
    const tokens = await Effect4.runPromise(
      spotify.getTokenWithAuthenticateCodePKCE(b.code, b.codeVerifier, b.clientId)
    );
    return json(tokens);
  } catch (err) {
    return json(err, { status: 500 });
  }
};
export {
  POST
};
