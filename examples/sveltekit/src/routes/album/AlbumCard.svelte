<script lang="ts">
	import type { JsonObject } from './album-helpers';
	import { getImage, getArtists, formatRelativeDate } from './album-helpers';

	type Props = {
		album: JsonObject;
		isSaved: boolean;
		addedAt: string | undefined;
	};

	let { album, isSaved, addedAt }: Props = $props();

	const albumId = $derived(album.id as string);
</script>

<a class="album-card" href="/album/{albumId}">
	<div class="album-card-img-wrap">
		{#if getImage(album)}
			<img src={getImage(album)!} alt="" />
		{:else}
			<div class="album-card-placeholder"></div>
		{/if}
		{#if isSaved}
			<span class="saved-indicator">♥</span>
		{/if}
	</div>
	<div class="album-card-name">{album.name ?? '—'}</div>
	<div class="album-card-artist">{getArtists(album) || '—'}</div>
	{#if addedAt}
		<div class="album-card-added">saved {formatRelativeDate(addedAt)}</div>
	{/if}
</a>

<style>
	.album-card {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		cursor: pointer;
		text-align: left;
		color: var(--text);
		font-family: var(--font);
		text-decoration: none;
		transition: background 0.15s, border-color 0.15s;
	}

	.album-card:hover {
		background: var(--surface-2);
		border-color: var(--accent-border);
	}

	.album-card-img-wrap {
		position: relative;
		width: 100%;
	}

	.album-card-img-wrap img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: var(--radius);
	}

	.album-card-placeholder {
		width: 100%;
		aspect-ratio: 1;
		background: var(--surface-2);
		border-radius: var(--radius);
	}

	.saved-indicator {
		position: absolute;
		top: 6px;
		right: 6px;
		font-size: 14px;
		color: #e74c6f;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
		line-height: 1;
	}

	.album-card-name {
		font-size: 12px;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.album-card-artist {
		font-size: 11px;
		color: var(--muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.album-card-added {
		font-size: 10px;
		color: var(--muted);
		opacity: 0.6;
	}
</style>
