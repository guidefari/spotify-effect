<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { session } from '$lib/session.svelte';

	type JsonObject = Record<string, unknown>;

	const PAGE_SIZE = 12;

	let isLoading = $state(false);
	let result = $state<JsonObject | null>(null);
	let error = $state<string | null>(null);
	let showRaw = $state(false);
	let offset = $state(0);
	let isCreating = $state(false);
	let createMessage = $state<string | null>(null);
	let createName = $state('');
	let createDescription = $state('');
	let createPublic = $state(true);
	let createCollaborative = $state(false);

	const isRecord = (value: unknown): value is JsonObject => typeof value === 'object' && value !== null;
	const getString = (value: unknown): string | null => (typeof value === 'string' ? value : null);
	const getNumber = (value: unknown): number | null => (typeof value === 'number' ? value : null);
	const getArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

	const getPlaylistItems = (payload: JsonObject | null): JsonObject[] =>
		getArray(payload?.items).filter(isRecord);

	const getTotal = (payload: JsonObject | null): number => getNumber(payload?.total) ?? 0;

	const getPageLabel = (): string => {
		const total = getTotal(result);
		if (total === 0) return '0 results';
		const start = offset + 1;
		const end = Math.min(offset + getPlaylistItems(result).length, total);
		return `${start}-${end} of ${total}`;
	};

	async function fetchPlaylists(nextOffset = 0) {
		const accessToken = session.tokens?.accessToken;
		if (!accessToken) {
			error = 'No access token - log in on the home page first.';
			return;
		}

		isLoading = true;
		error = null;
		showRaw = false;
		if (nextOffset === 0) {
			result = null;
		}

		try {
			const response = await fetch('/api/playlists', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accessToken, limit: PAGE_SIZE, offset: nextOffset })
			});

			const data: unknown = await response.json();
			if (!response.ok) {
				const message = isRecord(data) ? getString(data.message) : null;
				throw new Error(message ?? JSON.stringify(data));
			}
			if (!isRecord(data)) {
				throw new Error('Unexpected response shape.');
			}

			offset = nextOffset;
			result = data;
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			isLoading = false;
		}
	}

	const canGoPrevious = $derived(offset > 0 && !isLoading);
	const canGoNext = $derived(result !== null && offset + PAGE_SIZE < getTotal(result) && !isLoading);

	const getOwnerName = (playlist: JsonObject): string => {
		const owner = playlist.owner;
		if (!isRecord(owner)) return '-';
		return getString(owner.display_name) ?? getString(owner.id) ?? '-';
	};

	const getPlaylistImage = (playlist: JsonObject): string | null => {
		const firstImage = getArray(playlist.images)[0];
		return isRecord(firstImage) ? getString(firstImage.url) : null;
	};

	const getTrackCount = (playlist: JsonObject): number => {
		const tracks = playlist.tracks;
		if (!isRecord(tracks)) return 0;
		return getNumber(tracks.total) ?? 0;
	};

	const getSpotifyUrl = (playlist: JsonObject): string | null => {
		const externalUrls = playlist.external_urls;
		return isRecord(externalUrls) ? getString(externalUrls.spotify) : null;
	};

	const getPlaylistId = (playlist: JsonObject): string => getString(playlist.id) ?? '';
	const getLookupHref = (playlist: JsonObject): string => {
		const playlistId = getPlaylistId(playlist);
		return `${resolve('/playlist')}?prefill=${encodeURIComponent(playlistId)}`;
	};
	const openExternal = (href: string | null): void => {
		if (!href) return;
		window.open(href, '_blank', 'noopener,noreferrer');
	};
	const openLookup = (playlist: JsonObject): void => {
		window.location.href = getLookupHref(playlist);
	};

	async function createPlaylist() {
		const accessToken = session.tokens?.accessToken;
		if (!accessToken) {
			createMessage = 'No access token - log in on the home page first.';
			return;
		}

		if (!createName.trim()) {
			createMessage = 'Playlist name is required.';
			return;
		}

		isCreating = true;
		createMessage = null;

		try {
			const response = await fetch('/api/playlist/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					accessToken,
					name: createName.trim(),
					description: createDescription,
					public: createPublic,
					collaborative: createCollaborative
				})
			});

			const data: unknown = await response.json();
			if (!response.ok) {
				const message = isRecord(data) ? getString(data.message) : null;
				throw new Error(message ?? JSON.stringify(data));
			}

			createMessage = 'Playlist created.';
			createName = '';
			createDescription = '';
			createPublic = true;
			createCollaborative = false;
			await fetchPlaylists(0);
		} catch (err) {
			createMessage = err instanceof Error ? err.message : String(err);
		} finally {
			isCreating = false;
		}
	}

	onMount(() => {
		if (session.tokens?.accessToken) {
			void fetchPlaylists(0);
		}
	});
</script>

