<script lang="ts">
	import { session } from '$lib/session.svelte';

	let { data } = $props();

	const DEFAULT_SCOPES = [
		'user-read-private',
		'user-read-email',
		'user-read-playback-state',
		'user-modify-playback-state',
		'user-read-currently-playing',
		'user-top-read',
		'user-read-recently-played',
		'user-follow-read',
		'user-follow-modify',
		'playlist-read-private',
		'playlist-read-collaborative',
		'playlist-modify-private',
		'playlist-modify-public',
		'user-library-read',
		'user-library-modify'
	].join(' ');

	let clientId = $state(session.clientId);
	let scopes = $state(DEFAULT_SCOPES);
	let isStartingLogin = $state(false);
	let loginError = $state<string | null>(null);

	$effect(() => {
		session.setClientId(clientId);
	});

	let hasHandledCallback = false;

	$effect(() => {
		if (hasHandledCallback || session.isLoggedIn) return;
		const code = data.code;
		const error = data.error;
		if (!code && !error) return;
		hasHandledCallback = true;

		if (error) {
			loginError = `Spotify returned an error: ${error}`;
			return;
		}

		(async () => {
			await session.exchangeCode(code!);
			if (session.error) {
				loginError = session.error;
			} else if (session.isLoggedIn) {
				await session.fetchProfile();
			}
		})();
	});

	async function startLogin() {
		loginError = null;
		if (!clientId.trim()) {
			loginError = 'Client ID is required.';
			return;
		}
		isStartingLogin = true;
		try {
			await session.startPkceLogin(scopes);
		} catch (err) {
			loginError = err instanceof Error ? err.message : String(err);
			isStartingLogin = false;
		}
	}

	function logout() {
		session.logout();
		clientId = session.clientId;
	}

	const formatDate = (ms: number) =>
		new Date(ms).toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});

	// Profile field display order
	const profileFields = [
		'display_name',
		'email',
		'country',
		'product',
		'id',
		'followers',
		'uri'
	] as const;

	const formatProfileValue = (key: string, value: unknown): string => {
		if (key === 'followers' && typeof value === 'object' && value !== null) {
			return String((value as Record<string, unknown>).total ?? '—');
		}
		return String(value ?? '—');
	};
</script>

<div class="stack" style="gap: 28px">
	{#if session.isExchanging}
		<!-- Exchanging PKCE code -->
		<div class="card stack" style="align-items: center; padding: 40px">
			<div class="spinner"></div>
			<span style="color: var(--muted)">exchanging authorization code…</span>
		</div>
	{:else if session.isLoggedIn}
		<!-- Logged in view -->
		<div>
			<div class="section-header">session</div>
			<div class="card stack">
				<div class="row" style="justify-content: space-between; flex-wrap: wrap; gap: 8px">
					<span class="badge green"><span class="dot green"></span>authenticated</span>
					<div class="row" style="gap: 8px">
						<button onclick={() => session.fetchProfile()} disabled={session.isFetchingProfile} class="ghost">
							{#if session.isFetchingProfile}
								<span class="spinner" style="display: inline-block"></span>
							{:else}
								↻ refresh profile
							{/if}
						</button>
						<button onclick={logout} class="danger">logout</button>
					</div>
				</div>

				<div class="kv-table" style="font-size: 12px">
					<span class="kv-key">access_token</span>
					<span class="kv-value" style="color: var(--muted)">
						{session.tokens?.accessToken.slice(0, 20)}…
					</span>

					<span class="kv-key">refresh_token</span>
					<span class="kv-value" style="color: var(--muted)">
						{session.tokens?.refreshToken ? 'present' : 'absent'}
					</span>

					<span class="kv-key">expires</span>
					<span class="kv-value">
						{session.tokenExpiresLabel}
						{#if session.tokens}
							<span style="color: var(--muted)">
								({formatDate(session.tokens.accessTokenExpiresAt)})
							</span>
						{/if}
					</span>
				</div>

				{#if session.error}
					<div class="error-box">{session.error}</div>
				{/if}
			</div>
		</div>

		{#if session.profile}
			<div>
				<div class="section-header">profile</div>
				<div class="card stack">
					<div class="kv-table">
						{#each profileFields as key (key)}
							{#if session.profile[key] !== undefined}
								<span class="kv-key">{key}</span>
								<span class="kv-value">{formatProfileValue(key, session.profile[key])}</span>
							{/if}
						{/each}
					</div>

					{#if session.profile.images && Array.isArray(session.profile.images) && session.profile.images.length > 0}
						<div>
							<img
								src={(session.profile.images[0] as Record<string, unknown>).url as string}
								alt="profile"
								style="width: 64px; height: 64px; border-radius: 50%; border: 1px solid var(--border)"
							/>
						</div>
					{/if}

					<details>
						<summary style="cursor: pointer; color: var(--muted); font-size: 11px; user-select: none">
							raw json
						</summary>
						<pre style="margin-top: 8px">{JSON.stringify(session.profile, null, 2)}</pre>
					</details>
				</div>
			</div>
		{:else}
			<div class="card" style="color: var(--muted); font-size: 12px; text-align: center; padding: 24px">
				click ↻ refresh profile to load user data
			</div>
		{/if}
	{:else}
		<!-- Login view -->
		<div>
			<div class="section-header">auth</div>
			<div class="card stack">
				<p style="color: var(--muted); font-size: 12px; line-height: 1.7">
					Enter your Spotify app client ID and click login. You'll be redirected to Spotify and back
					automatically. Add <code style="color: var(--text)">{typeof window !== 'undefined' ? window.location.origin + '/' : 'http://localhost:5174/'}</code>
					to your app's redirect URIs in the
					<a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">Spotify dashboard</a>.
				</p>

				<div style="color: var(--muted); font-size: 12px; line-height: 1.7">
					Default scopes include playlist and album library write access so playlist changes and
					album save or unsave work after login. If you already logged in before this change, log out
					and log back in to refresh the granted scopes.
				</div>

				<div class="field">
					<label class="field-label" for="client-id">client_id</label>
					<input
						id="client-id"
						type="text"
						bind:value={clientId}
						placeholder="your Spotify app client ID"
						onkeydown={(e) => e.key === 'Enter' && startLogin()}
					/>
				</div>

				<div class="field">
					<label class="field-label" for="scopes">scopes</label>
					<textarea id="scopes" bind:value={scopes} rows={3}></textarea>
				</div>

				<button onclick={startLogin} disabled={isStartingLogin || !clientId.trim()}>
					{#if isStartingLogin}
						<span class="spinner" style="display: inline-block"></span>
					{:else}
						▶ login with spotify
					{/if}
				</button>

				{#if loginError ?? session.error}
					<div class="error-box">{loginError ?? session.error}</div>
				{/if}
			</div>
		</div>

		<div>
			<div class="section-header">pkce flow</div>
			<div class="card">
				<ol style="color: var(--muted); font-size: 12px; line-height: 2; padding-left: 20px">
					<li>enter client ID → click login</li>
					<li>verifier + challenge generated locally in the browser</li>
					<li>redirect to Spotify auth</li>
					<li>Spotify redirects back with <code style="color: var(--text)">?code=…</code></li>
					<li>code exchanged server-side, tokens stored locally</li>
					<li>ready to make API calls</li>
				</ol>
			</div>
		</div>
	{/if}
</div>
