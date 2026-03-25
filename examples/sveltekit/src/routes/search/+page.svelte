<script lang="ts">
	import { session } from '$lib/session.svelte';
	import type { SearchType } from 'spotify-effect';

	let query = $state('');
	let selectedTypes = $state<SearchType[]>(['track']);
	let isLoading = $state(false);
	let result = $state<Record<string, unknown> | null>(null);
	let error = $state<string | null>(null);
	let showRaw = $state(false);

	const searchTypes: { value: SearchType; label: string }[] = [
		{ value: 'track', label: 'tracks' },
		{ value: 'artist', label: 'artists' },
		{ value: 'album', label: 'albums' },
		{ value: 'playlist', label: 'playlists' }
	];

	function toggleType(type: SearchType) {
		if (selectedTypes.includes(type)) {
			selectedTypes = selectedTypes.filter((t) => t !== type);
		} else {
			selectedTypes = [...selectedTypes, type];
		}
	}

	async function performSearch() {
		if (!query.trim()) {
			error = 'Enter a search query.';
			return;
		}

		if (selectedTypes.length === 0) {
			error = 'Select at least one search type.';
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
			const response = await fetch('/api/search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accessToken, query: query.trim(), types: selectedTypes })
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

	const getResults = (type: string): Array<Record<string, unknown>> => {
		if (!result) return [];
		const pluralKey = type + 's';
		const typeResults = result[pluralKey] as Record<string, unknown> | undefined;
		const items = typeResults?.items as Array<Record<string, unknown>> | undefined;
		return items ?? [];
	};

	const hasResults = (type: string): boolean => {
		return getResults(type).length > 0;
	};

	const getResultName = (item: Record<string, unknown>): string => {
		return (item.name as string) ?? '—';
	};

	const getResultSubtitle = (item: Record<string, unknown>, type: string): string => {
		if (type === 'track') {
			const artists = item.artists as Array<Record<string, unknown>> | undefined;
			return artists?.map((a) => a.name).join(', ') ?? '';
		}
		if (type === 'album') {
			const artists = item.artists as Array<Record<string, unknown>> | undefined;
			return artists?.map((a) => a.name).join(', ') ?? '';
		}
		return '';
	};

	const getResultImage = (item: Record<string, unknown>): string | null => {
		const images = item.images as Array<Record<string, unknown>> | undefined;
		if (images && images.length > 0) {
			return (images[0].url as string) ?? null;
		}
		const album = item.album as Record<string, unknown> | undefined;
		if (album) {
			const albumImages = album.images as Array<Record<string, unknown>> | undefined;
			return (albumImages?.[0]?.url as string) ?? null;
		}
		return null;
	};

	const formatTypeLabel = (type: string): string => {
		return type.charAt(0).toUpperCase() + type.slice(1) + 's';
	};
</script>

<div class="stack" style="gap: 20px">
	<div>
		<div class="section-header">search</div>
		<div class="card stack">
			{#if !session.isLoggedIn}
				<div style="color: var(--warn); font-size: 12px">
					⚠ not logged in — log in on the home page first
				</div>
			{/if}

			<div class="field">
				<label class="field-label" for="search-input">query</label>
				<input
					id="search-input"
					type="text"
					bind:value={query}
					placeholder="search for tracks, artists, albums..."
					onkeydown={(e) => e.key === 'Enter' && performSearch()}
				/>
			</div>

			<div class="field">
				<span class="field-label">types</span>
				<div class="type-chips">
					{#each searchTypes as type}
						<button
							class="type-chip"
							class:active={selectedTypes.includes(type.value)}
							onclick={() => toggleType(type.value)}
							type="button"
						>
							{type.label}
						</button>
					{/each}
				</div>
			</div>

			<button onclick={performSearch} disabled={isLoading || !query.trim() || selectedTypes.length === 0}>
				{#if isLoading}
					<span class="row" style="justify-content: center; gap: 8px">
						<span class="spinner"></span>
						searching…
					</span>
				{:else}
					search
				{/if}
			</button>

			{#if error}
				<div class="error-box">{error}</div>
			{/if}
		</div>
	</div>

	{#if result}
		<div>
			<div class="section-header">results</div>
			<div class="card stack" style="gap: 24px">
				{#each selectedTypes as type}
					{#if hasResults(type)}
						<div class="result-section">
							<div class="result-section-header">{formatTypeLabel(type)}</div>
							<div class="results-list">
								{#each getResults(type).slice(0, 5) as item}
									<div class="result-item">
										{#if getResultImage(item)}
											<img src={getResultImage(item)!} alt="" class="result-image" />
										{:else}
											<div class="result-image-placeholder"></div>
										{/if}
										<div class="result-meta">
											<div class="result-name">{getResultName(item)}</div>
											{#if getResultSubtitle(item, type)}
												<div class="result-subtitle">{getResultSubtitle(item, type)}</div>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				{/each}

				{#if selectedTypes.every((t) => !hasResults(t))}
					<div style="color: var(--muted); text-align: center; padding: 24px">
						No results found
					</div>
				{/if}

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
	.type-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.type-chip {
		padding: 6px 12px;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--muted);
		font-size: 12px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.type-chip:hover {
		background: var(--surface-2);
		color: var(--text);
	}

	.type-chip.active {
		background: var(--accent);
		color: white;
		border-color: var(--accent);
	}

	.result-section {
		border-bottom: 1px solid var(--border);
		padding-bottom: 16px;
	}

	.result-section:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}

	.result-section-header {
		font-size: 12px;
		font-weight: 600;
		color: var(--text);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 12px;
	}

	.results-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.result-item {
		display: flex;
		gap: 12px;
		align-items: center;
		padding: 8px;
		border-radius: var(--radius);
		transition: background 0.15s;
	}

	.result-item:hover {
		background: var(--surface-2);
	}

	.result-image {
		width: 48px;
		height: 48px;
		border-radius: var(--radius);
		object-fit: cover;
		flex-shrink: 0;
	}

	.result-image-placeholder {
		width: 48px;
		height: 48px;
		border-radius: var(--radius);
		background: var(--surface-2);
		flex-shrink: 0;
	}

	.result-meta {
		min-width: 0;
		overflow: hidden;
	}

	.result-name {
		font-size: 13px;
		font-weight: 500;
		color: var(--text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.result-subtitle {
		font-size: 11px;
		color: var(--muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