<div class="stack" style="gap: 20px">
	<div>
		<div class="section-header">my playlists</div>
		<div class="card stack">
			<p style="color: var(--muted); font-size: 12px; line-height: 1.7">
				Loads the current user's playlists with the new `spotify.playlists.getMyPlaylists()` API.
			</p>

			<div class="stack" style="gap: 12px">
				<div class="section-header" style="margin-bottom: 0">create playlist</div>
				<div class="field">
					<label class="field-label" for="create-name">name</label>
					<input id="create-name" type="text" bind:value={createName} placeholder="release radar clone" />
				</div>
				<div class="field">
					<label class="field-label" for="create-description">description</label>
					<textarea id="create-description" rows={3} bind:value={createDescription}></textarea>
				</div>
				<div class="row" style="flex-wrap: wrap; gap: 16px">
					<label class="checkbox-row">
						<input type="checkbox" bind:checked={createPublic} />
						<span>public</span>
					</label>
					<label class="checkbox-row">
						<input type="checkbox" bind:checked={createCollaborative} />
						<span>collaborative</span>
					</label>
				</div>
				<div class="row" style="justify-content: space-between; flex-wrap: wrap; gap: 12px">
					<button onclick={createPlaylist} disabled={isCreating || !createName.trim()}>
						{#if isCreating}
							<span class="row" style="justify-content: center; gap: 8px">
								<span class="spinner"></span>
								creating...
							</span>
						{:else}
							create playlist
						{/if}
					</button>
					{#if createMessage}
						<span style="font-size: 12px; color: var(--muted)">{createMessage}</span>
					{/if}
				</div>
			</div>

			{#if !session.isLoggedIn}
				<div style="color: var(--warn); font-size: 12px">not logged in - log in on the home page first</div>
			{/if}

			<div class="row" style="justify-content: space-between; flex-wrap: wrap; gap: 12px">
				<button onclick={() => fetchPlaylists(0)} disabled={isLoading || !session.tokens?.accessToken}>
					{#if isLoading && result === null}
						<span class="row" style="justify-content: center; gap: 8px">
							<span class="spinner"></span>
							loading...
						</span>
					{:else}
						load playlists
					{/if}
				</button>

				{#if result}
					<span style="font-size: 12px; color: var(--muted)">{getPageLabel()}</span>
				{/if}
			</div>

			{#if error}
				<div class="error-box">{error}</div>
			{/if}
		</div>
	</div>

	{#if result}
		<div>
			<div class="section-header">results</div>
			<div class="card stack" style="gap: 18px">
				{#if getPlaylistItems(result).length === 0}
					<div style="color: var(--muted); text-align: center; padding: 20px 0">No playlists found.</div>
				{:else}
					<div class="playlist-grid">
						{#each getPlaylistItems(result) as playlist (getPlaylistId(playlist))}
							<div class="playlist-card">
								{#if getPlaylistImage(playlist)}
									<img src={getPlaylistImage(playlist) ?? ''} alt="playlist cover" class="playlist-cover" />
								{:else}
									<div class="playlist-cover placeholder">#</div>
								{/if}

								<div class="stack" style="gap: 6px">
									<div class="playlist-name">{getString(playlist.name) ?? '-'}</div>
									<div class="playlist-meta">by {getOwnerName(playlist)}</div>
									<div class="playlist-meta">{getTrackCount(playlist)} tracks</div>
								</div>

								<div class="row" style="justify-content: space-between; margin-top: auto">
									{#if getSpotifyUrl(playlist)}
										<button class="ghost playlist-action" onclick={() => openExternal(getSpotifyUrl(playlist))}>
											spotify
										</button>
									{/if}
									{#if getPlaylistId(playlist)}
										<button class="ghost playlist-action" onclick={() => openLookup(playlist)}>
											lookup
										</button>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}

				<div class="row" style="justify-content: space-between; flex-wrap: wrap; gap: 12px">
					<button class="ghost" onclick={() => fetchPlaylists(Math.max(0, offset - PAGE_SIZE))} disabled={!canGoPrevious}>
						previous
					</button>
					<button class="ghost" onclick={() => fetchPlaylists(offset + PAGE_SIZE)} disabled={!canGoNext}>
						next
					</button>
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
	.playlist-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
		gap: 14px;
	}

	.playlist-card {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 12px;
		border-radius: var(--radius-lg);
		border: 1px solid var(--border);
		background: var(--bg);
		min-height: 100%;
	}

	.playlist-cover {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: var(--radius);
		border: 1px solid var(--border);
	}

	.playlist-cover.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--surface-2);
		color: var(--muted);
		font-size: 32px;
		font-weight: 700;
	}

	.playlist-name {
		font-size: 14px;
		font-weight: 700;
		line-height: 1.4;
	}

	.playlist-meta {
		font-size: 11px;
		color: var(--muted);
	}

	.playlist-action {
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
