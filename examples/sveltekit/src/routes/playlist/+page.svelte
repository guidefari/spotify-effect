<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { session } from '$lib/session.svelte';

	type JsonObject = Record<string, unknown>;

	let input = $state(page.url.searchParams.get('prefill') ?? '');
	let isLoading = $state(false);
	let result = $state<JsonObject | null>(null);
	let error = $state<string | null>(null);
	let showRaw = $state(false);
	let isSaving = $state(false);
	let saveMessage = $state<string | null>(null);
	let isMutatingItems = $state(false);
	let itemMessage = $state<string | null>(null);
	let updateName = $state('');
	let updateDescription = $state('');
	let updatePublic = $state(true);
	let updateCollaborative = $state(false);
	let addTrackInput = $state('');
	let removeTrackInput = $state('');
	let addPositionInput = $state('');

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

	const parseTrackUri = (value: string): string | null => {
		const trimmed = value.trim();
		if (!trimmed) return null;
		const uriMatch = trimmed.match(/^spotify:track:([A-Za-z0-9]+)$/);
		if (uriMatch) return trimmed;
		const urlMatch = trimmed.match(/\/track\/([A-Za-z0-9]+)/);
		if (urlMatch) return `spotify:track:${urlMatch[1]}`;
		const idMatch = trimmed.match(/^[A-Za-z0-9]+$/);
		if (idMatch) return `spotify:track:${trimmed}`;
		return null;
	};

	async function fetchPlaylist(prefilledId?: string) {
		const playlistId = parsePlaylistId(prefilledId ?? input);
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
			itemMessage = null;
			updateName = getString(data.name) ?? '';
			updateDescription = getPlaylistDescription(data) ?? '';
			updatePublic = typeof data.public === 'boolean' ? data.public : true;
			updateCollaborative = data.collaborative === true;
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

	onMount(() => {
		if (input.trim()) {
			void fetchPlaylist(input);
		}
	});

	async function savePlaylistDetails() {
		const accessToken = session.tokens?.accessToken;
		const playlistId = result ? getString(result.id) : null;
		if (!accessToken || !playlistId) {
			saveMessage = 'Load a playlist before updating it.';
			return;
		}

		isSaving = true;
		saveMessage = null;

		try {
			const response = await fetch('/api/playlist/update', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					accessToken,
					playlistId,
					name: updateName,
					description: updateDescription,
					public: updatePublic,
					collaborative: updateCollaborative
				})
			});

			const data: unknown = await response.json();
			if (!response.ok) {
				const message = isRecord(data) ? getString(data.message) : null;
				throw new Error(message ?? JSON.stringify(data));
			}

			saveMessage = 'Playlist details updated.';
			await fetchPlaylist(playlistId);
		} catch (err) {
			saveMessage = err instanceof Error ? err.message : String(err);
		} finally {
			isSaving = false;
		}
	}

	const getPlaylistId = (): string | null => (result ? getString(result.id) : null);
	const getSnapshotId = (): string | undefined => {
		const snapshotId = result ? getString(result.snapshot_id) : null;
		return snapshotId ?? undefined;
	};

	async function mutatePlaylistItems(mode: 'add' | 'remove') {
		const accessToken = session.tokens?.accessToken;
		const playlistId = getPlaylistId();
		const rawValue = mode === 'add' ? addTrackInput : removeTrackInput;
		const uri = parseTrackUri(rawValue);

		if (!accessToken || !playlistId) {
			itemMessage = 'Load a playlist before changing its tracks.';
			return;
		}

		if (!uri) {
			itemMessage = 'Enter a track URL, URI, or ID.';
			return;
		}

		isMutatingItems = true;
		itemMessage = null;

		try {
			const response = await fetch(mode === 'add' ? '/api/playlist/add-items' : '/api/playlist/remove-items', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					accessToken,
					playlistId,
					uris: [uri],
					position:
						mode === 'add' && addPositionInput.trim().length > 0 ? Number(addPositionInput) : undefined,
					snapshotId: mode === 'remove' ? getSnapshotId() : undefined
				})
			});

			const data: unknown = await response.json();
			if (!response.ok) {
				const message = isRecord(data) ? getString(data.message) : null;
				throw new Error(message ?? JSON.stringify(data));
			}

			itemMessage = mode === 'add' ? 'Track added to playlist.' : 'Track removed from playlist.';
			if (mode === 'add') {
				addTrackInput = '';
				addPositionInput = '';
			} else {
				removeTrackInput = '';
			}
			await fetchPlaylist(playlistId);
		} catch (err) {
			itemMessage = err instanceof Error ? err.message : String(err);
		} finally {
			isMutatingItems = false;
		}
	}
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

			<button onclick={() => fetchPlaylist()} disabled={isLoading || !input.trim()}>
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
					<div class="section-header" style="margin-bottom: 0">update details</div>
					<div class="field">
						<label class="field-label" for="update-name">name</label>
						<input id="update-name" type="text" bind:value={updateName} />
					</div>
					<div class="field">
						<label class="field-label" for="update-description">description</label>
						<textarea id="update-description" rows={3} bind:value={updateDescription}></textarea>
					</div>
					<div class="row" style="flex-wrap: wrap; gap: 16px">
						<label class="checkbox-row">
							<input type="checkbox" bind:checked={updatePublic} />
							<span>public</span>
						</label>
						<label class="checkbox-row">
							<input type="checkbox" bind:checked={updateCollaborative} />
							<span>collaborative</span>
						</label>
					</div>
					<div class="row" style="justify-content: space-between; flex-wrap: wrap; gap: 12px">
						<button onclick={savePlaylistDetails} disabled={isSaving}>
							{#if isSaving}
								<span class="row" style="justify-content: center; gap: 8px">
									<span class="spinner"></span>
									saving...
								</span>
							{:else}
								save details
							{/if}
						</button>
						{#if saveMessage}
							<span style="font-size: 12px; color: var(--muted)">{saveMessage}</span>
						{/if}
					</div>
				</div>

				<div class="stack" style="gap: 12px">
					<div class="section-header" style="margin-bottom: 0">tracks</div>
					<div class="track-actions">
						<div class="stack track-action-card">
							<div class="field">
								<label class="field-label" for="add-track-input">add track</label>
								<input
									id="add-track-input"
									type="text"
									bind:value={addTrackInput}
									placeholder="spotify:track:... or https://open.spotify.com/track/..."
								/>
							</div>
							<div class="field">
								<label class="field-label" for="add-position-input">position (optional)</label>
								<input id="add-position-input" type="number" min="0" bind:value={addPositionInput} />
							</div>
							<button onclick={() => mutatePlaylistItems('add')} disabled={isMutatingItems || !addTrackInput.trim()}>
								add track
							</button>
						</div>
						<div class="stack track-action-card">
							<div class="field">
								<label class="field-label" for="remove-track-input">remove track</label>
								<input
									id="remove-track-input"
									type="text"
									bind:value={removeTrackInput}
									placeholder="spotify:track:... or https://open.spotify.com/track/..."
								/>
							</div>
							<button
								class="ghost"
								onclick={() => mutatePlaylistItems('remove')}
								disabled={isMutatingItems || !removeTrackInput.trim()}
							>
								remove track
							</button>
						</div>
					</div>
					{#if itemMessage}
						<div style="font-size: 12px; color: var(--muted)">{itemMessage}</div>
					{/if}
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

	.track-actions {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 12px;
	}

	.track-action-card {
		padding: 12px;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg);
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

	.checkbox-row {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: var(--muted);
	}

	.checkbox-row input {
		width: auto;
	}
</style>
