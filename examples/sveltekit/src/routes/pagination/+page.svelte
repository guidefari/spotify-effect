<script lang="ts">
	import { session } from '$lib/session.svelte';

	type JsonObject = Record<string, unknown>;

	let result = $state<JsonObject | null>(null);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let showRaw = $state(false);

	const isRecord = (value: unknown): value is JsonObject => typeof value === 'object' && value !== null;
	const getArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
	const getString = (value: unknown): string | null => (typeof value === 'string' ? value : null);
	const getNumber = (value: unknown): number | null => (typeof value === 'number' ? value : null);

	const getPlaylists = (): JsonObject[] => getArray(result?.playlists).filter(isRecord);
	const getFollowedArtists = (): JsonObject[] => getArray(result?.followedArtists).filter(isRecord);
	const playlistExample = 'spotify.playlists.getMyPlaylists({ offset, limit })';
	const followExample = 'spotify.follow.getFollowedArtists({ after, limit })';
	const getErrors = (): Array<{ key: string; message: string }> => {
		const errors = result?.errors;
		if (!isRecord(errors)) return [];
		return Object.entries(errors)
			.filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0)
			.map(([key, message]) => ({ key, message }));
	};
	const getErrorFor = (key: 'playlists' | 'followedArtists'): string | null =>
		getErrors().find((entry) => entry.key === key)?.message ?? null;

	async function fetchPaginationDemo() {
		const accessToken = session.tokens?.accessToken;
		if (!accessToken) {
			error = 'No access token - log in on the home page first.';
			return;
		}

		isLoading = true;
		error = null;
		showRaw = false;

		try {
			const response = await fetch('/api/pagination', {
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
	<div class="section-header">pagination helpers</div>
	<div class="card stack">
		<p style="color: var(--muted); font-size: 12px; line-height: 1.7">
			Demonstrates `paginateAll()` with saved playlist pages and `cursorPaginateAll()` with followed artists.
		</p>
		<button onclick={fetchPaginationDemo} disabled={isLoading || !session.tokens?.accessToken}>
			{isLoading ? 'loading all pages...' : 'run pagination demo'}
		</button>
		{#if error}
			<div class="error-box">{error}</div>
		{/if}
	</div>

	{#if result}
		<div class="dual-grid">
			<div class="card stack">
				<div class="row" style="justify-content: space-between">
					<h2>paginateAll</h2>
					<span style="font-size: 12px; color: var(--muted)">{getNumber(result.playlistCount) ?? 0} playlists</span>
				</div>
				<p style="font-size: 12px; color: var(--muted)">
					Collects every page from <code style="color: var(--text)">{playlistExample}</code>.
				</p>
				{#if getErrorFor('playlists')}
					<details class="inline-error-details">
						<summary>raw error</summary>
						<pre>{getErrorFor('playlists')}</pre>
					</details>
				{/if}
				{#if getPlaylists().length === 0}
					<div style="font-size: 12px; color: var(--muted)">No playlists collected.</div>
				{:else}
					{#each getPlaylists().slice(0, 8) as playlist, index (getString(playlist.id) ?? `${index}`)}
						<div class="list-row">
							<div>{getString(playlist.name) ?? '-'}</div>
							<div style="font-size: 11px; color: var(--muted)">{getString(isRecord(playlist.owner) ? playlist.owner.id : null) ?? '-'}</div>
						</div>
					{/each}
				{/if}
			</div>

			<div class="card stack">
				<div class="row" style="justify-content: space-between">
					<h2>cursorPaginateAll</h2>
					<span style="font-size: 12px; color: var(--muted)">{getNumber(result.followedArtistCount) ?? 0} artists</span>
				</div>
				<p style="font-size: 12px; color: var(--muted)">
					Collects every cursor page from <code style="color: var(--text)">{followExample}</code>.
				</p>
				{#if getErrorFor('followedArtists')}
					<details class="inline-error-details">
						<summary>raw error</summary>
						<pre>{getErrorFor('followedArtists')}</pre>
					</details>
				{/if}
				{#if getFollowedArtists().length === 0}
					<div style="font-size: 12px; color: var(--muted)">No followed artists collected.</div>
				{:else}
					{#each getFollowedArtists().slice(0, 8) as artist, index (getString(artist.id) ?? `${index}`)}
						<div class="list-row">
							<div>{getString(artist.name) ?? '-'}</div>
							<div style="font-size: 11px; color: var(--muted)">{getArray(artist.genres).slice(0, 2).join(', ') || '-'}</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>

		<details bind:open={showRaw} class="card">
			<summary style="cursor: pointer; color: var(--muted); font-size: 11px; user-select: none">
				{showRaw ? 'v' : '>'} raw json
			</summary>
			<pre style="margin-top: 8px">{JSON.stringify(result, null, 2)}</pre>
		</details>
	{/if}
</div>

<style>
	.dual-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 20px;
	}

	.list-row {
		padding: 8px 0;
		border-top: 1px solid var(--border);
	}

	.list-row:first-of-type {
		border-top: none;
	}

	.inline-error-details {
		font-size: 12px;
	}

	.inline-error-details summary {
		cursor: pointer;
		color: var(--warn);
		user-select: none;
	}

	.inline-error-details pre {
		margin-top: 8px;
		padding: 10px 12px;
		border-radius: var(--radius);
		background: rgba(120, 24, 36, 0.16);
		border: 1px solid rgba(239, 68, 68, 0.2);
		white-space: pre-wrap;
		word-break: break-word;
	}
</style>
