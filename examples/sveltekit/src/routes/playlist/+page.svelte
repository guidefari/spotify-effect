<script lang="ts">
	import { page } from '$app/state';
	import { session } from '$lib/session.svelte';

	type JsonObject = Record<string, unknown>;

	let input = $state(page.url.searchParams.get('prefill') ?? '');
	let isLoading = $state(false);
	let result = $state<JsonObject | null>(null);
	let error = $state<string | null>(null);
	let showRaw = $state(false);

	const isRecord = (value: unknown): value is JsonObject => typeof value === 'object' && value !== null;
	const getString = (value: unknown): string | null => (typeof value === 'string' ? value : null);
	const getNumber = (value: unknown): number | null => (typeof value === 'number' ? value : null);
	const getArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

	const parsePlaylistId = (value: string): string => {
		const trimmed = value.trim();
		const urlMatch = trimmed.match(/\/playlist\/([A-Za-z0-9]+)/);
		if (urlMatch) return urlMatch[1];
		const uriMatch = trimmed.match(/spotify:playlist:([A-Za-z0-9]+)/);
		if (uriMatch) return uriMatch[1];
		return trimmed;
	};

	async function fetchPlaylist() {
		const playlistId = parsePlaylistId(input);
		if (!playlistId) {
			error = 'Enter a playlist ID or Spotify URL.';
			return;
		}

		const accessToken = session.tokens?.accessToken;
		if (!accessToken) {
			error = 'No access token - log in on the home page first.';
			return;
		}

		isLoading = true;
		error = null;
		result = null;
		showRaw = false;

		try {
			const response = await fetch('/api/playlist', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accessToken, playlistId })
			});

			const data: unknown = await response.json();
			if (!response.ok) {
				const message = isRecord(data) ? getString(data.message) : null;
				throw new Error(message ?? JSON.stringify(data));
			}
			if (!isRecord(data)) {
				throw new Error('Unexpected response shape.');
			}
			result = data;
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			isLoading = false;
		}
	}

	const getPlaylistImage = (playlist: JsonObject): string | null => {
		const firstImage = getArray(playlist.images)[0];
		return isRecord(firstImage) ? getString(firstImage.url) : null;
	};

	const getSpotifyUrl = (playlist: JsonObject | null): string | null => {
		if (!playlist) return null;
		const externalUrls = playlist.external_urls;
		return isRecord(externalUrls) ? getString(externalUrls.spotify) : null;
	};

	const getOwnerName = (playlist: JsonObject): string => {
		const owner = playlist.owner;
		if (!isRecord(owner)) return '-';
		return getString(owner.display_name) ?? getString(owner.id) ?? '-';
	};

	const getTrackCount = (playlist: JsonObject): number => {
		const tracks = playlist.tracks;
		if (!isRecord(tracks)) return 0;
		return getNumber(tracks.total) ?? 0;
	};

	const getFollowers = (playlist: JsonObject): string => {
		const followers = playlist.followers;
		if (!isRecord(followers)) return '-';
		const total = getNumber(followers.total);
		return total === null ? '-' : total.toLocaleString();
	};

	const getPlaylistItems = (playlist: JsonObject): JsonObject[] =>
		getArray(isRecord(playlist.tracks) ? playlist.tracks.items : undefined).filter(isRecord);

	const getTrackName = (item: JsonObject): string => {
		const track = item.track;
		if (!isRecord(track)) return 'unavailable track';
		return getString(track.name) ?? 'unavailable track';
	};

	const getTrackArtists = (item: JsonObject): string => {
		const track = item.track;
		if (!isRecord(track)) return '-';
		const artists = getArray(track.artists)
			.filter(isRecord)
			.map((artist) => getString(artist.name))
			.filter((name): name is string => name !== null);
		return artists.length > 0 ? artists.join(', ') : '-';
	};

	const getTrackImage = (item: JsonObject): string | null => {
		const track = item.track;
		if (!isRecord(track)) return null;
		const album = track.album;
		if (!isRecord(album)) return null;
		const firstImage = getArray(album.images)[0];
		return isRecord(firstImage) ? getString(firstImage.url) : null;
	};

	const getPlaylistDescription = (playlist: JsonObject): string | null => getString(playlist.description);
	const openExternal = (href: string | null): void => {
		if (!href) return;
		window.open(href, '_blank', 'noopener,noreferrer');
	};
</script>

