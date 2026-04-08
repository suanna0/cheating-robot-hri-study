<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let adminConnected = $state(false);
	let userConnected = $state(false);
	let loading = $state(true);
	let resetting = $state(false);
	let theme = $state<'nico' | 'nica'>('nica');

	async function hardReset() {
		resetting = true;
		await fetch('/api/reset', { method: 'POST' });
		adminConnected = false;
		userConnected = false;
		resetting = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (loading) return;
		if (e.key === '1' && !userConnected) goto('/play');
		if (e.key === '2' && !adminConnected) goto('/admin');
		if (e.key === 'r' || e.key === 'R') hardReset();
	}

	// Cursor-following card
	let cardX = $state(0);
	let cardY = $state(0);
	let targetX = 0;
	let targetY = 0;
	let rafId: number;

	function onMouseMove(e: MouseEvent) {
		targetX = (e.clientX - window.innerWidth / 2) * 0.50;
		targetY = (e.clientY - window.innerHeight / 2) * 0.3;
	}

	onMount(async () => {
		function tick() {
			cardX += (targetX - cardX) * 0.06;
			cardY += (targetY - cardY) * 0.03;
			rafId = requestAnimationFrame(tick);
		}
		rafId = requestAnimationFrame(tick);

		const res = await fetch('/api/join');
		const data = await res.json();
		adminConnected = data.adminConnected;
		userConnected = data.userConnected;
		if (data.theme) theme = data.theme;
		loading = false;

		return () => cancelAnimationFrame(rafId);
	});
</script>

