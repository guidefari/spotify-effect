<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { session } from '$lib/session.svelte';

	let { children } = $props();

	const links = [
		{ href: '/', label: 'home' },
		{ href: '/track', label: 'track' },
		{ href: '/user', label: 'user' }
	];
</script>

<div class="app-shell">
	<nav>
		<span class="brand">spotify-effect</span>

		<div class="nav-links">
			{#each links as link}
				<a href={link.href} class:active={page.url.pathname === link.href}>{link.label}</a>
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

	.nav-links {
		display: flex;
		gap: 4px;
		flex: 1;
	}

	.nav-links a {
		color: var(--muted);
		text-decoration: none;
		font-size: 12px;
		padding: 4px 10px;
		border-radius: var(--radius);
		transition: color 0.1s, background 0.1s;
	}

	.nav-links a:hover {
		color: var(--text);
		background: var(--surface-2);
		text-decoration: none;
	}

	.nav-links a.active {
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
