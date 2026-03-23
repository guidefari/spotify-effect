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
  if (typeof b.accessToken !== "string" || typeof b.trackId !== "string") {
    return json({ message: "Missing required fields: accessToken, trackId" }, { status: 400 });
  }
  const spotify = new SpotifyWebApi({}, { accessToken: b.accessToken });
  try {
    const track = await Effect4.runPromise(spotify.tracks.getTrack(b.trackId));
    return json(track);
  } catch (err) {
    return json(err, { status: 500 });
  }
};

export { POST };
//# sourceMappingURL=_server.ts-BEJDSqTr.js.map
