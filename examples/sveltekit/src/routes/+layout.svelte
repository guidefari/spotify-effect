<script lang="ts">
	import '../app.css';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { session } from '$lib/session.svelte';
	import { startAutoRefresh, stopAutoRefresh } from '$lib/token-refresh';

	let { children } = $props();
	let mobileNavOpen = $state(false);

	type NavHref =
		| '/'
		| '/album'
		| '/artist'
		| '/markets'
		| '/playlist'
		| '/track'
		| '/user'
		| '/library'
		| '/follow'
		| '/pagination'
		| '/stream-pagination'
		| '/top'
		| '/search'
		| '/player'
		| '/playlists';

	type NavGroup = {
		label: string;
		links: Array<{
			href: NavHref;
			label: string;
			hint: string;
		}>;
	};

	const navGroups: NavGroup[] = [
		{
			label: 'Start Here',
			links: [{ href: '/', label: 'auth + session', hint: 'login, PKCE, profile' }]
		},
		{
			label: 'Catalog Lookups',
			links: [
				{ href: '/album', label: 'album', hint: 'album metadata' },
				{ href: '/artist', label: 'artist', hint: 'artist metadata' },
				{ href: '/playlist', label: 'playlist', hint: 'single playlist' },
				{ href: '/track', label: 'track', hint: 'track + audio' },
				{ href: '/user', label: 'user', hint: 'public user profile' },
				{ href: '/markets', label: 'markets', hint: 'available regions' }
			]
		},
		{
			label: 'Personal Data',
			links: [
				{ href: '/library', label: 'library', hint: 'saved albums + tracks' },
				{ href: '/follow', label: 'follow', hint: 'artists, users, playlists' },
				{ href: '/top', label: 'top items', hint: 'personalization APIs' }
			]
		},
		{
			label: 'Explore + Paging',
			links: [
				{ href: '/search', label: 'search', hint: 'multi-type queries' },
				{ href: '/pagination', label: 'pagination', hint: 'offset + cursor helpers' },
				{ href: '/stream-pagination', label: 'stream pagination', hint: 'lazy streams + fold' }
			]
		},
		{
			label: 'Playback',
			links: [{ href: '/player', label: 'player', hint: 'devices, queue, state' }]
		},
		{
			label: 'Playlist Workflows',
			links: [{ href: '/playlists', label: 'my playlists', hint: 'create + manage lists' }]
		}
	];

	$effect(() => {
		if (session.isLoggedIn) {
			startAutoRefresh(session);
		} else {
			stopAutoRefresh();
		}
		return () => stopAutoRefresh();
	});

	const currentPath = $derived(page.url.pathname);
	const currentLabel = $derived(
		navGroups.flatMap((group) => group.links).find((link) => link.href === currentPath)?.label ?? 'overview'
	);
</script>

