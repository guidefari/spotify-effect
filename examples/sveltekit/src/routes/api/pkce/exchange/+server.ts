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

	if (
		typeof b.clientId !== 'string' ||
		typeof b.redirectUri !== 'string' ||
		typeof b.code !== 'string' ||
		typeof b.codeVerifier !== 'string'
	) {
		return json({ message: 'Missing required fields: clientId, redirectUri, code, codeVerifier' }, { status: 400 });
	}

	const spotify = new SpotifyWebApi({ clientId: b.clientId, redirectUri: b.redirectUri });

	try {
		const tokens = await Effect.runPromise(
			spotify.getTokenWithAuthenticateCodePKCE(b.code, b.codeVerifier, b.clientId)
		);
		return json(tokens);
	} catch (err) {
		return json(err, { status: 500 });
	}
};
