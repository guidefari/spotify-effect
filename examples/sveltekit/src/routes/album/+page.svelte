<script lang="ts">
	import { session } from '$lib/session.svelte';

	type JsonObject = Record<string, unknown>;

	const PAGE_SIZE = 20;

	let searchQuery = $state('');
	let searchResults = $state<JsonObject[] | null>(null);
	let libraryAlbums = $state<JsonObject[] | null>(null);
	let libraryTotal = $state(0);
	let libraryOffset = $state(0);
	let selectedAlbum = $state<JsonObject | null>(null);
	let isLoadingLibrary = $state(false);
	let isLoadingSearch = $state(false);
	let isLoadingDetail = $state(false);
	let error = $state<string | null>(null);
	let showRaw = $state(false);

	const libraryPage = $derived(Math.floor(libraryOffset / PAGE_SIZE) + 1);
	const libraryTotalPages = $derived(Math.max(1, Math.ceil(libraryTotal / PAGE_SIZE)));
	const hasNextPage = $derived(libraryOffset + PAGE_SIZE < libraryTotal);
	const hasPrevPage = $derived(libraryOffset > 0);

	const getImage = (item: JsonObject): string | null => {
		const images = item.images as Array<JsonObject> | undefined;
		return (images?.[0]?.url as string) ?? null;
	};

	const getArtists = (item: JsonObject): string => {
		const artists = item.artists as Array<JsonObject> | undefined;
		return artists?.map((a) => a.name).join(', ') ?? '';
	};

	const getReleaseYear = (item: JsonObject): string => {
		const date = item.release_date as string | undefined;
		return date?.slice(0, 4) ?? '';
	};

	const getPopularity = (item: JsonObject): number => {
		return (item.popularity as number) ?? 0;
	};

	const getSpotifyUrl = (item: JsonObject): string | null => {
		const external = item.external_urls as JsonObject | undefined;
		return (external?.spotify as string) ?? null;
	};

	const getTotalTracks = (item: JsonObject): number => {
		return (item.total_tracks as number) ?? 0;
	};

	const getTracks = (album: JsonObject): JsonObject[] => {
		const tracks = album.tracks as JsonObject | undefined;
		const items = tracks?.items as Array<JsonObject> | undefined;
		return items ?? [];
	};

	const formatDuration = (ms: unknown): string => {
		if (typeof ms !== 'number') return '—';
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	};

	let copiedField = $state<string | null>(null);

	async function copyToClipboard(value: string, field: string) {
		await navigator.clipboard.writeText(value);
		copiedField = field;
		setTimeout(() => { if (copiedField === field) copiedField = null; }, 1500);
	}

	async function fetchLibrary(offset = 0) {
		const accessToken = session.tokens?.accessToken;
		if (!accessToken) return;

		isLoadingLibrary = true;
		error = null;
		try {
			const response = await fetch('/api/library', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accessToken, limit: PAGE_SIZE, offset })
			});
			const data: unknown = await response.json();
			if (!response.ok || typeof data !== 'object' || data === null) {
				throw new Error(JSON.stringify(data));
			}
			const d = data as JsonObject;
			const albumsPage = d.albums as JsonObject | undefined;
			const items = (albumsPage?.items as Array<JsonObject>) ?? [];
			libraryAlbums = items
				.map((item) => item.album)
				.filter((a): a is JsonObject => typeof a === 'object' && a !== null);
			libraryTotal = (albumsPage?.total as number) ?? 0;
			libraryOffset = offset;
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			isLoadingLibrary = false;
		}
	}

	function goToPage(direction: 'next' | 'prev') {
		const newOffset = direction === 'next'
			? libraryOffset + PAGE_SIZE
			: Math.max(0, libraryOffset - PAGE_SIZE);
		fetchLibrary(newOffset);
	}

	async function performSearch(query: string) {
		const accessToken = session.tokens?.accessToken;
		if (!accessToken) return;

		isLoadingSearch = true;
		error = null;
		try {
			const response = await fetch('/api/search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accessToken, query, types: ['album'] })
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.message ?? JSON.stringify(data));
			const albums = (data as JsonObject).albums as JsonObject | undefined;
			searchResults = ((albums?.items as Array<JsonObject>) ?? []);
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			isLoadingSearch = false;
		}
	}

	async function selectAlbum(albumId: string) {
		const accessToken = session.tokens?.accessToken;
		if (!accessToken) return;

		isLoadingDetail = true;
		error = null;
		showRaw = false;
		try {
			const response = await fetch('/api/album', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accessToken, albumId })
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.message ?? JSON.stringify(data));
			selectedAlbum = data as JsonObject;
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			isLoadingDetail = false;
		}
	}

	function clearSelection() {
		selectedAlbum = null;
		showRaw = false;
	}

	$effect(() => {
		if (session.tokens?.accessToken && !libraryAlbums && !isLoadingLibrary) {
			fetchLibrary();
		}
	});

	$effect(() => {
		const q = searchQuery.trim();
		if (!q) {
			searchResults = null;
			return;
		}
		const timer = setTimeout(() => performSearch(q), 400);
		return () => clearTimeout(timer);
	});

	const displayAlbums = $derived(
		searchQuery.trim() && searchResults ? searchResults : libraryAlbums ?? []
	);

	const gridLabel = $derived(searchQuery.trim() && searchResults ? 'search results' : 'your library');
	const isGridLoading = $derived(searchQuery.trim() ? isLoadingSearch : isLoadingLibrary);
