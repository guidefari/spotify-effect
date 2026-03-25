import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as Effect from 'effect/Effect';
import { SpotifyWebApi } from 'spotify-effect';

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ message: 'Invalid JSON body' }, { status: 400 });
	}

	const b = body as Record<string, unknown>;

	if (typeof b.accessToken !== 'string' || typeof b.userId !== 'string') {
		return json({ message: 'Missing required fields: accessToken, userId' }, { status: 400 });
	}

	const spotify = new SpotifyWebApi({}, { accessToken: b.accessToken });

	try {
		const user = await Effect.runPromise(spotify.users.getUser(b.userId));
		return json(user);
	} catch (err) {
		return json(err, { status: 500 });
	}
};
