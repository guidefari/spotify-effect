<svelte:head>
	<title>opensound — open source music library tooling</title>
	<meta
		name="description"
		content="Open source tooling for managing your music library. spotify-effect is the first product in the opensound ecosystem."
	/>
</svelte:head>

<script lang="ts">
	const links = {
		github: 'https://github.com/guidefari/spotify-effect',
		product: 'https://spotify-effect.opensound.dev'
	};

	const products = [
		{
			name: 'spotify-effect',
			description:
				'Effect-native tooling for building against Spotify with typed APIs and production-ready flows.',
			status: 'live first product',
			href: links.product
		},
		{
			name: 'coming soon: tidal-effect',
			description: 'I want to give the same treatment to Tidal as I have given to Spotify.',
			status: 'roadmap',
			href: links.github
		}
	];

	const principles = [
		'typed APIs over glue code',
		'small tools that compose well',
		'clear docs, boring deployment',
		'build in public, keep it hackable'
	];
</script>

<div
	class="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#09101f_0%,#050816_45%,#04050d_100%)] font-mono text-[rgba(245,245,245,0.92)] [font-synthesis:none] [text-rendering:optimizeLegibility] [-moz-osx-font-smoothing:grayscale] [-webkit-font-smoothing:antialiased]"
>
	<div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(38,82,255,0.14),transparent_32%)]"></div>
	<div
		class="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(circle_at_center,black,transparent_85%)]"
	></div>

	<header
		class="relative z-10 mx-auto flex w-[min(1040px,calc(100%-2rem))] flex-col items-start justify-between gap-4 pt-5 text-sm text-white/70 sm:flex-row sm:items-center"
	>
		<div class="inline-flex items-center gap-1 lowercase">
			<span class="text-lime-500">~/</span>
			<span>opensound.dev</span>
		</div>
		<nav class="flex flex-wrap gap-4">
			<a class="transition-colors hover:text-white" href={links.github} target="_blank" rel="noreferrer"
				>github</a
			>
			<a class="transition-colors hover:text-white" href={links.product}>spotify-effect</a>
		</nav>
	</header>

	<main class="relative z-10 mx-auto grid w-[min(1040px,calc(100%-2rem))] gap-5 px-0 py-10 md:py-16">
		<section
			class="rounded-[28px] border border-white/10 bg-[rgba(8,12,24,0.72)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl md:p-12"
		>
			<div class="text-[0.78rem] uppercase tracking-[0.16em] text-slate-400">
				open source music tooling
			</div>
			<h1 class="mt-3 max-w-[12ch] text-5xl leading-none font-medium tracking-[-0.04em] md:text-7xl lg:text-[6.4rem]">
				Simple tools for managing your music libraries.
			</h1>
			<p class="mt-5 max-w-3xl text-base leading-7 text-slate-200/80 md:text-[1.1rem]">
				opensound is the home for small, focused open source products around library management,
				playback metadata, and personal music workflows.
			</p>

			<div class="mt-7 flex flex-wrap gap-3.5">
				<a
					class="inline-flex items-center justify-center rounded-full bg-zinc-100 px-4 py-3 text-sm text-slate-950 shadow-[0_10px_30px_rgba(255,255,255,0.14)] transition duration-150 hover:-translate-y-px"
					href={links.product}>open spotify-effect</a
				>
				<a
					class="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.03] px-4 py-3 text-sm text-white/90 transition duration-150 hover:-translate-y-px hover:border-white/30"
					href={links.github}
					target="_blank"
					rel="noreferrer">view source</a
				>
			</div>
		</section>

		<section class="grid gap-5 md:grid-cols-2">
			<div
				class="rounded-3xl border border-white/10 bg-[rgba(8,12,24,0.72)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl"
			>
				<div class="mb-4 flex gap-2">
					<span class="h-3 w-3 rounded-full bg-slate-400/35"></span>
					<span class="h-3 w-3 rounded-full bg-slate-400/35"></span>
					<span class="h-3 w-3 rounded-full bg-slate-400/35"></span>
				</div>
				<div class="space-y-3 text-slate-200/80">
					<p><span class="text-lime-500">$</span> whoami</p>
					<p>opensound // open source tooling for music library management</p>
					<p><span class="text-lime-500">$</span> ls products</p>
					<p>spotify-effect</p>
					<p><span class="text-lime-500">$</span> cat principles.txt</p>
					<ul class="list-disc space-y-1 pl-5 text-slate-200/80">
						{#each principles as principle (principle)}
							<li>{principle}</li>
						{/each}
					</ul>
				</div>
			</div>

			<div
				class="grid gap-5 rounded-3xl border border-white/10 bg-[rgba(8,12,24,0.72)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl"
			>
				<div>
					<div class="text-[0.78rem] uppercase tracking-[0.16em] text-slate-400">products</div>
				</div>

				<div class="grid gap-3.5">
					{#each products as product (product.name)}
						<a
							class="grid gap-2 rounded-[18px] border border-white/10 bg-white/[0.03] p-4 transition duration-150 hover:-translate-y-px hover:border-white/30"
							href={product.href}
						>
							<div class="flex items-center justify-between gap-4 text-sm lowercase">
								<strong>{product.name}</strong>
								<span class="text-slate-400">{product.status}</span>
							</div>
							<p class="m-0 text-[0.95rem] leading-7 text-slate-200/80">{product.description}</p>
						</a>
					{/each}
				</div>
			</div>
		</section>
	</main>
</div>
