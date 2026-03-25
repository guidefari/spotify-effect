<script lang="ts">
	import { session } from '$lib/session.svelte';

	let input = $state('');
	let isLoading = $state(false);
	let result = $state<Record<string, unknown> | null>(null);
	let error = $state<string | null>(null);
	let showRaw = $state(false);

	const parseAlbumId = (value: string): string => {
		const trimmed = value.trim();
		const urlMatch = trimmed.match(/\/album\/([A-Za-z0-9]+)/);
		if (urlMatch) return urlMatch[1];
		const uriMatch = trimmed.match(/spotify:album:([A-Za-z0-9]+)/);
		if (uriMatch) return uriMatch[1];
		return trimmed;
	};

	async function fetchAlbum() {
		const albumId = parseAlbumId(input);
		if (!albumId) {
			error = 'Enter an album ID or Spotify URL.';
			return;
		}

		const accessToken = session.tokens?.accessToken;
		if (!accessToken) {
			error = 'No access token — log in on the home page first.';
			return;
		}

		isLoading = true;
		error = null;
		result = null;
		showRaw = false;

		try {
			const response = await fetch('/api/album', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accessToken, albumId })
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

	const getArtists = (album: Record<string, unknown>): string => {
		const artists = album.artists as Array<Record<string, unknown>> | undefined;
		return artists?.map((a) => a.name).join(', ') ?? '—';
	};

	const getImage = (album: Record<string, unknown>): string | null => {
		const images = album.images as Array<Record<string, unknown>> | undefined;
		return (images?.[0]?.url as string) ?? null;
	};

	const getSpotifyUrl = (album: Record<string, unknown>): string | null => {
		const external = album.external_urls as Record<string, unknown> | undefined;
		return (external?.spotify as string) ?? null;
	};

	const getReleaseYear = (album: Record<string, unknown>): string => {
		const date = album.release_date as string | undefined;
		return date?.slice(0, 4) ?? '';
	};

	const getTotalTracks = (album: Record<string, unknown>): number => {
		return (album.total_tracks as number) ?? 0;
	};

	const getPopularity = (album: Record<string, unknown>): number => {
		return (album.popularity as number) ?? 0;
	};
</script>

<div class="stack" style="gap: 20px">
	<div>
		<div class="section-header">album lookup</div>
		<div class="card stack">
			{#if !session.isLoggedIn}
				<div style="color: var(--warn); font-size: 12px">
					⚠ not logged in — log in on the home page first
				</div>
			{/if}

			<div class="field">
				<label class="field-label" for="album-input">album id / spotify url / uri</label>
				<input
					id="album-input"
					type="text"
					bind:value={input}
					placeholder="https://open.spotify.com/album/… or spotify:album:…"
					onkeydown={(e) => e.key === 'Enter' && fetchAlbum()}
				/>
			</div>

			<button onclick={fetchAlbum} disabled={isLoading || !input.trim()}>
				{#if isLoading}
					<span class="row" style="justify-content: center; gap: 8px">
						<span class="spinner"></span>
						fetching…
					</span>
				{:else}
					fetch album
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
				<div class="album-header">
					{#if getImage(result)}
						<img src={getImage(result)!} alt="album art" class="album-art" />
					{/if}
					<div class="album-meta">
						<div class="album-name">{result.name ?? '—'}</div>
						<div class="album-sub">{getArtists(result)}</div>
						<div class="album-sub" style="color: var(--muted)">
							{getReleaseYear(result)} · {getTotalTracks(result)} tracks
						</div>
					</div>
				</div>

				<div class="kv-table" style="font-size: 12px">
					<span class="kv-key">album_type</span>
					<span class="kv-value" style="color: var(--muted)">{result.album_type ?? '—'}</span>

					<span class="kv-key">popularity</span>
					<span class="kv-value">
						<span class="pop-bar">
							<span class="pop-bar-track">
								<span class="pop-bar-fill" style="width: {getPopularity(result)}%"></span>
							</span>
							<span style="color: var(--muted)">{getPopularity(result)}/100</span>
						</span>
					</span>

					<span class="kv-key">id</span>
					<span class="kv-value" style="color: var(--muted)">{result.id ?? '—'}</span>

					{#if getSpotifyUrl(result)}
						<span class="kv-key">open</span>
						<span class="kv-value">
							<a href={getSpotifyUrl(result)!} target="_blank" rel="noreferrer">↗ spotify</a>
						</span>
					{/if}
				</div>

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
	.album-header {
		display: flex;
		gap: 16px;
		align-items: flex-start;
	}

	.album-art {
		width: 120px;
		height: 120px;
		border-radius: var(--radius);
		flex-shrink: 0;
		border: 1px solid var(--border);
	}

	.album-meta {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.album-name {
		font-size: 18px;
		font-weight: 700;
		color: var(--text);
		line-height: 1.3;
	}

	.album-sub {
		font-size: 13px;
		color: var(--text);
		opacity: 0.7;
	}

	.pop-bar {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.pop-bar-track {
		width: 100px;
		height: 4px;
		background: var(--surface-2);
		border-radius: 2px;
		overflow: hidden;
	}

	.pop-bar-fill {
		height: 100%;
		background: var(--accent);
		border-radius: 2px;
		transition: width 0.3s ease;
	}
</style>
