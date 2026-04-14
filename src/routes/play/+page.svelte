<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { Choice, UserViewState } from '$lib/types';
	import P5Sprite from '$lib/components/P5Sprite.svelte';
	import RpsIcon from '$lib/components/RpsIcon.svelte';
	import RobotSpeechBubble from '$lib/components/RobotSpeechBubble.svelte';
	import { countdownDisplay } from '$lib/countdown';

	let state = $state<UserViewState | null>(null);
	let error = $state<string | null>(null);
	let eventSource: EventSource | null = null;
	let hoveredChoice = $state<number | null>(0);

	let nowMs = $state(Date.now());
	let reactiveShowTrueHand = $state(false);
	let speechVisible = $state(false);

	// Cursor-following card
	let cardX = $state(0);
	let cardY = $state(0);
	let spriteX = $state(0);
	let spriteY = $state(0);
	let targetX = 0;
	let targetY = 0;
	let rafId: number;

	let cardEl: HTMLDivElement | null = null;

	function onMouseMove(e: MouseEvent) {
		targetX = (e.clientX - window.innerWidth / 2) * 0.5;
		targetY = (e.clientY - window.innerHeight / 2) * 0.3;
	}

	const choices: Choice[] = ['rock', 'paper', 'scissors'];

	$effect(() => {
		if (state?.phase !== 'countdown' || state.countdownStartedAt == null) {
			return;
		}
		let id: number;
		function frame() {
			nowMs = Date.now();
			id = requestAnimationFrame(frame);
		}
		id = requestAnimationFrame(frame);
		return () => cancelAnimationFrame(id);
	});

	$effect(() => {
		const s = state;
		if (!s || s.phase !== 'resolved' || !s.lastResult) {
			reactiveShowTrueHand = false;
			speechVisible = false;
			return;
		}
		const lr = s.lastResult;
		if (lr.decoyAdminChoice != null) {
			reactiveShowTrueHand = false;
			speechVisible = false;
			const h = setTimeout(() => {
				reactiveShowTrueHand = true;
				speechVisible = true;
			}, 600);
			return () => clearTimeout(h);
		}
		reactiveShowTrueHand = true;
		speechVisible = true;
	});

	onMount(async () => {
		function tick() {
			cardX += (targetX - cardX) * 0.06;
			cardY += (targetY - cardY) * 0.03;
			rafId = requestAnimationFrame(tick);
		}
		rafId = requestAnimationFrame(tick);

		const joinRes = await fetch('/api/join', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ role: 'user' })
		});

		const joinData = await joinRes.json();
		if (!joinData.success) {
			error = joinData.error || 'Failed to join';
			return;
		}

		eventSource = new EventSource('/api/events?role=user');

		eventSource.onmessage = (event) => {
			const message = JSON.parse(event.data);
			if (message.type === 'state') {
				state = message.data as UserViewState;
				document.body.dataset.theme = state.theme;
			}
		};

		eventSource.onerror = () => {
			error = 'Connection lost';
		};
	});

	onDestroy(() => {
		cancelAnimationFrame(rafId);
		if (eventSource) {
			eventSource.close();
		}
		fetch('/api/join', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ role: 'user' })
		});
	});

	async function makeChoice(choice: Choice) {
		await fetch('/api/choice', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ role: 'user', choice })
		});
	}

	function handleKeydown(e: KeyboardEvent) {
		if (state?.phase === 'playing' && !state.userChoice) {
			if (e.key === '1') makeChoice('rock');
			if (e.key === '2') makeChoice('paper');
			if (e.key === '3') makeChoice('scissors');
		}
	}
</script>

<svelte:head>
	<title>Play - Rock Paper Scissors</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div
	class="screen-wrap"
	data-theme={state?.theme ?? 'nica'}
	onmousemove={onMouseMove}
	role="main"
