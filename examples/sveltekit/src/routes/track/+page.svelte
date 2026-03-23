<script lang="ts">
	import { session } from '$lib/session.svelte';

	let input = $state('');
	let isLoading = $state(false);
	let result = $state<Record<string, unknown> | null>(null);
	let error = $state<string | null>(null);
	let showRaw = $state(false);

	const parseTrackId = (value: string): string => {
		const trimmed = value.trim();
		// Spotify URL: https://open.spotify.com/track/ID
		const urlMatch = trimmed.match(/\/track\/([A-Za-z0-9]+)/);
		if (urlMatch) return urlMatch[1];
		// Spotify URI: spotify:track:ID
		const uriMatch = trimmed.match(/spotify:track:([A-Za-z0-9]+)/);
		if (uriMatch) return uriMatch[1];
		return trimmed;
	};

	const getAccessToken = (): string | null => {
		if (session.tokens?.accessToken) return session.tokens.accessToken;
		return null;
	};

	async function fetchTrack() {
		const trackId = parseTrackId(input);
		if (!trackId) {
			error = 'Enter a track ID or Spotify URL.';
			return;
		}

		const accessToken = getAccessToken();
		if (!accessToken) {
			error = 'No access token — log in on the home page first, or paste a token below.';
			return;
		}

		isLoading = true;
		error = null;
		result = null;
		showRaw = false;

		try {
			const response = await fetch('/api/track', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accessToken, trackId })
			});

			const data = await response.json();
			if (!response.ok) throw new Error(data.message ?? JSON.stringify(data));
			result = data as Record<string, unknown>;
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			isLoading = false;
		}
	}

	const formatMs = (ms: number): string => {
		const s = Math.floor(ms / 1000);
		const m = Math.floor(s / 60);
		return `${m}:${(s % 60).toString().padStart(2, '0')}`;
	};

	const getArtists = (track: Record<string, unknown>): string => {
		const artists = track.artists as Array<Record<string, unknown>> | undefined;
		return artists?.map((a) => a.name).join(', ') ?? '—';
	};

	const getAlbum = (track: Record<string, unknown>): string => {
		const album = track.album as Record<string, unknown> | undefined;
		return (album?.name as string) ?? '—';
	};

	const getAlbumYear = (track: Record<string, unknown>): string => {
		const album = track.album as Record<string, unknown> | undefined;
		const date = album?.release_date as string | undefined;
		return date?.slice(0, 4) ?? '';
	};

	const getAlbumImage = (track: Record<string, unknown>): string | null => {
		const album = track.album as Record<string, unknown> | undefined;
		const images = album?.images as Array<Record<string, unknown>> | undefined;
		return (images?.[0]?.url as string) ?? null;
	};

	const getSpotifyUrl = (track: Record<string, unknown>): string | null => {
		const external = track.external_urls as Record<string, unknown> | undefined;
		return (external?.spotify as string) ?? null;
	};

	const getPopularity = (track: Record<string, unknown>): number => {
		return (track.popularity as number) ?? 0;
	};
</script>

<div class="stack" style="gap: 20px">
	<div>
		<div class="section-header">track lookup</div>
		<div class="card stack">
			{#if !session.isLoggedIn}
				<div style="color: var(--warn); font-size: 12px">
					⚠ not logged in — log in on the home page or paste an access token in the input below
				</div>
			{/if}

			<div class="field">
				<label class="field-label" for="track-input">track id / spotify url / uri</label>
				<input
					id="track-input"
					type="text"
					bind:value={input}
					placeholder="https://open.spotify.com/track/… or 4iV5W9uYEdYUVa79Axb7Rh"
					onkeydown={(e) => e.key === 'Enter' && fetchTrack()}
				/>
			</div>

			<button onclick={fetchTrack} disabled={isLoading || !input.trim()}>
				{#if isLoading}
					<span class="row" style="justify-content: center; gap: 8px">
						<span class="spinner"></span>
						fetching…
					</span>
				{:else}
					fetch track
				{/if}
			</button>

			{#if error}
				<div class="error-box">{error}</div>
			{/if}
		</div>
	</div>

	{#if result}
		<div>
			<div class="section-header">result</div>
			<div class="card stack">
				<!-- Track header -->
				<div class="track-header">
					{#if getAlbumImage(result)}
						<img
							src={getAlbumImage(result)!}
							alt="album art"
							class="album-art"
						/>
					{/if}
					<div class="track-meta">
						<div class="track-name">{result.name ?? '—'}</div>
						<div class="track-sub">{getArtists(result)}</div>
						<div class="track-sub" style="color: var(--muted)">
							{getAlbum(result)}{#if getAlbumYear(result)} · {getAlbumYear(result)}{/if}
						</div>
					</div>
				</div>

				<!-- Key details -->
				<div class="kv-table" style="font-size: 12px">
					<span class="kv-key">duration</span>
					<span class="kv-value">{result.duration_ms ? formatMs(result.duration_ms as number) : '—'}</span>

					<span class="kv-key">explicit</span>
					<span class="kv-value">
						{#if result.explicit}
							<span class="badge red">E</span>
						{:else}
							<span style="color: var(--muted)">no</span>
						{/if}
					</span>

					<span class="kv-key">popularity</span>
					<span class="kv-value">
						<span class="pop-bar">
							<span class="pop-bar-track">
								<span class="pop-bar-fill" style="width: {getPopularity(result)}%"></span>
							</span>
							<span style="color: var(--muted)">{getPopularity(result)}/100</span>
						</span>
					</span>

					<span class="kv-key">track_number</span>
					<span class="kv-value">{result.track_number ?? '—'}</span>

					<span class="kv-key">id</span>
					<span class="kv-value" style="color: var(--muted)">{result.id ?? '—'}</span>

					{#if getSpotifyUrl(result)}
						<span class="kv-key">open</span>
						<span class="kv-value">
							<a href={getSpotifyUrl(result)!} target="_blank" rel="noreferrer">↗ spotify</a>
						</span>
					{/if}
				</div>

				<!-- Raw JSON toggle -->
				<details bind:open={showRaw}>
					<summary style="cursor: pointer; color: var(--muted); font-size: 11px; user-select: none">
						{showRaw ? '▾' : '▸'} raw json
					</summary>
					<pre style="margin-top: 8px">{JSON.stringify(result, null, 2)}</pre>
				</details>
			</div>
		</div>
	{/if}
</div>

<style>
	.track-header {
		display: flex;
		gap: 16px;
		align-items: flex-start;
	}

	.album-art {
		width: 72px;
		height: 72px;
		border-radius: var(--radius);
		flex-shrink: 0;
		border: 1px solid var(--border);
	}

	.track-meta {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.track-name {
		font-size: 16px;
		font-weight: 700;
		color: var(--text);
		line-height: 1.3;
	}

	.track-sub {
		font-size: 13px;
		color: var(--text);
		opacity: 0.7;
	}
</style>
