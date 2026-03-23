import { j as json } from './index-CoD1IJuy.js';
import * as Effect4 from 'effect/Effect';
import { S as SpotifyWebApi } from './index2-D5GVHfyz.js';
import 'effect/Schema';
import 'effect/Data';
import 'effect/unstable/http';
import 'effect/Clock';
import 'effect/SynchronizedRef';

const POST = async ({ request }) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ message: "Invalid JSON body" }, { status: 400 });
  }
  const b = body;
  if (typeof b.clientId !== "string" || typeof b.redirectUri !== "string" || typeof b.accessToken !== "string" || typeof b.refreshToken !== "string" || typeof b.accessTokenExpiresAt !== "number") {
    return json(
      { message: "Missing required fields: clientId, redirectUri, accessToken, refreshToken, accessTokenExpiresAt" },
      { status: 400 }
    );
  }
  const spotify = new SpotifyWebApi(
    { clientId: b.clientId, redirectUri: b.redirectUri },
    {
      accessToken: b.accessToken,
      accessTokenExpiresAt: b.accessTokenExpiresAt,
      refreshToken: b.refreshToken
    }
  );
  try {
    const profile = await Effect4.runPromise(spotify.users.getCurrentUserProfile());
    return json({
      profile,
      credentials: {
        accessToken: spotify.getAccessToken(),
        accessTokenExpiresAt: spotify.getAccessTokenExpiresAt(),
        refreshToken: spotify.getRefreshToken()
      }
    });
  } catch (err) {
    return json(err, { status: 500 });
  }
};

export { POST };
//# sourceMappingURL=_server.ts-BdLkwtGw.js.map
