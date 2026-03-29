<script lang="ts">
	import { session } from '$lib/session.svelte';

	type JsonObject = Record<string, unknown>;

	let result = $state<JsonObject | null>(null);
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	const isRecord = (value: unknown): value is JsonObject => typeof value === 'object' && value !== null;
	const getArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
	const getString = (value: unknown): string | null => (typeof value === 'string' ? value : null);
	const getNumber = (value: unknown): number | null => (typeof value === 'number' ? value : null);

	const getDevices = (): JsonObject[] => getArray(result?.devices).filter(isRecord);
	const getRecentItems = (): JsonObject[] =>
		getArray(isRecord(result?.recent) ? result?.recent.items : undefined).filter(isRecord);
	const getQueueItems = (): JsonObject[] =>
		getArray(isRecord(result?.queue) ? result?.queue.queue : undefined).filter(isRecord);
	const getTrackName = (item: JsonObject | null): string => (item ? getString(item.name) ?? '-' : '-');
	const getErrors = (): Array<{ key: string; message: string }> => {
		const errors = result?.errors;
		if (!isRecord(errors)) return [];
		return Object.entries(errors)
			.filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0)
			.map(([key, message]) => ({ key, message }));
	};

	async function fetchPlayer() {
		const accessToken = session.tokens?.accessToken;
		if (!accessToken) {
			error = 'No access token - log in on the home page first.';
			return;
		}

		isLoading = true;
		error = null;
		try {
			const response = await fetch('/api/player', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accessToken })
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
	<div class="section-header">player</div>
	<div class="card stack">
		<p style="color: var(--muted); font-size: 12px; line-height: 1.7">
			Loads playback state, devices, queue, and recently played items from the new `spotify.player` API.
		</p>
		<button onclick={fetchPlayer} disabled={isLoading || !session.tokens?.accessToken}>
			{isLoading ? 'loading...' : 'load player state'}
		</button>
		{#if error}
			<div class="error-box">{error}</div>
		{/if}
	</div>

	{#if result}
		<div class="dual-grid">
			{#if getErrors().length > 0}
				<div class="card stack full-width">
					<h2>partial player errors</h2>
					{#each getErrors() as item (item.key)}
						<div class="error-box">{item.key}: {item.message}</div>
					{/each}
				</div>
			{/if}

			<div class="card stack">
				<h2>playback</h2>
				<div class="kv-table">
					<span class="kv-key">is_playing</span>
					<span class="kv-value">{String(isRecord(result.playback) ? result.playback.is_playing : '-')}</span>
					<span class="kv-key">progress_ms</span>
					<span class="kv-value">{getNumber(isRecord(result.playback) ? result.playback.progress_ms : null) ?? '-'}</span>
					<span class="kv-key">current item</span>
					<span class="kv-value">{getTrackName(isRecord(result.playback) && isRecord(result.playback.item) ? result.playback.item : null)}</span>
				</div>
			</div>
			<div class="card stack">
				<h2>devices</h2>
				{#if getDevices().length === 0}
					<div style="font-size: 12px; color: var(--muted)">No devices returned.</div>
				{:else}
					{#each getDevices() as device, index (getString(device.id) ?? `${index}`)}
						<div class="list-row">
							<div>{getString(device.name) ?? '-'}</div>
							<div style="font-size: 11px; color: var(--muted)">{getString(device.type) ?? '-'} · volume {getNumber(device.volume_percent) ?? 0}%</div>
						</div>
					{/each}
				{/if}
			</div>
			<div class="card stack">
				<h2>queue</h2>
				{#if getQueueItems().length === 0}
					<div style="font-size: 12px; color: var(--muted)">No queue items returned.</div>
				{:else}
					{#each getQueueItems().slice(0, 5) as item, index (`${getTrackName(item)}-${index}`)}
						<div class="list-row">{getTrackName(item)}</div>
					{/each}
				{/if}
			</div>
			<div class="card stack">
				<h2>recently played</h2>
				{#if getRecentItems().length === 0}
					<div style="font-size: 12px; color: var(--muted)">No recently played items returned.</div>
				{:else}
					{#each getRecentItems() as item, index (`${getTrackName(isRecord(item.track) ? item.track : null)}-${index}`)}
						<div class="list-row">{getTrackName(isRecord(item.track) ? item.track : null)}</div>
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
