<script lang="ts">
	let result = $state<Record<string, unknown> | null>(null);
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	const getMarkets = (): string[] => {
		const markets = result?.markets;
		return Array.isArray(markets) ? markets.filter((value): value is string => typeof value === 'string') : [];
	};

	async function fetchMarkets() {
		isLoading = true;
		error = null;
		try {
			const response = await fetch('/api/markets', { method: 'POST' });
			const data: unknown = await response.json();
			if (!response.ok || typeof data !== 'object' || data === null) {
				throw new Error(JSON.stringify(data));
			}
			result = data as Record<string, unknown>;
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="stack" style="gap: 20px">
	<div class="section-header">markets</div>
	<div class="card stack">
		<p style="color: var(--muted); font-size: 12px; line-height: 1.7">
			Loads the available Spotify markets from the new `spotify.markets.getMarkets()` API.
		</p>
		<button onclick={fetchMarkets} disabled={isLoading}>
			{isLoading ? 'loading...' : 'load markets'}
		</button>
		{#if error}
			<div class="error-box">{error}</div>
		{/if}
	</div>

	{#if result}
		<div class="card stack">
			<div class="row" style="justify-content: space-between">
				<h2>available markets</h2>
				<span style="color: var(--muted); font-size: 12px">{getMarkets().length} country codes</span>
			</div>
			<div class="market-grid">
				{#each getMarkets() as market (market)}
					<span class="market-pill">{market}</span>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.market-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.market-pill {
		padding: 4px 8px;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: var(--bg);
		font-size: 12px;
	}
</style>
