<script lang="ts">
	import type { JsonObject } from './album-helpers';
	import {
		getImage, getArtists, getReleaseYear, getPopularity, getSpotifyUrl,
		getTotalTracks, getTracks, getGenres, getLabel, getCopyrights,
		getExternalIds, getAvailableMarkets, getTotalDurationMs, formatDuration,
		formatDate, formatRelativeDate,
	} from './album-helpers';

	type Props = {
		album: JsonObject;
		isSaved: boolean;
		isSaving: boolean;
		addedAt: string | undefined;
		ontoggleSave: (albumId: string) => void;
	};

	let { album, isSaved, isSaving, addedAt, ontoggleSave }: Props = $props();

	let showRaw = $state(false);
	let copiedField = $state<string | null>(null);

	const albumId = $derived(album.id as string);

	async function copyToClipboard(value: string, field: string) {
		await navigator.clipboard.writeText(value);
		copiedField = field;
		setTimeout(() => { if (copiedField === field) copiedField = null; }, 1500);
	}
</script>

<div>
	<a href="/album" class="ghost" style="margin-bottom: 12px; display: inline-block; text-decoration: none; color: inherit">← back</a>
	<div class="section-header">album detail</div>
	<div class="card stack">
		<div class="album-header">
			{#if getImage(album)}
				<img src={getImage(album)!} alt="album art" class="album-art" />
			{/if}
			<div class="album-meta">
				<div class="album-name">{album.name ?? '—'}</div>
				<div class="album-sub">{getArtists(album)}</div>
				<div class="album-sub" style="color: var(--muted)">
					{getReleaseYear(album)} · {getTotalTracks(album)} tracks · {formatDuration(getTotalDurationMs(album))}
				</div>
				<button
					class="save-btn"
					class:saved={isSaved}
					disabled={isSaving}
					onclick={() => ontoggleSave(albumId)}
				>
					{isSaved ? '♥ saved' : '♡ save'}
				</button>
			</div>
		</div>

		<div class="kv-table" style="font-size: 12px">
			<span class="kv-key">album_type</span>
			<span class="kv-value" style="color: var(--muted)">{album.album_type ?? '—'}</span>

			<span class="kv-key">release_date</span>
			<span class="kv-value" style="color: var(--muted)">
				{album.release_date ?? '—'}
				<span style="opacity: 0.5">({album.release_date_precision ?? '—'})</span>
			</span>

			{#if addedAt}
				<span class="kv-key">saved_at</span>
				<span class="kv-value" style="color: var(--muted)">
					{formatDate(addedAt)}
					<span style="opacity: 0.5">({formatRelativeDate(addedAt)})</span>
				</span>
			{/if}

			<span class="kv-key">popularity</span>
			<span class="kv-value">
				<span class="pop-bar">
					<span class="pop-bar-track">
						<span class="pop-bar-fill" style="width: {getPopularity(album)}%"></span>
					</span>
					<span style="color: var(--muted)">{getPopularity(album)}/100</span>
				</span>
			</span>

			{#if getLabel(album)}
				<span class="kv-key">label</span>
				<span class="kv-value" style="color: var(--muted)">{getLabel(album)}</span>
			{/if}

			{#if getGenres(album).length > 0}
				<span class="kv-key">genres</span>
				<span class="kv-value" style="color: var(--muted)">{getGenres(album).join(', ')}</span>
			{/if}

			{#each Object.entries(getExternalIds(album)) as [key, value] (key)}
				<span class="kv-key">{key}</span>
				<span class="kv-value">
					<button class="copy-btn" onclick={() => copyToClipboard(value, `ext-${key}`)}>
						{copiedField === `ext-${key}` ? '✓ copied' : value}
					</button>
				</span>
			{/each}

			<span class="kv-key">markets</span>
			<span class="kv-value" style="color: var(--muted)">{getAvailableMarkets(album).length} countries</span>

			<span class="kv-key">id</span>
			<span class="kv-value">
				<button class="copy-btn" onclick={() => copyToClipboard(String(album.id ?? ''), 'id')}>
					{copiedField === 'id' ? '✓ copied' : album.id ?? '—'}
				</button>
			</span>

			<span class="kv-key">uri</span>
			<span class="kv-value">
				<button class="copy-btn" onclick={() => copyToClipboard(String(album.uri ?? ''), 'uri')}>
					{copiedField === 'uri' ? '✓ copied' : album.uri ?? '—'}
				</button>
			</span>

			{#if getSpotifyUrl(album)}
				<span class="kv-key">link</span>
				<span class="kv-value row" style="gap: 8px">
					<a href={getSpotifyUrl(album)!} target="_blank" rel="noreferrer">↗ spotify</a>
					<button class="copy-btn" onclick={() => copyToClipboard(getSpotifyUrl(album)!, 'url')}>
						{copiedField === 'url' ? '✓ copied' : 'copy'}
					</button>
				</span>
			{/if}

			{#if getCopyrights(album).length > 0}
				<span class="kv-key">copyright</span>
				<span class="kv-value" style="color: var(--muted); font-size: 11px">
					{#each getCopyrights(album) as c, i (`${c.type}:${c.text}:${i}`)}
						<div>{c.type === 'P' ? '℗' : '©'} {c.text}</div>
					{/each}
				</span>
			{/if}
		</div>

		{#if getTracks(album).length > 0}
			<div class="tracklist">
				<div class="tracklist-header">
					<span class="track-num">#</span>
					<span class="track-title">title</span>
					<span class="track-duration">duration</span>
				</div>
				{#each getTracks(album) as track, i (track.id ?? i)}
					<div class="track-row">
						<span class="track-num">{(track.track_number as number) ?? i + 1}</span>
						<span class="track-info">
							<span class="track-name">
								{track.name ?? '—'}
								{#if track.explicit}<span class="explicit-badge">E</span>{/if}
							</span>
							{#if getArtists(track) && getArtists(track) !== getArtists(album)}
								<span class="track-artist">{getArtists(track)}</span>
							{/if}
						</span>
						<span class="track-duration">{formatDuration(track.duration_ms)}</span>
					</div>
				{/each}
			</div>
		{/if}

		<details bind:open={showRaw}>
			<summary style="cursor: pointer; color: var(--muted); font-size: 11px; user-select: none">
				{showRaw ? '▾' : '▸'} raw json
			</summary>
			<pre style="margin-top: 8px">{JSON.stringify(album, null, 2)}</pre>
		</details>
	</div>
</div>

<style>
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

	.album-name {
		font-size: 18px;
		font-weight: 700;
		color: var(--text);
		line-height: 1.3;
	}

	.album-sub {
		font-size: 13px;
		color: var(--text);
		opacity: 0.7;
	}

	.save-btn {
		margin-top: 4px;
		padding: 4px 12px;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--muted);
		font-family: var(--font);
		font-size: 12px;
		cursor: pointer;
		width: fit-content;
		transition: color 0.15s, border-color 0.15s, background 0.15s;
	}

	.save-btn:hover {
		border-color: var(--accent-border);
		color: var(--accent);
	}

	.save-btn.saved {
		color: #e74c6f;
		border-color: #e74c6f40;
	}

	.save-btn.saved:hover {
		background: #e74c6f10;
	}

	.save-btn:disabled {
		opacity: 0.5;
		cursor: wait;
	}

	.pop-bar {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.pop-bar-track {
		width: 100px;
		height: 4px;
		background: var(--surface-2);
		border-radius: 2px;
		overflow: hidden;
	}

	.pop-bar-fill {
		height: 100%;
		background: var(--accent);
		border-radius: 2px;
		transition: width 0.3s ease;
	}

	.explicit-badge {
		display: inline-block;
		font-size: 9px;
		font-weight: 700;
		background: var(--muted);
		color: var(--bg);
		border-radius: 2px;
		padding: 0 3px;
		margin-left: 4px;
		vertical-align: middle;
		line-height: 14px;
	}

	.tracklist {
		display: flex;
		flex-direction: column;
	}

	.tracklist-header {
		display: grid;
		grid-template-columns: 32px 1fr 56px;
		gap: 8px;
		padding: 8px 4px;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted);
		border-bottom: 1px solid var(--border);
	}

	.track-row {
		display: grid;
		grid-template-columns: 32px 1fr 56px;
		gap: 8px;
		align-items: center;
		padding: 8px 4px;
		border-bottom: 1px solid var(--border);
		transition: background 0.1s;
	}

	.track-row:last-child {
		border-bottom: none;
	}

	.track-row:hover {
		background: var(--surface-2);
		border-radius: var(--radius);
	}

	.track-num {
		font-size: 12px;
		color: var(--muted);
		text-align: center;
	}

	.track-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.track-name {
		font-size: 13px;
		color: var(--text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.track-artist {
		font-size: 11px;
		color: var(--muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.track-duration {
		font-size: 12px;
		color: var(--muted);
		text-align: right;
	}

	.copy-btn {
		background: none;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--muted);
		font-family: var(--font);
		font-size: 12px;
		padding: 2px 8px;
		cursor: pointer;
		transition: color 0.15s, border-color 0.15s;
	}

	.copy-btn:hover {
		color: var(--accent);
		border-color: var(--accent-border);
	}
</style>