>
	<div class="sprite-bg-layer" aria-hidden="true">
		{#if state}
			<div class="sprite-bg-scale">
				<P5Sprite theme={state.theme} adminConnected={state.adminConnected} bind:x={spriteX} bind:y={spriteY} />
			</div>
		{/if}
	</div>

	{#if state?.phase === 'countdown' && state.countdownStartedAt != null}
		{@const elapsed = nowMs - state.countdownStartedAt}
		{@const cdLabel = countdownDisplay(elapsed)}
		<div class="countdown-overlay" aria-live="polite" out:fade={{ duration: 600 }}>
			{#if cdLabel}
				<div class="countdown-text">{cdLabel}</div>
			{/if}
		</div>
	{/if}

	<div class="pink-card-stack" bind:this={cardEl} style="transform: translate({cardX}px, {cardY}px)">
		<div class="pink-card">
		{#if error}
			<div class="pink-card-label">ERROR</div>
			<div class="pink-waiting-small">{error}</div>
			<a href="/" class="btn">[BACK TO HOME]</a>
		{:else if !state}
			<div class="pink-card-label">CONNECTING</div>
			<div class="pink-waiting-small">Connecting…</div>
		{:else if !state.adminConnected}
			<div class="pink-card-label">STAND&nbsp; BY</div>
			<div class="pink-waiting-small">Waiting for the robot to get ready…</div>
		{:else if state.phase === 'waiting'}
			<div class="pink-card-label">STAND&nbsp; BY</div>
			<div class="pink-waiting-small">Waiting for game to start…</div>
		{:else if state.phase === 'playing'}
			{#if !state.userChoice}
				<div class="pink-card-label">MAKE&nbsp; YOUR&nbsp; MOVE</div>
				<div class="pink-list">
					{#each choices as choice, i}
						<button
							type="button"
							class="pink-list-item"
							class:pink-active={hoveredChoice === i}
							onmouseenter={() => (hoveredChoice = i)}
							onmouseleave={() => (hoveredChoice = 0)}
							onclick={() => makeChoice(choice)}
						>
							<span class="pink-num">[{i + 1}]</span>
							<span class="pink-arrow" style="opacity: {hoveredChoice === i ? 1 : 0}">→</span>
							<RpsIcon {choice} size="md" />
						</button>
					{/each}
				</div>
			{:else}
				<div class="pink-card-label">YOU&nbsp; CHOSE</div>
				<div class="pink-list">
					<div class="pink-list-item pink-active">
						<span class="pink-num">[{choices.indexOf(state.userChoice) + 1}]</span>
						<span class="pink-arrow">→</span>
						<RpsIcon choice={state.userChoice} size="md" />
					</div>
				</div>
				<div class="pink-waiting-small">Locked in — get ready…</div>
			{/if}
		{:else if state.phase === 'countdown' && state.userChoice}
			<div class="pink-card-label">LOCKED&nbsp; IN</div>
			<div class="pink-list">
				<div class="pink-list-item pink-active">
					<span class="pink-num">YOU</span>
					<span class="pink-arrow">→</span>
					<RpsIcon choice={state.userChoice} size="md" />
				</div>
			</div>
			<div class="pink-waiting-small">Countdown on screen…</div>
		{:else if state.phase === 'resolved' && state.lastResult}
			{@const lr = state.lastResult}
			<div class="pink-card-label">RESULT</div>
			<div class="pink-list">
				<div class="pink-list-item pink-active">
					<span class="pink-num">YOU</span>
					<span class="pink-arrow">→</span>
					<RpsIcon choice={lr.userChoice} size="md" />
				</div>
				<div class="pink-list-item bot-row">
					<span class="pink-num">BOT</span>
					<span class="pink-arrow">→</span>
					<span class="bot-hand-slot">
						{#if lr.decoyAdminChoice != null}
							<span class="hand-layer" class:layer-visible={!reactiveShowTrueHand}>
								<RpsIcon choice={lr.decoyAdminChoice} size="md" />
							</span>
							<span class="hand-layer" class:layer-visible={reactiveShowTrueHand}>
								<RpsIcon choice={lr.adminChoice} size="md" />
							</span>
						{:else}
							<RpsIcon choice={lr.adminChoice} size="md" />
						{/if}
					</span>
				</div>
			</div>
			<div class="pink-waiting-small">waiting for next round…</div>
		{/if}
		</div>
	</div>

	{#if state?.lastResult && state.phase === 'resolved'}
		<div class="speech-bubble-slot" style="transform: translate(calc(-50% + {spriteX}px), calc(-50% + {spriteY}px))">
			<RobotSpeechBubble
				outcome={state.lastResult.outcome}
				visible={speechVisible}
			/>
		</div>
	{/if}

	<div class="pink-marquee-track">
		<div class="pink-marquee-content">
			{#each Array(12) as _}
				Rock Paper Scissors&nbsp;&bull;&nbsp;
			{/each}
		</div>
	</div>
</div>

<style>
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

	.screen-wrap {
		--ink: #0b393c;
		--bg-base: #ff2c2c;
		--bg-ellipse1: #f6aaff;
		--bg-ellipse2: #f2cdf6;
		position: fixed;
		inset: 0;
		background: var(--bg-base);
		transition: background-color 0.3s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		isolation: isolate;
	}

	.screen-wrap[data-theme='nico'] {
		--ink: #0b393c;
		--bg-base: #7b2fff;
		--bg-ellipse1: #d966ff;
		--bg-ellipse2: #f0c8ff;
	}

	.screen-wrap::before {
		content: '';
		position: absolute;
		z-index: 1;
		left: 50%;
		bottom: -25%;
		transform: translateX(-50%);
		width: 135vw;
		height: 80vh;
		border-radius: 50%;
		background: var(--bg-ellipse1);
		filter: blur(80px);
		pointer-events: none;
		transition: background-color 0.3s ease;
	}

	.screen-wrap::after {
		content: '';
		position: absolute;
		z-index: 1;
		left: 50%;
		bottom: -22%;
		transform: translateX(-50%);
		width: 135vw;
		height: 65vh;
		border-radius: 50%;
		background: var(--bg-ellipse2);
		filter: blur(55px);
		pointer-events: none;
		transition: background-color 0.3s ease;
	}

	.sprite-bg-layer {
		position: absolute;
		inset: 0;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
		opacity: 0.8;
	}

	.sprite-bg-scale {
		transform: scale(1.35) translateY(6%);
		transform-origin: center center;
	}

	.sprite-bg-scale :global(.sprite-wrap) {
		width: min(72vh, 92vw);
		height: min(72vh, 92vw);
	}

	.countdown-overlay {
		position: fixed;
		inset: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
		background: rgba(0, 0, 0, 0.32);
		animation: overlayFadeIn 0.6s ease forwards;
	}

	@keyframes overlayFadeIn {
		from { opacity: 0; }
		to   { opacity: 1; }
	}

	.countdown-text {
		font-family: 'FragmentMono', 'Courier New', Courier, monospace;
		font-weight: 400;
		font-size: 13px;
		color: #ffffff;
		text-transform: uppercase;
		animation: cdPulse 0.45s ease-out;
		will-change: opacity;
	}

	@keyframes cdPulse {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.pink-card-stack {
		position: relative;
		z-index: 2;
		margin-top: 20vh;
		will-change: transform;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0;
	}

	.pink-card {
		position: relative;
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
			0 4px 16px rgba(80, 40, 120, 0.1);
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
		gap: 8px;
	}

	.pink-list-item {
		display: flex;
		align-items: center;
		gap: 8px;
		background: none;
		border: none;
		cursor: pointer;
		padding: 4px 0;
		text-align: left;
	}

	.pink-num {
		font-family: 'FragmentMono', 'Courier New', Courier, monospace;
		font-size: 13px;
		color: rgba(80, 60, 100, 0.45);
		min-width: 28px;
	}

	.pink-arrow {
		font-family: 'FragmentMono', 'Courier New', Courier, monospace;
		font-size: 13px;
		color: rgba(50, 40, 80, 0.55);
		min-width: 14px;
	}

	.btn {
		font-family: 'FragmentMono', 'Courier New', Courier, monospace;
		font-size: 13px;
		color: var(--ink);
		text-decoration: none;
		margin-top: 12px;
		display: inline-block;
	}

	.pink-waiting-small {
		font-family: 'FragmentMono', 'Courier New', Courier, monospace;
		font-size: 13px;
		color: rgba(80, 60, 100, 0.5);
		margin-top: 12px;
	}

	.bot-row {
		align-items: center;
	}

	.bot-hand-slot {
		position: relative;
		width: 56px;
		height: 48px;
		display: inline-flex;
		align-items: center;
		justify-content: flex-start;
	}

	.hand-layer {
		position: absolute;
		left: 0;
		top: 50%;
		transform: translateY(-50%);
		opacity: 0;
		transition: opacity 0.525s ease-in-out;
		pointer-events: none;
	}

	.hand-layer.layer-visible {
		opacity: 1;
	}

	.speech-bubble-slot {
		position: absolute;
		top: 40%;
		left: 50%;
		z-index: 5;
		pointer-events: none;
	}

	.pink-marquee-track {
		position: absolute;
		z-index: 9999;
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
		0% {
			transform: translateX(0);
		}
		100% {
			transform: translateX(-50%);
		}
	}
</style>
