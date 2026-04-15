import type { RequestHandler } from "./$types";
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import { Library, paginateStream } from "@spotify-effect/core";
import { makeAccessTokenLayer } from "$lib/server/spotify";
import { logServerError, runTraced } from "$lib/server/telemetry";

const SPOTIFY_MAX_PAGE_SIZE = 50;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const encoder = new TextEncoder();

const formatSSE = (event: string, data: unknown): Uint8Array =>
	encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

type PageEvent = {
	tracks: Array<{
		name: string;
		artist: string;
		album: string;
		addedAt: string;
	}>;
	stats: {
		topArtists: Array<{ name: string; count: number }>;
		totalTracksProcessed: number;
	};
	page: number;
};

const snapshotTopArtists = (artists: Map<string, number>) =>
	[...artists.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 10)
		.map(([name, count]) => ({ name, count }));

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ message: "Invalid JSON body" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	if (!isRecord(body)) {
		return new Response(JSON.stringify({ message: "Invalid JSON body" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const accessToken = typeof body.accessToken === "string" ? body.accessToken : null;
	if (!accessToken) {
		return new Response(JSON.stringify({ message: "Missing required field: accessToken" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const maxTracks =
		body.maxTracks === "unlimited"
			? null
			: typeof body.maxTracks === "number" && body.maxTracks >= 1
				? body.maxTracks
				: 200;

	const layer = makeAccessTokenLayer(accessToken);

	const readable = new ReadableStream({
		start(controller) {
			const streamEffect = Effect.gen(function* () {
				const library = yield* Library;
				let stream = paginateStream(
					(offset, limit) => library.getSavedTracks({ offset, limit }),
					SPOTIFY_MAX_PAGE_SIZE,
				);

				if (maxTracks !== null) {
					stream = Stream.take(stream, maxTracks);
				}

				const grouped = Stream.grouped(stream, SPOTIFY_MAX_PAGE_SIZE);

				const withStats = Stream.mapAccum(
					grouped,
					() => ({ artists: new Map<string, number>(), trackCount: 0, page: 0 }),
					(acc, batch) => {
						for (const saved of batch) {
							const artist = saved.track.artists[0]?.name ?? "Unknown";
							acc.artists.set(artist, (acc.artists.get(artist) ?? 0) + 1);
							acc.trackCount++;
						}
						acc.page++;

						const event: PageEvent = {
							tracks: batch.map((saved) => ({
								name: saved.track.name,
								artist: saved.track.artists[0]?.name ?? "Unknown",
								album: saved.track.album.name,
								addedAt: saved.added_at,
							})),
							stats: {
								topArtists: snapshotTopArtists(acc.artists),
								totalTracksProcessed: acc.trackCount,
							},
							page: acc.page,
						};

						return [acc, [event]];
					},
				);

				yield* Stream.runForEach(withStats, (event) =>
					Effect.sync(() => {
						controller.enqueue(formatSSE("tracks", { tracks: event.tracks, page: event.page }));
						controller.enqueue(formatSSE("stats", event.stats));
					}),
				);
			}).pipe(Effect.provide(layer));

			const pipeline = Effect.matchEffect(streamEffect, {
				onFailure: (error: unknown) =>
					Effect.sync(() => {
						const message =
							error instanceof Error
								? error.message
								: typeof error === "object" && error !== null && "_tag" in error
									? String((error as Record<string, unknown>)._tag)
									: String(error);
						controller.enqueue(formatSSE("error", { message }));
						controller.close();
					}),
				onSuccess: () =>
					Effect.sync(() => {
						controller.enqueue(formatSSE("done", {}));
						controller.close();
					}),
			});

			runTraced(pipeline, "sveltekit.api.stream_pagination.sse").catch((err) => {
				logServerError("stream_pagination.sse.unhandled", err);
				try {
					controller.enqueue(formatSSE("error", { message: "Internal server error" }));
					controller.close();
				} catch {
					// controller already closed
				}
			});
		},
	});

	return new Response(readable, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		},
	});
};