<div class="stack" style="gap: 20px">
	<div>
		<div class="section-header">playlist lookup</div>
		<div class="card stack">
			{#if !session.isLoggedIn}
				<div style="color: var(--warn); font-size: 12px">not logged in - log in on the home page first</div>
			{/if}

			<div class="field">
				<label class="field-label" for="playlist-input">playlist id / spotify url / uri</label>
				<input
					id="playlist-input"
					type="text"
					bind:value={input}
					placeholder="https://open.spotify.com/playlist/... or spotify:playlist:..."
					onkeydown={(event) => event.key === 'Enter' && fetchPlaylist()}
				/>
			</div>

			<button onclick={fetchPlaylist} disabled={isLoading || !input.trim()}>
				{#if isLoading}
					<span class="row" style="justify-content: center; gap: 8px">
						<span class="spinner"></span>
						fetching...
					</span>
				{:else}
					fetch playlist
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
			<div class="card stack" style="gap: 20px">
				<div class="playlist-header">
					{#if getPlaylistImage(result)}
						<img src={getPlaylistImage(result) ?? ''} alt="playlist cover" class="playlist-image" />
					{:else}
						<div class="playlist-image-placeholder">#</div>
					{/if}
					<div class="playlist-meta">
						<div class="playlist-name">{getString(result.name) ?? '-'}</div>
						<div class="playlist-sub">by {getOwnerName(result)}</div>
						<div class="playlist-sub" style="color: var(--muted)">
							{getTrackCount(result)} tracks · {getFollowers(result)} followers
						</div>
						{#if getPlaylistDescription(result)}
							<div class="playlist-description">{getPlaylistDescription(result)}</div>
						{/if}
					</div>
				</div>

				<div class="kv-table" style="font-size: 12px">
					<span class="kv-key">public</span>
					<span class="kv-value">{String(result.public ?? '-')}</span>

					<span class="kv-key">collaborative</span>
					<span class="kv-value">{String(result.collaborative ?? '-')}</span>

					<span class="kv-key">snapshot_id</span>
					<span class="kv-value" style="color: var(--muted)">{getString(result.snapshot_id) ?? '-'}</span>

					<span class="kv-key">id</span>
					<span class="kv-value" style="color: var(--muted)">{getString(result.id) ?? '-'}</span>

					{#if getSpotifyUrl(result)}
						<span class="kv-key">open</span>
						<span class="kv-value">
							<button class="ghost inline-button" onclick={() => openExternal(getSpotifyUrl(result))}>
								open in spotify
							</button>
						</span>
					{/if}
				</div>

				<div class="stack" style="gap: 12px">
					<div class="section-header" style="margin-bottom: 0">tracks</div>
					{#if getPlaylistItems(result).length === 0}
						<div style="color: var(--muted); font-size: 12px">No track items returned.</div>
					{:else}
						<div class="playlist-items">
							{#each getPlaylistItems(result).slice(0, 8) as item, index (`${getTrackName(item)}-${index}`)}
								<div class="playlist-item">
									<div class="playlist-item-index">{index + 1}</div>
									{#if getTrackImage(item)}
										<img src={getTrackImage(item) ?? ''} alt="track artwork" class="playlist-item-image" />
									{:else}
										<div class="playlist-item-image placeholder"></div>
									{/if}
									<div class="playlist-item-meta">
										<div class="playlist-item-name">{getTrackName(item)}</div>
										<div class="playlist-item-subtitle">{getTrackArtists(item)}</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<details bind:open={showRaw}>
					<summary style="cursor: pointer; color: var(--muted); font-size: 11px; user-select: none">
						{showRaw ? 'v' : '>'} raw json
					</summary>
					<pre style="margin-top: 8px">{JSON.stringify(result, null, 2)}</pre>
				</details>
			</div>
		</div>
	{/if}
</div>

<style>
	.playlist-header {
		display: flex;
		gap: 16px;
		align-items: flex-start;
	}

	.playlist-image,
	.playlist-image-placeholder {
		width: 120px;
		height: 120px;
		border-radius: var(--radius);
		flex-shrink: 0;
		border: 1px solid var(--border);
	}

	.playlist-image {
		object-fit: cover;
	}

	.playlist-image-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--surface-2);
		color: var(--muted);
		font-size: 36px;
		font-weight: 700;
	}

	.playlist-meta {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}

	.playlist-name {
		font-size: 20px;
		font-weight: 700;
		line-height: 1.3;
	}

	.playlist-sub,
	.playlist-description {
		font-size: 12px;
	}

	.playlist-description {
		color: var(--muted);
		line-height: 1.7;
	}

	.playlist-items {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.playlist-item {
		display: grid;
		grid-template-columns: 24px 40px minmax(0, 1fr);
		gap: 12px;
		align-items: center;
		padding: 8px 10px;
		border-radius: var(--radius);
		background: var(--bg);
		border: 1px solid var(--border);
	}

	.playlist-item-index {
		color: var(--muted);
		font-size: 11px;
	}

	.playlist-item-image {
		width: 40px;
		height: 40px;
		border-radius: var(--radius);
		object-fit: cover;
	}

	.playlist-item-image.placeholder {
		background: var(--surface-2);
		border: 1px solid var(--border);
	}

	.playlist-item-meta {
		min-width: 0;
	}

	.playlist-item-name,
	.playlist-item-subtitle {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.playlist-item-name {
		font-size: 13px;
		font-weight: 600;
	}

	.playlist-item-subtitle {
		font-size: 11px;
		color: var(--muted);
	}

	.inline-button {
		padding: 4px 10px;
	}
</style>
