<svelte:head>
	<title>opensound — open source music library tooling</title>
	<meta
		name="description"
		content="Open source tooling for managing your music library. spotify-effect is the first library in the opensound ecosystem."
	/>
</svelte:head>

<script lang="ts">
	const links = {
		github: 'https://github.com/guidefari/spotify-effect',
		product: 'https://spotify-effect.opensound.dev'
	};

</script>

<div class="flex min-h-screen items-center justify-center bg-obsidian px-4 py-10 font-mono text-sand [font-synthesis:none] [-webkit-font-smoothing:antialiased] sm:px-6">
	<section class="flex w-full max-w-3xl flex-col items-center gap-5 ">
		<div class="text-sky text-xs uppercase tracking-terminal self-start">opensound.dev</div>
		<h1 class="text-balance text-4xl font-bold tracking-[-0.03em] sm:text-5xl md:text-6xl lg:text-7xl">
			Simple tools for managing your <span class="text-sky">music libraries</span>.<span aria-hidden="true" class="ml-2 inline-block w-[0.45em] translate-y-[-0.08em] animate-blink bg-sky align-middle" style="height:0.8em"></span>
		</h1>
		<p class="text-balance max-w-xl text-sm leading-6 text-sand sm:text-base sm:leading-7 md:text-lg">
			open source tooling around music library management, playback metadata, and personal music workflows.
		</p>
		<div class="mt-2 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
			<a
				class="border-sand bg-sand text-obsidian hover:shadow-sky-offset inline-block border-2 px-5 py-3 text-sm lowercase transition hover:-translate-x-0.5 hover:-translate-y-0.5"
				href={links.product}>open spotify-effect →</a
			>
			<span
				class="border-sky/40 text-sky/60 inline-block cursor-not-allowed border-2 border-dashed px-5 py-3 text-sm lowercase select-none"
				aria-disabled="true">tidal-effect — brewing</span
			>
		</div>
	</section>
</div>
