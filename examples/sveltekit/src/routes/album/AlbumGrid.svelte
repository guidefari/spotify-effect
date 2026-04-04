<script lang="ts">
	import type { JsonObject } from './album-helpers';
	import AlbumCard from './AlbumCard.svelte';

	type Props = {
		albums: JsonObject[];
		savedMap: Record<string, boolean>;
		addedAtMap: Record<string, string>;
		loading: boolean;
		skeletonCount: number;
	};

	let { albums, savedMap, addedAtMap, loading, skeletonCount }: Props = $props();
</script>

{#if loading}
	<div class="album-grid">
		{#each { length: skeletonCount } as _, i (i)}
			<div class="album-card skeleton-card">
				<div class="skeleton album-card-placeholder"></div>
				<div class="skeleton-text" style="width: 80%; height: 12px"></div>
				<div class="skeleton-text" style="width: 55%; height: 11px"></div>
			</div>
		{/each}
	</div>
{:else if albums.length > 0}
	<div class="album-grid">
		{#each albums as album, i (album.id ?? i)}
			<AlbumCard
				{album}
				isSaved={savedMap[album.id as string] ?? false}
				addedAt={addedAtMap[album.id as string]}
			/>
		{/each}
	</div>
{/if}

<style>
	.album-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 16px;
	}

	.album-card {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		cursor: default;
		pointer-events: none;
	}

	.album-card-placeholder {
		width: 100%;
		aspect-ratio: 1;
		border-radius: var(--radius);
	}

	@keyframes shimmer {
		0% { background-position: -200% 0; }
		100% { background-position: 200% 0; }
	}

	.skeleton {
		background: linear-gradient(90deg, var(--surface-2) 25%, var(--border) 50%, var(--surface-2) 75%);
		background-size: 200% 100%;
		animation: shimmer 1.5s ease-in-out infinite;
	}

	.skeleton-text {
		background: linear-gradient(90deg, var(--surface-2) 25%, var(--border) 50%, var(--surface-2) 75%);
		background-size: 200% 100%;
		animation: shimmer 1.5s ease-in-out infinite;
		border-radius: 4px;
	}

	.skeleton-card {
		cursor: default;
		pointer-events: none;
	}
</style>
