<script lang="ts">
	import { session } from '$lib/session.svelte';

	type JsonObject = Record<string, unknown>;
	type FollowTarget = 'artist' | 'user' | 'playlist';

	let isLoadingArtists = $state(false);
	let followedArtists = $state<JsonObject | null>(null);
	let error = $state<string | null>(null);
	let artistInput = $state('');
	let userInput = $state('');
	let playlistInput = $state('');
	let playlistPublic = $state(false);
	let actionMessage = $state<string | null>(null);
	let statusMessage = $state<string | null>(null);
	let isMutating = $state(false);
	let isChecking = $state(false);

	const isRecord = (value: unknown): value is JsonObject => typeof value === 'object' && value !== null;
	const getArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
	const getString = (value: unknown): string | null => (typeof value === 'string' ? value : null);

	const getFollowedArtists = (): JsonObject[] => getArray(followedArtists?.items).filter(isRecord);
	const getArtistCursor = (): string | undefined => getString(followedArtists?.cursors && isRecord(followedArtists.cursors) ? followedArtists.cursors.after : null) ?? undefined;

	const parseId = (value: string, type: FollowTarget): string | null => {
		const trimmed = value.trim();
		if (!trimmed) return null;
		if (type === 'artist') {
			const url = trimmed.match(/\/artist\/([A-Za-z0-9]+)/);
			const uri = trimmed.match(/spotify:artist:([A-Za-z0-9]+)/);
			return url?.[1] ?? uri?.[1] ?? trimmed;
		}
		if (type === 'user') {
			const url = trimmed.match(/\/user\/([^/?]+)/);
			const uri = trimmed.match(/spotify:user:([^:]+)/);
			return url?.[1] ?? uri?.[1] ?? trimmed;
		}
		const url = trimmed.match(/\/playlist\/([A-Za-z0-9]+)/);
		const uri = trimmed.match(/spotify:playlist:([A-Za-z0-9]+)/);
		return url?.[1] ?? uri?.[1] ?? trimmed;
	};

	const getInputValue = (type: FollowTarget): string =>
		type === 'artist' ? artistInput : type === 'user' ? userInput : playlistInput;

	async function postFollow(payload: JsonObject): Promise<JsonObject> {
		const accessToken = session.tokens?.accessToken;
		if (!accessToken) {
			throw new Error('No access token - log in on the home page first.');
		}

		const response = await fetch('/api/follow', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ accessToken, ...payload })
		});

		const data: unknown = await response.json();
		if (!response.ok || !isRecord(data)) {
			throw new Error(JSON.stringify(data));
		}

		return data;
	}

	async function fetchFollowedArtists(after?: string) {
		isLoadingArtists = true;
		error = null;
		try {
			followedArtists = await postFollow({ action: 'load_followed_artists', after });
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			isLoadingArtists = false;
		}
	}

	async function mutate(type: FollowTarget, mode: 'follow' | 'unfollow') {
		const id = parseId(getInputValue(type), type);
		if (!id) {
			actionMessage = `Enter a valid ${type} id, uri, or url.`;
			return;
		}

		isMutating = true;
		actionMessage = null;
		try {
			await postFollow({
				action: 'mutate',
				targetType: type,
				mode,
				ids: [id],
				public: type === 'playlist' ? playlistPublic : undefined
			});
			actionMessage = `${mode}ed ${type} successfully.`;
			if (type === 'artist') {
				await fetchFollowedArtists();
			}
		} catch (err) {
			actionMessage = err instanceof Error ? err.message : String(err);
		} finally {
			isMutating = false;
		}
	}

	async function check(type: FollowTarget) {
		const id = parseId(getInputValue(type), type);
		if (!id) {
			statusMessage = `Enter a valid ${type} id, uri, or url.`;
			return;
		}

		isChecking = true;
		statusMessage = null;
		try {
			const result = await postFollow({ action: 'check', targetType: type, ids: [id] });
			const following = getArray(result.following)[0] === true;
			statusMessage = following ? `You are following this ${type}.` : `You are not following this ${type}.`;
		} catch (err) {
			statusMessage = err instanceof Error ? err.message : String(err);
		} finally {
			isChecking = false;
		}
	}
