<script lang="ts">
	import { session } from '$lib/session.svelte';

	let input = $state('');
	let isLoading = $state(false);
	let result = $state<Record<string, unknown> | null>(null);
	let error = $state<string | null>(null);
	let showRaw = $state(false);

	const parseArtistId = (value: string): string => {
		const trimmed = value.trim();
		const urlMatch = trimmed.match(/\/artist\/([A-Za-z0-9]+)/);
		if (urlMatch) return urlMatch[1];
		const uriMatch = trimmed.match(/spotify:artist:([A-Za-z0-9]+)/);
		if (uriMatch) return uriMatch[1];
		return trimmed;
	};

	async function fetchArtist() {
		const artistId = parseArtistId(input);
		if (!artistId) {
			error = 'Enter an artist ID or Spotify URL.';
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
			const response = await fetch('/api/artist', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accessToken, artistId })
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

	const getImage = (artist: Record<string, unknown>): string | null => {
		const images = artist.images as Array<Record<string, unknown>> | undefined;
		return (images?.[0]?.url as string) ?? null;
	};

	const getSpotifyUrl = (artist: Record<string, unknown>): string | null => {
		const external = artist.external_urls as Record<string, unknown> | undefined;
		return (external?.spotify as string) ?? null;
	};

	const getFollowers = (artist: Record<string, unknown>): string => {
		const followers = artist.followers as Record<string, unknown> | undefined;
		const total = followers?.total as number | undefined;
		if (typeof total !== 'number') return '—';
		return total.toLocaleString();
	};

	const getGenres = (artist: Record<string, unknown>): string => {
		const genres = artist.genres as string[] | undefined;
		if (!genres || genres.length === 0) return '—';
		return genres.slice(0, 3).join(', ');
	};

	const getPopularity = (artist: Record<string, unknown>): number => {
		return (artist.popularity as number) ?? 0;
	};
</script>

<div class="stack" style="gap: 20px">
	<div>
		<div class="section-header">artist lookup</div>
		<div class="card stack">
			{#if !session.isLoggedIn}
				<div style="color: var(--warn); font-size: 12px">
					⚠ not logged in — log in on the home page first
				</div>
			{/if}

			<div class="field">
				<label class="field-label" for="artist-input">artist id / spotify url / uri</label>
				<input
					id="artist-input"
					type="text"
					bind:value={input}
					placeholder="https://open.spotify.com/artist/… or spotify:artist:…"
					onkeydown={(e) => e.key === 'Enter' && fetchArtist()}
				/>
			</div>

			<button onclick={fetchArtist} disabled={isLoading || !input.trim()}>
				{#if isLoading}
					<span class="row" style="justify-content: center; gap: 8px">
						<span class="spinner"></span>
						fetching…
					</span>
				{:else}
					fetch artist
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
				<div class="artist-header">
					{#if getImage(result)}
						<img src={getImage(result)!} alt="artist" class="artist-image" />
					{:else}
						<div class="artist-image-placeholder">
							{(result.name as string)?.[0]?.toUpperCase() ?? '?'}
						</div>
					{/if}
					<div class="artist-meta">
						<div class="artist-name">{result.name ?? '—'}</div>
						<div class="artist-sub" style="color: var(--muted)">{getGenres(result)}</div>
					</div>
				</div>

				<div class="kv-table" style="font-size: 12px">
					<span class="kv-key">followers</span>
					<span class="kv-value">{getFollowers(result)}</span>

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
	.artist-header {
		display: flex;
		gap: 16px;
		align-items: center;
	}

	.artist-image {
		width: 120px;
		height: 120px;
		border-radius: 50%;
		flex-shrink: 0;
		border: 1px solid var(--border);
		object-fit: cover;
	}

	.artist-image-placeholder {
		width: 120px;
		height: 120px;
		border-radius: 50%;
		flex-shrink: 0;
		border: 1px solid var(--border);
		background: var(--surface-2);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 48px;
		font-weight: 700;
		color: var(--muted);
	}

	.artist-meta {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.artist-name {
		font-size: 22px;
		font-weight: 700;
		color: var(--text);
		line-height: 1.3;
	}

	.artist-sub {
		font-size: 13px;
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
