<script lang="ts">
	import { session } from '$lib/session.svelte';

	type JsonObject = Record<string, unknown>;

	let result = $state<JsonObject | null>(null);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let timeRange = $state<'short_term' | 'medium_term' | 'long_term'>('medium_term');

	const isRecord = (value: unknown): value is JsonObject => typeof value === 'object' && value !== null;
	const getArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
	const getString = (value: unknown): string | null => (typeof value === 'string' ? value : null);

	const getItems = (group: 'artists' | 'tracks'): JsonObject[] =>
		getArray(isRecord(result?.[group]) ? result?.[group].items : undefined).filter(isRecord);

	const getArtistNames = (track: JsonObject): string =>
		getArray(track.artists)
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

	async function fetchTop() {
		const accessToken = session.tokens?.accessToken;
		if (!accessToken) {
			error = 'No access token - log in on the home page first.';
			return;
		}

		isLoading = true;
		error = null;
		try {
			const response = await fetch('/api/top', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accessToken, timeRange, limit: 8 })
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
	<div class="section-header">top items</div>
	<div class="card stack">
		<div class="row" style="justify-content: space-between; flex-wrap: wrap; gap: 12px">
			<select bind:value={timeRange}>
				<option value="short_term">short term</option>
				<option value="medium_term">medium term</option>
				<option value="long_term">long term</option>
			</select>
			<button onclick={fetchTop} disabled={isLoading || !session.tokens?.accessToken}>
				{isLoading ? 'loading...' : 'load top artists + tracks'}
			</button>
		</div>
		{#if error}
			<div class="error-box">{error}</div>
		{/if}
	</div>

	{#if result}
		<div class="dual-grid">
			{#if getErrors().length > 0}
				<div class="card stack full-width">
					<h2>partial top-item errors</h2>
					{#each getErrors() as item (item.key)}
						<div class="error-box">{item.key}: {item.message}</div>
					{/each}
				</div>
			{/if}

			<div class="card stack">
				<h2>top artists</h2>
				{#if getItems('artists').length === 0}
					<div style="font-size: 12px; color: var(--muted)">No top artists returned.</div>
				{:else}
					{#each getItems('artists') as artist, index (getString(artist.id) ?? `${index}`)}
						<div class="list-row">
							<span style="color: var(--muted)">{index + 1}</span>
							<div>
								<div>{getString(artist.name) ?? '-'}</div>
								<div style="font-size: 11px; color: var(--muted)">{getArray(artist.genres).slice(0, 2).join(', ') || '-'}</div>
							</div>
						</div>
					{/each}
				{/if}
			</div>
			<div class="card stack">
				<h2>top tracks</h2>
				{#if getItems('tracks').length === 0}
					<div style="font-size: 12px; color: var(--muted)">No top tracks returned.</div>
				{:else}
					{#each getItems('tracks') as track, index (getString(track.id) ?? `${index}`)}
						<div class="list-row">
							<span style="color: var(--muted)">{index + 1}</span>
							<div>
								<div>{getString(track.name) ?? '-'}</div>
								<div style="font-size: 11px; color: var(--muted)">{getArtistNames(track) || '-'}</div>
							</div>
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
		display: grid;
		grid-template-columns: 24px minmax(0, 1fr);
		gap: 12px;
		align-items: start;
		padding: 8px 0;
		border-top: 1px solid var(--border);
	}

	.list-row:first-of-type {
		border-top: none;
	}
</style>