</script>

<div class="stack" style="gap: 20px">
	<div class="section-header">follow</div>
	<div class="card stack">
		<p style="color: var(--muted); font-size: 12px; line-height: 1.7">
			Covers the new `spotify.follow` API with followed artists, follow/unfollow mutations, and contains checks.
		</p>
		<div class="row" style="gap: 12px; flex-wrap: wrap">
			<button onclick={() => fetchFollowedArtists()} disabled={isLoadingArtists || !session.tokens?.accessToken}>
				{isLoadingArtists ? 'loading...' : 'load followed artists'}
			</button>
			{#if getArtistCursor()}
				<button class="ghost" onclick={() => fetchFollowedArtists(getArtistCursor())} disabled={isLoadingArtists}>
					next page
				</button>
			{/if}
		</div>
		{#if error}
			<div class="error-box">{error}</div>
		{/if}
	</div>

	<div class="follow-grid">
		<div class="card stack">
			<h2>artist</h2>
			<div class="field">
				<label class="field-label" for="artist-follow-input">artist id / uri / url</label>
				<input id="artist-follow-input" type="text" bind:value={artistInput} placeholder="spotify:artist:..." />
			</div>
			<div class="row" style="gap: 8px; flex-wrap: wrap">
				<button onclick={() => mutate('artist', 'follow')} disabled={isMutating || !artistInput.trim()}>follow</button>
				<button class="ghost" onclick={() => mutate('artist', 'unfollow')} disabled={isMutating || !artistInput.trim()}>unfollow</button>
				<button class="ghost" onclick={() => check('artist')} disabled={isChecking || !artistInput.trim()}>check</button>
			</div>
		</div>

		<div class="card stack">
			<h2>user</h2>
			<div class="field">
				<label class="field-label" for="user-follow-input">user id / uri / url</label>
				<input id="user-follow-input" type="text" bind:value={userInput} placeholder="spotify:user:..." />
			</div>
			<div class="row" style="gap: 8px; flex-wrap: wrap">
				<button onclick={() => mutate('user', 'follow')} disabled={isMutating || !userInput.trim()}>follow</button>
				<button class="ghost" onclick={() => mutate('user', 'unfollow')} disabled={isMutating || !userInput.trim()}>unfollow</button>
				<button class="ghost" onclick={() => check('user')} disabled={isChecking || !userInput.trim()}>check</button>
			</div>
		</div>

		<div class="card stack">
			<h2>playlist</h2>
			<div class="field">
				<label class="field-label" for="playlist-follow-input">playlist id / uri / url</label>
				<input id="playlist-follow-input" type="text" bind:value={playlistInput} placeholder="spotify:playlist:..." />
			</div>
			<label class="checkbox-row">
				<input type="checkbox" bind:checked={playlistPublic} />
				<span>follow publicly</span>
			</label>
			<div class="row" style="gap: 8px; flex-wrap: wrap">
				<button onclick={() => mutate('playlist', 'follow')} disabled={isMutating || !playlistInput.trim()}>follow</button>
				<button class="ghost" onclick={() => mutate('playlist', 'unfollow')} disabled={isMutating || !playlistInput.trim()}>unfollow</button>
				<button class="ghost" onclick={() => check('playlist')} disabled={isChecking || !playlistInput.trim()}>check</button>
			</div>
		</div>
	</div>

	{#if actionMessage}
		<div class="card" style="font-size: 12px; color: var(--muted)">{actionMessage}</div>
	{/if}

	{#if statusMessage}
		<div class="card" style="font-size: 12px; color: var(--muted)">{statusMessage}</div>
	{/if}

	{#if followedArtists}
		<div class="card stack">
			<h2>followed artists</h2>
			{#each getFollowedArtists() as artist, index (getString(artist.id) ?? `${index}`)}
				<div class="list-row">
					<div>{getString(artist.name) ?? '-'}</div>
					<div style="font-size: 11px; color: var(--muted)">{getArray(artist.genres).slice(0, 2).join(', ') || '-'}</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.follow-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 20px;
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

	.list-row {
		padding: 8px 0;
		border-top: 1px solid var(--border);
	}

	.list-row:first-of-type {
		border-top: none;
	}
</style>
