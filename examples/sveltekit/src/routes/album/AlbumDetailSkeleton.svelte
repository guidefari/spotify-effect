<div>
	<div class="skeleton-text" style="width: 60px; height: 14px; margin-bottom: 12px"></div>
	<div class="section-header"><div class="skeleton-text" style="width: 100px; height: 14px"></div></div>
	<div class="card stack">
		<div class="album-header">
			<div class="skeleton album-art"></div>
			<div class="album-meta">
				<div class="skeleton-text" style="width: 180px; height: 20px"></div>
				<div class="skeleton-text" style="width: 120px; height: 14px"></div>
				<div class="skeleton-text" style="width: 100px; height: 14px"></div>
			</div>
		</div>
		{#each { length: 6 } as _, i (i)}
			<div class="track-row">
				<div class="skeleton-text" style="width: 16px; height: 12px; margin: 0 auto"></div>
				<div class="skeleton-text" style="width: 70%; height: 13px"></div>
				<div class="skeleton-text" style="width: 32px; height: 12px; margin-left: auto"></div>
			</div>
		{/each}
	</div>
</div>

<style>
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

	.album-header {
		display: flex;
		gap: 16px;
		align-items: flex-start;
	}

	.album-art {
		width: 120px;
		height: 120px;
		border-radius: var(--radius);
		flex-shrink: 0;
		border: 1px solid var(--border);
	}

	.album-meta {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.track-row {
		display: grid;
		grid-template-columns: 32px 1fr 56px;
		gap: 8px;
		align-items: center;
		padding: 8px 4px;
		border-bottom: 1px solid var(--border);
	}

	.track-row:last-child {
		border-bottom: none;
	}
</style>