<div class="app-shell">
	<header class="mobile-topbar">
		<div>
			<div class="brand">spotify-effect</div>
			<div class="mobile-current">{currentLabel}</div>
		</div>
		<button class="ghost mobile-nav-toggle" onclick={() => (mobileNavOpen = !mobileNavOpen)}>
			{mobileNavOpen ? 'close' : 'menu'}
		</button>
	</header>

	<div class="shell-body">
		<aside class:mobile-open={mobileNavOpen}>
			<div class="sidebar-head">
				<div>
					<div class="brand">spotify-effect</div>
					<div class="sidebar-kicker">sveltekit example app</div>
				</div>
				<div class="session-indicator card-shell">
					{#if session.isLoggedIn}
						<span class="dot green"></span>
						<div class="session-copy">
							<span class="session-name">{session.profile?.display_name ?? 'authenticated'}</span>
							<span class="session-subtle">{session.tokenExpiresLabel}</span>
						</div>
					{:else}
						<span class="dot muted"></span>
						<div class="session-copy">
							<span class="session-name">not logged in</span>
							<span class="session-subtle">authenticate from the home screen</span>
						</div>
					{/if}
				</div>
			</div>

			<div class="sidebar-groups">
				{#each navGroups as group (group.label)}
					<section class="sidebar-group">
						<div class="nav-group-label">{group.label}</div>
						<div class="nav-group-links">
							{#each group.links as link (link.href)}
								<a
									href={resolve(link.href)}
									class:active={currentPath === link.href}
									onclick={() => (mobileNavOpen = false)}
								>
									<span class="nav-link-label">{link.label}</span>
									<span class="nav-link-hint">{link.hint}</span>
								</a>
							{/each}
						</div>
					</section>
				{/each}
			</div>
		</aside>

		<main>
			{@render children()}
		</main>
	</div>
</div>

<style>
	.app-shell {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background:
			radial-gradient(circle at top left, rgba(29, 185, 84, 0.08), transparent 28%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.01), transparent 20%);
	}

	.mobile-topbar {
		display: none;
		align-items: center;
		justify-content: space-between;
		padding: 16px 16px 8px;
		gap: 16px;
		background: var(--bg);
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
	}

	.mobile-current {
		font-size: 11px;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.mobile-nav-toggle {
		min-width: 72px;
	}

	.shell-body {
		display: flex;
		flex: 1;
		min-height: 100vh;
	}

	aside {
		width: 288px;
		padding: 28px 18px 24px 24px;
		border-right: 1px solid rgba(255, 255, 255, 0.05);
		background: linear-gradient(180deg, rgba(19, 22, 30, 0.98), rgba(13, 15, 20, 0.92));
		position: sticky;
		top: 0;
		height: 100vh;
		overflow-y: auto;
		flex-shrink: 0;
	}

	.sidebar-head {
		display: flex;
		flex-direction: column;
		gap: 18px;
		margin-bottom: 22px;
	}

	.brand {
		color: var(--accent);
		font-weight: 800;
		font-size: 15px;
		letter-spacing: -0.03em;
	}

	.sidebar-kicker {
		margin-top: 3px;
		font-size: 11px;
		color: var(--muted);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.card-shell {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 12px 12px 10px;
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: rgba(255, 255, 255, 0.02);
	}

	.session-copy {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.session-name {
		color: var(--text);
		font-size: 12px;
	}

	.session-subtle {
		color: var(--muted);
		font-size: 11px;
	}

	.sidebar-groups {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.sidebar-group {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.nav-group-label {
		color: var(--muted);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		opacity: 0.7;
	}

	.nav-group-links {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.nav-group-links a {
		display: flex;
		flex-direction: column;
		gap: 2px;
		color: var(--text);
		text-decoration: none;
		font-size: 12px;
		padding: 10px 12px;
		border-radius: var(--radius-lg);
		border: 1px solid transparent;
		background: transparent;
		transition: color 0.1s, background 0.1s, border-color 0.1s;
	}

	.nav-link-label {
		font-weight: 700;
	}

	.nav-link-hint {
		font-size: 11px;
		color: var(--muted);
	}

	.nav-group-links a:hover {
		color: var(--text);
		background: rgba(255, 255, 255, 0.03);
		border-color: rgba(255, 255, 255, 0.06);
		text-decoration: none;
	}

	.nav-group-links a.active {
		color: var(--text);
		background: linear-gradient(180deg, rgba(29, 185, 84, 0.13), rgba(29, 185, 84, 0.05));
		border-color: var(--accent-border);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
	}

	.nav-group-links a.active .nav-link-hint {
		color: rgba(226, 232, 240, 0.74);
	}

	main {
		flex: 1;
		padding: 36px 32px 72px;
		max-width: 1120px;
		width: 100%;
		margin: 0 auto;
	}

	@media (max-width: 1420px) {
		aside {
			width: 248px;
			padding: 22px 14px 20px 18px;
		}

		.nav-group-links a {
			padding: 9px 10px;
		}

		main {
			padding: 28px 24px 56px;
		}
	}

	@media (max-width: 1180px) {
		.mobile-topbar {
			display: flex;
		}

		.shell-body {
			min-height: unset;
		}

		aside {
			position: fixed;
			top: 65px;
			left: 16px;
			bottom: 16px;
			width: min(320px, calc(100vw - 32px));
			height: auto;
			padding: 18px 16px 16px;
			border: 1px solid var(--border);
			border-radius: 16px;
			box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
			transform: translateX(-110%);
			opacity: 0;
			pointer-events: none;
			transition: transform 0.18s ease, opacity 0.18s ease;
			z-index: 20;
		}

		aside.mobile-open {
			transform: translateX(0);
			opacity: 1;
			pointer-events: auto;
		}

		main {
			padding: 20px 16px 56px;
			max-width: 100%;
		}
	}

	@media (min-width: 981px) {
		.mobile-nav-toggle {
			display: none;
		}
	}
</style>
