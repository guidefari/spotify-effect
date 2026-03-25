<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { session } from '$lib/session.svelte';

	let { children } = $props();

	const navGroups = [
		{
			label: 'Auth',
			links: [{ href: '/', label: 'home' }]
		},
		{
			label: 'Catalog',
			links: [
				{ href: '/album', label: 'album' },
				{ href: '/artist', label: 'artist' },
				{ href: '/track', label: 'track' },
				{ href: '/user', label: 'user' }
			]
		},
		{
			label: 'Search',
			links: [{ href: '/search', label: 'search' }]
		}
	];
</script>

<div class="app-shell">
	<nav>
		<span class="brand">spotify-effect</span>

		<div class="nav-groups">
			{#each navGroups as group}
				<div class="nav-group">
					<span class="nav-group-label">{group.label}</span>
					<div class="nav-group-links">
						{#each group.links as link}
							<a href={link.href} class:active={page.url.pathname === link.href}>{link.label}</a>
						{/each}
					</div>
				</div>
			{/each}
		</div>

		<div class="session-indicator">
			{#if session.isLoggedIn}
				<span class="dot green"></span>
				<span class="session-name">
					{session.profile?.display_name ?? 'authenticated'} · {session.tokenExpiresLabel}
				</span>
			{:else}
				<span class="dot muted"></span>
				<span class="session-name">not logged in</span>
			{/if}
		</div>
	</nav>

	<main>
		{@render children()}
	</main>
</div>

<style>
	.app-shell {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	nav {
		display: flex;
		align-items: center;
		gap: 20px;
		padding: 0 24px;
		height: 44px;
		background: var(--surface);
		border-bottom: 1px solid var(--border);
		position: sticky;
		top: 0;
		z-index: 100;
		flex-shrink: 0;
	}

	.brand {
		color: var(--accent);
		font-weight: 700;
		font-size: 13px;
		letter-spacing: -0.02em;
	}

	.nav-groups {
		display: flex;
		gap: 24px;
		flex: 1;
		align-items: center;
	}

	.nav-group {
		display: flex;
		align-items: center;
		gap: 8px;
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
		gap: 2px;
	}

	.nav-group-links a {
		color: var(--muted);
		text-decoration: none;
		font-size: 12px;
		padding: 4px 10px;
		border-radius: var(--radius);
		transition: color 0.1s, background 0.1s;
	}

	.nav-group-links a:hover {
		color: var(--text);
		background: var(--surface-2);
		text-decoration: none;
	}

	.nav-group-links a.active {
		color: var(--text);
		background: var(--surface-2);
	}

	.session-indicator {
		display: flex;
		align-items: center;
		gap: 7px;
		margin-left: auto;
	}

	.session-name {
		color: var(--muted);
		font-size: 11px;
	}

	main {
		flex: 1;
		padding: 32px 24px 64px;
		max-width: 860px;
		width: 100%;
		margin: 0 auto;
	}
</style>
