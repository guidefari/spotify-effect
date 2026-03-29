<script lang="ts">
	import { session } from '$lib/session.svelte';

	type JsonObject = Record<string, unknown>;

	let result = $state<JsonObject | null>(null);
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	const isRecord = (value: unknown): value is JsonObject => typeof value === 'object' && value !== null;
	const getArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
	const getString = (value: unknown): string | null => (typeof value === 'string' ? value : null);

	const getItems = (group: 'albums' | 'tracks'): JsonObject[] =>
		getArray(isRecord(result?.[group]) ? result?.[group].items : undefined).filter(isRecord);

	const getWrappedItem = (item: JsonObject, key: 'album' | 'track'): JsonObject | null => {
		const value = item[key];
		return isRecord(value) ? value : null;
	};

	const getArtists = (item: JsonObject | null): string =>
		getArray(item?.artists)
			.filter(isRecord)
			.map((artist) => getString(artist.name))
			.filter((name): name is string => name !== null)
			.join(', ');

	const getErrors = (): Array<{ key: string; message: string }> => {
		const errors = result?.errors;
		if (!isRecord(errors)) return [];
		return Object.entries(errors)
			.filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0)
			.map(([key, message]) => ({ key, message }));
	};

	async function fetchLibrary() {
		const accessToken = session.tokens?.accessToken;
		if (!accessToken) {
			error = 'No access token - log in on the home page first.';
			return;
		}

		isLoading = true;
		error = null;
		try {
			const response = await fetch('/api/library', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accessToken, limit: 8, offset: 0 })
			});
			const data: unknown = await response.json();
			if (!response.ok || !isRecord(data)) {
				throw new Error(JSON.stringify(data));
			}
			result = data;
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="stack" style="gap: 20px">
	<div class="section-header">library</div>
	<div class="card stack">
		<p style="color: var(--muted); font-size: 12px; line-height: 1.7">
			Loads saved albums and tracks from the new `spotify.library` API module.
		</p>
		<button onclick={fetchLibrary} disabled={isLoading || !session.tokens?.accessToken}>
			{isLoading ? 'loading...' : 'load saved items'}
		</button>
		{#if error}
			<div class="error-box">{error}</div>
		{/if}
	</div>

	{#if result}
		<div class="dual-grid">
			{#if getErrors().length > 0}
				<div class="card stack full-width">
					<h2>partial library errors</h2>
					{#each getErrors() as item (item.key)}
						<div class="error-box">{item.key}: {item.message}</div>
					{/each}
				</div>
			{/if}

			<div class="card stack">
				<h2>saved albums</h2>
				{#if getItems('albums').length === 0}
					<div style="font-size: 12px; color: var(--muted)">No saved albums returned.</div>
				{:else}
					{#each getItems('albums') as item, index (getString(getWrappedItem(item, 'album')?.id) ?? `${index}`)}
						{@const album = getWrappedItem(item, 'album')}
						<div class="list-row">
							<div>{getString(album?.name) ?? '-'}</div>
							<div style="font-size: 11px; color: var(--muted)">{getArtists(album) || '-'}</div>
						</div>
					{/each}
				{/if}
			</div>
			<div class="card stack">
				<h2>saved tracks</h2>
				{#if getItems('tracks').length === 0}
					<div style="font-size: 12px; color: var(--muted)">No saved tracks returned.</div>
				{:else}
					{#each getItems('tracks') as item, index (getString(getWrappedItem(item, 'track')?.id) ?? `${index}`)}
						{@const track = getWrappedItem(item, 'track')}
						<div class="list-row">
							<div>{getString(track?.name) ?? '-'}</div>
							<div style="font-size: 11px; color: var(--muted)">{getArtists(track) || '-'}</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.dual-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 20px;
	}

	.full-width {
		grid-column: 1 / -1;
	}

	.list-row {
		padding: 8px 0;
		border-top: 1px solid var(--border);
	}

	.list-row:first-of-type {
		border-top: none;
	}
</style>
