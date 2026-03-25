<script lang="ts">
	import { session } from '$lib/session.svelte';

	let input = $state('');
	let isLoading = $state(false);
	let result = $state<Record<string, unknown> | null>(null);
	let error = $state<string | null>(null);
	let showRaw = $state(false);

	const parseUserId = (value: string): string => {
		const trimmed = value.trim();
		// Spotify URL: https://open.spotify.com/user/USER_ID
		const urlMatch = trimmed.match(/\/user\/([^/?]+)/);
		if (urlMatch) return urlMatch[1];
		// Spotify URI: spotify:user:USER_ID
		const uriMatch = trimmed.match(/spotify:user:([^:]+)/);
		if (uriMatch) return uriMatch[1];
		return trimmed;
	};

	async function fetchUser() {
		const userId = parseUserId(input);
		if (!userId) {
			error = 'Enter a user ID or Spotify profile URL.';
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
			const response = await fetch('/api/user', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accessToken, userId })
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

	const getFollowers = (user: Record<string, unknown>): string => {
		const f = user.followers as Record<string, unknown> | undefined;
		const total = f?.total;
		if (typeof total !== 'number') return '—';
		return total.toLocaleString();
	};

	const getImage = (user: Record<string, unknown>): string | null => {
		const images = user.images as Array<Record<string, unknown>> | undefined;
		return (images?.[0]?.url as string) ?? null;
	};

	const getSpotifyUrl = (user: Record<string, unknown>): string | null => {
		const ext = user.external_urls as Record<string, unknown> | undefined;
		return (ext?.spotify as string) ?? null;
	};
</script>

<div class="stack" style="gap: 20px">
	<div>
		<div class="section-header">user lookup</div>
		<div class="card stack">
			{#if !session.isLoggedIn}
				<div style="color: var(--warn); font-size: 12px">
					⚠ not logged in — log in on the home page first
				</div>
			{/if}

			<div class="field">
				<label class="field-label" for="user-input">user id / spotify profile url</label>
				<input
					id="user-input"
					type="text"
					bind:value={input}
					placeholder="https://open.spotify.com/user/… or spotify:user:… or user_id"
					onkeydown={(e) => e.key === 'Enter' && fetchUser()}
				/>
			</div>

			<button onclick={fetchUser} disabled={isLoading || !input.trim()}>
				{#if isLoading}
					<span class="row" style="justify-content: center; gap: 8px">
						<span class="spinner"></span>
						fetching…
					</span>
				{:else}
					fetch user
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
			<div class="card stack">
				<!-- User header -->
				<div class="user-header">
					{#if getImage(result)}
						<img src={getImage(result)!} alt="profile" class="user-avatar" />
					{:else}
						<div class="user-avatar-placeholder">
							{((result.display_name as string) ?? (result.id as string) ?? '?')[0].toUpperCase()}
						</div>
					{/if}
					<div class="user-meta">
						<div class="user-name">{result.display_name ?? result.id ?? '—'}</div>
						<div class="user-sub">{result.id ?? ''}</div>
					</div>
				</div>

				<!-- Key details -->
				<div class="kv-table" style="font-size: 12px">
					<span class="kv-key">followers</span>
					<span class="kv-value">{getFollowers(result)}</span>

					<span class="kv-key">type</span>
					<span class="kv-value" style="color: var(--muted)">{result.type ?? '—'}</span>

					<span class="kv-key">uri</span>
					<span class="kv-value" style="color: var(--muted)">{result.uri ?? '—'}</span>

					{#if getSpotifyUrl(result)}
						<span class="kv-key">open</span>
						<span class="kv-value">
							<a href={getSpotifyUrl(result)!} target="_blank" rel="noreferrer">↗ spotify</a>
						</span>
					{/if}
				</div>

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
	.user-header {
		display: flex;
		gap: 16px;
		align-items: center;
	}

	.user-avatar {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		flex-shrink: 0;
		border: 1px solid var(--border);
	}

	.user-avatar-placeholder {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		flex-shrink: 0;
		border: 1px solid var(--border);
		background: var(--surface-2);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 24px;
		font-weight: 700;
		color: var(--muted);
	}

	.user-meta {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.user-name {
		font-size: 18px;
		font-weight: 700;
		color: var(--text);
	}

	.user-sub {
		font-size: 12px;
		color: var(--muted);
	}
</style>
