<script lang="ts">
	import { untrack } from 'svelte';
	import { session } from '$lib/session.svelte';
	import { page } from '$app/state';
	import type { JsonObject } from '../album-helpers';
	import AlbumDetail from '../AlbumDetail.svelte';
	import AlbumDetailSkeleton from '../AlbumDetailSkeleton.svelte';

	const albumId = $derived(page.params.id);

	let album = $state<JsonObject | null>(null);
	let savedMap = $state<Record<string, boolean>>({});
	let addedAt = $state<string | undefined>(undefined);
	let isLoading = $state(false);
	let isSaving = $state(false);
	let error = $state<string | null>(null);
	let fetchedId = $state<string | null>(null);

	const isSaved = $derived(albumId ? (savedMap[albumId] ?? false) : false);

	async function fetchAlbum(id: string) {
		const accessToken = session.tokens?.accessToken;
		if (!accessToken) return;

		fetchedId = id;
		isLoading = true;
		error = null;
		album = null;
		void checkSaved(id);
		try {
			const albumResponse = await fetch('/api/album', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accessToken, albumId: id })
			});
			const data = await albumResponse.json();
			if (!albumResponse.ok) throw new Error(data.message ?? JSON.stringify(data));
			album = data as JsonObject;
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			isLoading = false;
		}
	}

	async function checkSaved(id: string) {
		const accessToken = session.tokens?.accessToken;
		if (!accessToken) return;

		try {
			const response = await fetch('/api/album/check-saved', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accessToken, albumIds: [id] })
			});
			if (!response.ok) return;
			const data = await response.json();
			savedMap = { ...savedMap, ...(data as Record<string, boolean>) };
		} catch {
			// silent
		}
	}

	async function toggleSave(id: string) {
		const accessToken = session.tokens?.accessToken;
		if (!accessToken) return;

		const wasSaved = savedMap[id] ?? false;
		const endpoint = wasSaved ? '/api/album/unsave' : '/api/album/save';

		isSaving = true;
		try {
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accessToken, albumIds: [id] })
			});
			if (!response.ok) {
				const data = await response.json();
				throw new Error((data as JsonObject).message as string ?? JSON.stringify(data));
			}
			savedMap = { ...savedMap, [id]: !wasSaved };
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			isSaving = false;
		}
	}

	$effect(() => {
		const id = albumId;
		const loggedIn = session.isLoggedIn;
		untrack(() => {
			if (id && loggedIn && fetchedId !== id) {
				fetchAlbum(id);
			}
		});
	});
</script>

<div class="stack" style="gap: 20px">
	{#if error}
		<div class="error-box">{error}</div>
	{/if}

	{#if isLoading}
		<AlbumDetailSkeleton />
	{:else if album}
		<AlbumDetail
			{album}
			{isSaved}
			{isSaving}
			{addedAt}
			ontoggleSave={toggleSave}
		/>
	{:else if !session.isLoggedIn}
		<div class="card" style="text-align: center; padding: 40px; color: var(--muted); font-size: 13px">
			⚠ not logged in — log in on the home page first
		</div>
	{/if}
</div>