<svelte:head>
	<title>Rock Paper Scissors</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div class="screen-wrap" data-theme={theme} onmousemove={onMouseMove} role="main">
	<div class="pink-card" style="transform: translate({cardX}px, {cardY}px)">
		<div class="pink-card-label">ROCK · PAPER · SCISSORS</div>

		{#if loading}
			<div class="pink-waiting-small">Loading…</div>
		{:else}
			<div class="pink-list">
				<a
					href="/play"
					class="pink-list-item"
					class:pink-disabled={userConnected}
				>
					<span class="pink-num">[1]</span>
					<span class="pink-arrow">→</span>
					<span class="pink-word">{userConnected ? 'user connected' : 'play now'}</span>
				</a>
				<a
					href="/admin"
					class="pink-list-item"
					class:pink-disabled={adminConnected}
				>
					<span class="pink-num">[2]</span>
					<span class="pink-arrow">→</span>
					<span class="pink-word">{adminConnected ? 'admin connected' : 'admin'}</span>
				</a>
			</div>
			{#if adminConnected || userConnected}
				<button class="pink-reset" onclick={hardReset} disabled={resetting}>
					{resetting ? 'resetting…' : '[reset]'}
				</button>
			{/if}
		{/if}
	</div>

	<div class="pink-marquee-track">
		<div class="pink-marquee-content">
			{#each Array(12) as _}
				Rock Paper Scissors&nbsp;&bull;&nbsp;
			{/each}
		</div>
	</div>
</div>

<style>
	/* ── Custom fonts ── */
	@font-face {
		font-family: 'PPKyoto';
		src: url('/fonts/PPKyoto-Thin.otf') format('opentype');
		font-weight: 100;
		font-style: normal;
	}

	@font-face {
		font-family: 'PPKyoto';
		src: url('/fonts/PPKyoto-MediumItalic.otf') format('opentype');
		font-weight: 500;
		font-style: italic;
	}

	@font-face {
		font-family: 'FragmentMono';
		src: url('/fonts/FragmentMono-Regular.ttf') format('truetype');
		font-weight: 400;
		font-style: normal;
	}

	.screen-wrap[data-theme='nico'] {
		--ink: #0b393c;
		--bg-base:     #7b2fff;
		--bg-ellipse1: #d966ff;
		--bg-ellipse2: #f0c8ff;
	}

	.screen-wrap {
		--ink: #0b393c;
		--bg-base:     #ff2c2c;
		--bg-ellipse1: #f6aaff;
		--bg-ellipse2: #f2cdf6;
		position: fixed;
		inset: 0;
		background: var(--bg-base);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.screen-wrap::before {
		content: '';
		position: absolute;
		left: 50%;
		bottom: -25%;
		transform: translateX(-50%);
		width: 135vw;
		height: 80vh;
		border-radius: 50%;
		background: var(--bg-ellipse1);
		filter: blur(80px);
		pointer-events: none;
	}

	.screen-wrap::after {
		content: '';
		position: absolute;
		left: 50%;
		bottom: -22%;
		transform: translateX(-50%);
		width: 135vw;
		height: 65vh;
		border-radius: 50%;
		background: var(--bg-ellipse2);
		filter: blur(55px);
		pointer-events: none;
	}

	.pink-card {
		position: relative;
		z-index: 1;
		will-change: transform;
		background: rgba(255, 255, 255, 0.03);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		border-top: 0.5px solid rgba(255, 255, 255, 0.9);
		border-left: 0.5px solid rgba(255, 255, 255, 0.9);
		border-bottom: 1px solid rgba(255, 255, 255, 0.3);
		border-right: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 28px;
		box-shadow:
			0 24px 48px rgba(80, 40, 120, 0.18),
			0 4px 16px rgba(80, 40, 120, 0.10);
		padding: 20px 28px 22px;
		min-width: 240px;
	}

	.pink-card-label {
		font-family: 'FragmentMono', 'Courier New', Courier, monospace;
		font-size: 13px;
		color: rgba(80, 60, 100, 0.6);
		margin-bottom: 14px;
		text-transform: uppercase;
	}

	.pink-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.pink-list-item {
		display: flex;
		align-items: baseline;
		gap: 6px;
		text-decoration: none;
		padding: 2px 0;
	}

	.pink-list-item.pink-disabled {
		opacity: 0.4;
		pointer-events: none;
	}

	.pink-num {
		font-family: 'FragmentMono', 'Courier New', Courier, monospace;
		font-size: 13px;
		color: rgba(80, 60, 100, 0.45);
		min-width: 22px;
	}

	.pink-arrow {
		font-family: 'FragmentMono', 'Courier New', Courier, monospace;
		font-size: 13px;
		color: rgba(50, 40, 80, 0.55);
		min-width: 14px;
	}

	.pink-word {
		font-family: 'Arial Narrow', 'Arial', sans-serif;
		font-size: 24px;
		font-weight: 400;
		color: var(--ink);
		letter-spacing: 0.02em;
	}

	.pink-reset {
		font-family: 'FragmentMono', 'Courier New', Courier, monospace;
		font-size: 13px;
		color: rgba(80, 60, 100, 0.45);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		margin-top: 14px;
		display: block;
	}

	.pink-reset:hover {
		color: rgba(80, 60, 100, 0.8);
	}

	.pink-reset:disabled {
		cursor: not-allowed;
		opacity: 0.4;
	}

	.pink-waiting-small {
		font-family: 'FragmentMono', 'Courier New', Courier, monospace;
		font-size: 13px;
		color: rgba(80, 60, 100, 0.5);
		margin-top: 12px;
	}

	/* Marquee */
	.pink-marquee-track {
		position: absolute;
		z-index: 1;
		bottom: 5px;
		left: 0;
		right: 0;
		overflow: hidden;
		padding: 0;
		white-space: nowrap;
	}

	.pink-marquee-content {
		display: inline-block;
		animation: marquee 18s linear infinite;
		font-family: 'PPKyoto', Georgia, serif;
		font-weight: 100;
		font-size: 48px;
		color: var(--ink);
		letter-spacing: -0.02em;
	}

	@keyframes marquee {
		0%   { transform: translateX(0); }
		100% { transform: translateX(-50%); }
	}
</style>
