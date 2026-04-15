<script lang="ts">
	import { session } from '$lib/session.svelte';

	type Track = {
		name: string;
		artist: string;
		album: string;
		addedAt: string;
	};

	type TopArtist = {
		name: string;
		count: number;
	};

	let tracks = $state<Track[]>([]);
	let topArtists = $state<TopArtist[]>([]);
	let totalTracksProcessed = $state(0);
	let isStreaming = $state(false);
	let isDone = $state(false);
	let error = $state<string | null>(null);
	let maxTracksInput = $state(200);
	let unlimited = $state(false);
	let abortController = $state<AbortController | null>(null);

	const maxTracks = $derived(unlimited ? 'unlimited' : maxTracksInput);
	const statusText = $derived(
		isDone
			? `done — ${totalTracksProcessed} tracks`
			: isStreaming
				? `${totalTracksProcessed} tracks processed...`
				: ''
	);

	function parseSSE(buffer: string): { events: Array<{ type: string; data: unknown }>; remainder: string } {
		const parts = buffer.split('\n\n');
		const remainder = parts.pop() ?? '';
		const events: Array<{ type: string; data: unknown }> = [];

		for (const part of parts) {
			const eventMatch = part.match(/^event: (.+)$/m);
			const dataMatch = part.match(/^data: (.+)$/m);
			if (!eventMatch || !dataMatch) continue;
			try {
				events.push({ type: eventMatch[1], data: JSON.parse(dataMatch[1]) });
			} catch {
				// skip malformed events
			}
		}

		return { events, remainder };
	}

	async function startStream() {
		const accessToken = session.tokens?.accessToken;
		if (!accessToken) {
			error = 'No access token — log in on the home page first.';
			return;
		}

		tracks = [];
		topArtists = [];
		totalTracksProcessed = 0;
		isStreaming = true;
		isDone = false;
		error = null;

		const ac = new AbortController();
		abortController = ac;

		try {
			const response = await fetch('/api/stream-pagination', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accessToken, maxTracks }),
				signal: ac.signal
			});

			if (!response.ok || !response.body) {
				throw new Error(`Request failed (${response.status})`);
			}

			const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += value;

				const parsed = parseSSE(buffer);
				buffer = parsed.remainder;

				for (const event of parsed.events) {
					const d = event.data as Record<string, unknown>;

					if (event.type === 'tracks') {
						const incoming = (d.tracks as Track[]) ?? [];
						tracks = [...tracks, ...incoming];
					} else if (event.type === 'stats') {
						topArtists = (d.topArtists as TopArtist[]) ?? [];
						totalTracksProcessed = (d.totalTracksProcessed as number) ?? 0;
					} else if (event.type === 'done') {
						isDone = true;
					} else if (event.type === 'error') {
						error = (d.message as string) ?? 'Unknown error';
					}
				}
			}

			if (!isDone && !error) {
				isDone = true;
			}
		} catch (err) {
			if (err instanceof DOMException && err.name === 'AbortError') {
				isDone = true;
				return;
			}
			error = err instanceof Error ? err.message : String(err);
		} finally {
			isStreaming = false;
			abortController = null;
		}
	}

	function stopStream() {
		abortController?.abort();
	}
</script>

<div class="stack" style="gap: 20px">
	<div class="section-header">stream pagination</div>
	<div class="card stack">
		<p style="color: var(--muted); font-size: 12px; line-height: 1.7">
			Demonstrates <code style="color: var(--text)">paginateStream()</code> with saved tracks.
			Pages stream from Spotify in real time — tracks and stats render as each page arrives.
		</p>
		<div class="controls-row">
			<label class="max-tracks-label">
				<span style="font-size: 11px; color: var(--muted)">max tracks</span>
				<input
					type="number"
					bind:value={maxTracksInput}
					min={1}
					max={10000}
					disabled={unlimited || isStreaming}
					class="max-tracks-input"
				/>
			</label>
			<label class="unlimited-label">
				<input type="checkbox" bind:checked={unlimited} disabled={isStreaming} />
				<span style="font-size: 11px; color: var(--muted)">unlimited</span>
			</label>
			{#if isStreaming}
				<button onclick={stopStream} class="stop-btn" style="flex: 1">stop</button>
			{:else}
				<button onclick={startStream} disabled={!session.tokens?.accessToken} style="flex: 1">
					stream tracks
				</button>
			{/if}
		</div>
		{#if statusText}
			<div class="status-text">{statusText}</div>
		{/if}
		{#if error}
			<div class="error-box">{error}</div>
		{/if}
	</div>

	{#if tracks.length > 0 || topArtists.length > 0}
		<div class="dual-grid">
			<div class="card stack">
				<div class="row" style="justify-content: space-between">
					<h2>tracks</h2>
					<span style="font-size: 12px; color: var(--muted)">{tracks.length} loaded</span>
				</div>
				<p style="font-size: 12px; color: var(--muted)">
					Tracks arrive in batches as pages are fetched from Spotify.
				</p>
				<div class="tracks-scroll">
					{#each tracks as track, index (`${index}-${track.name}`)}
						<div class="list-row">
							<div>{track.name}</div>
							<div style="font-size: 11px; color: var(--muted)">
								{track.artist} · {track.album}
							</div>
						</div>
					{/each}
				</div>
			</div>

			<div class="card stack">
				<div class="row" style="justify-content: space-between">
					<h2>library stats</h2>
					<span style="font-size: 12px; color: var(--muted)">
						{totalTracksProcessed} processed
					</span>
				</div>
				<p style="font-size: 12px; color: var(--muted)">
					Running aggregation — stats update after each page.
				</p>
				{#if topArtists.length === 0}
					<div style="font-size: 12px; color: var(--muted)">Waiting for data...</div>
				{:else}
					{#each topArtists as artist (artist.name)}
						<div class="list-row">
							<div class="row" style="justify-content: space-between">
								<span>{artist.name}</span>
								<span style="font-size: 11px; color: var(--muted)">{artist.count} tracks</span>
							</div>
							<div class="bar-track">
								<div
									class="bar-fill"
									style="width: {(artist.count / (topArtists[0]?.count ?? 1)) * 100}%"
								></div>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.controls-row {
		display: flex;
		gap: 12px;
		align-items: center;
		flex-wrap: wrap;
	}

	.max-tracks-label {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.max-tracks-input {
		width: 80px;
		padding: 8px 10px;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: rgba(255, 255, 255, 0.04);
		color: var(--text);
		font-size: 13px;
		text-align: center;
	}

	.max-tracks-input:disabled {
		opacity: 0.4;
	}

	.unlimited-label {
		display: flex;
		align-items: center;
		gap: 6px;
		padding-top: 16px;
	}

	.stop-btn {
		background: rgba(239, 68, 68, 0.15);
		border-color: rgba(239, 68, 68, 0.3);
		color: var(--error);
	}

	.stop-btn:hover {
		background: rgba(239, 68, 68, 0.25);
	}

	.status-text {
		font-size: 12px;
		color: var(--accent);
		font-weight: 600;
	}

	.dual-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 20px;
	}

	.tracks-scroll {
		max-height: 480px;
		overflow-y: auto;
	}

	.list-row {
		padding: 8px 0;
		border-top: 1px solid var(--border);
	}

	.list-row:first-of-type {
		border-top: none;
	}

	.bar-track {
		height: 4px;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 2px;
		margin-top: 4px;
		overflow: hidden;
	}

	.bar-fill {
		height: 100%;
		background: var(--accent);
		border-radius: 2px;
		transition: width 0.3s ease;
	}
</style>