</script>

<div class="stack" style="gap: 20px">
	<div>
		<div class="section-header">albums</div>
		<div class="card stack">
			{#if !session.isLoggedIn}
				<div style="color: var(--warn); font-size: 12px">
					⚠ not logged in — log in on the home page first
				</div>
			{/if}

			<div class="field">
				<label class="field-label" for="album-search">search albums</label>
				<input
					id="album-search"
					type="text"
					bind:value={searchQuery}
					placeholder="search by name, artist..."
					disabled={!session.isLoggedIn}
				/>
			</div>

			{#if isLoadingSearch}
				<div style="font-size: 11px; color: var(--muted)">
					<span class="spinner" style="width: 12px; height: 12px"></span>
					searching…
				</div>
			{/if}
		</div>
	</div>

	{#if error}
		<div class="error-box">{error}</div>
	{/if}

	{#if isLoadingDetail}
		<div class="card" style="text-align: center; padding: 40px">
			<span class="spinner"></span>
		</div>
	{:else if selectedAlbum}
		<div>
			<button class="ghost" onclick={clearSelection} style="margin-bottom: 12px">← back</button>
			<div class="section-header">album detail</div>
			<div class="card stack">
				<div class="album-header">
					{#if getImage(selectedAlbum)}
						<img src={getImage(selectedAlbum)!} alt="album art" class="album-art" />
					{/if}
					<div class="album-meta">
						<div class="album-name">{selectedAlbum.name ?? '—'}</div>
						<div class="album-sub">{getArtists(selectedAlbum)}</div>
						<div class="album-sub" style="color: var(--muted)">
							{getReleaseYear(selectedAlbum)} · {getTotalTracks(selectedAlbum)} tracks
						</div>
					</div>
				</div>

				<div class="kv-table" style="font-size: 12px">
					<span class="kv-key">album_type</span>
					<span class="kv-value" style="color: var(--muted)">{selectedAlbum.album_type ?? '—'}</span>

					<span class="kv-key">popularity</span>
					<span class="kv-value">
						<span class="pop-bar">
							<span class="pop-bar-track">
								<span class="pop-bar-fill" style="width: {getPopularity(selectedAlbum)}%"></span>
							</span>
							<span style="color: var(--muted)">{getPopularity(selectedAlbum)}/100</span>
						</span>
					</span>

					<span class="kv-key">id</span>
					<span class="kv-value">
						<button class="copy-btn" onclick={() => copyToClipboard(String(selectedAlbum!.id ?? ''), 'id')}>
							{copiedField === 'id' ? '✓ copied' : selectedAlbum.id ?? '—'}
						</button>
					</span>

					{#if getSpotifyUrl(selectedAlbum)}
						<span class="kv-key">link</span>
						<span class="kv-value row" style="gap: 8px">
							<a href={getSpotifyUrl(selectedAlbum)!} target="_blank" rel="noreferrer">↗ spotify</a>
							<button class="copy-btn" onclick={() => copyToClipboard(getSpotifyUrl(selectedAlbum!)!, 'url')}>
								{copiedField === 'url' ? '✓ copied' : 'copy'}
							</button>
						</span>
					{/if}
				</div>

				{#if getTracks(selectedAlbum).length > 0}
					<div class="tracklist">
						<div class="tracklist-header">
							<span class="track-num">#</span>
							<span class="track-title">title</span>
							<span class="track-duration">duration</span>
						</div>
						{#each getTracks(selectedAlbum) as track, i (track.id ?? i)}
							<div class="track-row">
								<span class="track-num">{(track.track_number as number) ?? i + 1}</span>
								<span class="track-info">
									<span class="track-name">{track.name ?? '—'}</span>
									{#if getArtists(track) && getArtists(track) !== getArtists(selectedAlbum)}
										<span class="track-artist">{getArtists(track)}</span>
									{/if}
								</span>
								<span class="track-duration">{formatDuration(track.duration_ms)}</span>
							</div>
						{/each}
					</div>
				{/if}

				<details bind:open={showRaw}>
					<summary style="cursor: pointer; color: var(--muted); font-size: 11px; user-select: none">
						{showRaw ? '▾' : '▸'} raw json
					</summary>
					<pre style="margin-top: 8px">{JSON.stringify(selectedAlbum, null, 2)}</pre>
				</details>
			</div>
		</div>
	{:else}
		<div>
			<div class="section-header">{gridLabel}</div>
			{#if isGridLoading}
				<div class="card" style="text-align: center; padding: 40px">
					<span class="spinner"></span>
				</div>
			{:else if displayAlbums.length > 0}
				<div class="album-grid">
					{#each displayAlbums as album, i (album.id ?? i)}
						<button class="album-card" onclick={() => selectAlbum(album.id as string)}>
							{#if getImage(album)}
								<img src={getImage(album)!} alt="" />
							{:else}
								<div class="album-card-placeholder"></div>
							{/if}
							<div class="album-card-name">{album.name ?? '—'}</div>
							<div class="album-card-artist">{getArtists(album) || '—'}</div>
						</button>
					{/each}
				</div>
			{:else if !isGridLoading && session.isLoggedIn}
				<div class="card" style="text-align: center; padding: 40px; color: var(--muted); font-size: 13px">
					{searchQuery.trim() ? 'no albums found' : 'no saved albums'}
				</div>
			{/if}

			{#if !searchQuery.trim() && libraryTotal > 0}
				<div class="pagination">
					<button class="ghost" onclick={() => goToPage('prev')} disabled={!hasPrevPage}>← prev</button>
					<span class="pagination-info">
						{libraryOffset + 1}–{Math.min(libraryOffset + PAGE_SIZE, libraryTotal)} of {libraryTotal}
						<span class="pagination-page">page {libraryPage}/{libraryTotalPages}</span>
					</span>
					<button class="ghost" onclick={() => goToPage('next')} disabled={!hasNextPage}>next →</button>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.album-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 16px;
	}

	.album-card {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		cursor: pointer;
		text-align: left;
		color: var(--text);
		font-family: var(--font);
		transition: background 0.15s, border-color 0.15s;
	}

	.album-card:hover {
		background: var(--surface-2);
		border-color: var(--accent-border);
	}

	.album-card img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: var(--radius);
	}

	.album-card-placeholder {
		width: 100%;
		aspect-ratio: 1;
		background: var(--surface-2);
		border-radius: var(--radius);
	}

	.album-card-name {
		font-size: 12px;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.album-card-artist {
		font-size: 11px;
		color: var(--muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

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

	.tracklist {
		display: flex;
		flex-direction: column;
	}

	.tracklist-header {
		display: grid;
		grid-template-columns: 32px 1fr 56px;
		gap: 8px;
		padding: 8px 4px;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted);
		border-bottom: 1px solid var(--border);
	}

	.track-row {
		display: grid;
		grid-template-columns: 32px 1fr 56px;
		gap: 8px;
		align-items: center;
		padding: 8px 4px;
		border-bottom: 1px solid var(--border);
		transition: background 0.1s;
	}

	.track-row:last-child {
		border-bottom: none;
	}

	.track-row:hover {
		background: var(--surface-2);
		border-radius: var(--radius);
	}

	.track-num {
		font-size: 12px;
		color: var(--muted);
		text-align: center;
	}

	.track-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.track-name {
		font-size: 13px;
		color: var(--text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.track-artist {
		font-size: 11px;
		color: var(--muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.track-duration {
		font-size: 12px;
		color: var(--muted);
		text-align: right;
	}

	.copy-btn {
		background: none;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--muted);
		font-family: var(--font);
		font-size: 12px;
		padding: 2px 8px;
		cursor: pointer;
		transition: color 0.15s, border-color 0.15s;
	}

	.copy-btn:hover {
		color: var(--accent);
		border-color: var(--accent-border);
	}

	.pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
		padding: 12px 0;
	}

	.pagination-info {
		font-size: 12px;
		color: var(--muted);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.pagination-page {
		font-size: 11px;
		opacity: 0.7;
	}

	.pagination button:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
</style>
