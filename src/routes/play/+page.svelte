<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Choice, UserViewState } from '$lib/types';

	let state = $state<UserViewState | null>(null);
	let connected = $state(false);
	let error = $state<string | null>(null);
	let eventSource: EventSource | null = null;
	let hoveredChoice = $state<number | null>(0);

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

	const choices: Choice[] = ['rock', 'paper', 'scissors'];
	const choiceEmoji: Record<Choice, string> = {
		rock: '🪨',
		paper: '📄',
		scissors: '✂️'
	};

	onMount(async () => {
		// Start cursor-follow animation loop
		function tick() {
			cardX += (targetX - cardX) * 0.06;
			cardY += (targetY - cardY) * 0.03;
			rafId = requestAnimationFrame(tick);
		}
		rafId = requestAnimationFrame(tick);

		// Join as user
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

		connected = true;

		// Connect to SSE
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
		// Leave game
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

	function getResultMessage(outcome: 'admin' | 'user' | 'tie'): string {
		switch (outcome) {
			case 'user':
				return 'You Win!';
			case 'admin':
				return 'You Lose!';
			case 'tie':
				return "It's a Tie!";
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (state?.theme === 'pink' && state.phase === 'playing' && !state.userChoice) {
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
	data-theme={state?.theme ?? 'techy'}
	onmousemove={onMouseMove}
	role="main"
>
	<!-- Glass card — always visible, left-justified, mouse-following -->
	<div class="pink-card" style="transform: translate({cardX}px, {cardY}px)">
		{#if error}
			<div class="pink-card-label">ERROR</div>
			<div class="pink-waiting-small">{error}</div>
			<a href="/" class="btn">Back to Home</a>
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
				<div class="pink-card-label">CHOOSE&nbsp; YOUR&nbsp; NEXT&nbsp; MOVE</div>
				<div class="pink-list">
					{#each choices as choice, i}
						<button
							class="pink-list-item"
							class:pink-active={hoveredChoice === i}
							onmouseenter={() => (hoveredChoice = i)}
							onmouseleave={() => (hoveredChoice = 0)}
							onclick={() => makeChoice(choice)}
						>
							<span class="pink-num">[{i + 1}]</span>
							<span class="pink-arrow" style="opacity: {hoveredChoice === i ? 1 : 0}">→</span>
							<span class="pink-word">{choice}</span>
						</button>
					{/each}
				</div>
			{:else}
				<div class="pink-card-label">YOU&nbsp; CHOSE</div>
				<div class="pink-list">
					<div class="pink-list-item pink-active">
						<span class="pink-num">[{choices.indexOf(state.userChoice) + 1}]</span>
						<span class="pink-arrow">→</span>
						<span class="pink-word">{state.userChoice}</span>
					</div>
				</div>
				<div class="pink-waiting-small">waiting for opponent…</div>
			{/if}
		{:else if state.phase === 'resolved' && state.lastResult}
			<div class="pink-card-label">RESULT</div>
			<div class="pink-list">
				<div class="pink-list-item pink-active">
					<span class="pink-num">YOU</span>
					<span class="pink-arrow">→</span>
					<span class="pink-word">{state.lastResult.userChoice}</span>
				</div>
				<div class="pink-list-item">
					<span class="pink-num">BOT</span>
					<span class="pink-arrow">→</span>
					<span class="pink-word">{state.lastResult.adminChoice}</span>
				</div>
			</div>
			<div class="pink-waiting-small">{getResultMessage(state.lastResult.outcome)} · waiting for next round…</div>
		{/if}
	</div>

	<!-- Marquee — always visible -->
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

	/* ── Pink full-screen playing UI ── */
	.screen-wrap {
		--ink: #0b393c;
		/* Pink theme colors */
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

	/* Techy theme overrides */
	.screen-wrap[data-theme='techy'] {
		--ink: #0b393c;
		--bg-base:     #7b2fff;
		--bg-ellipse1: #d966ff;
		--bg-ellipse2: #f0c8ff;
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
		/* Light at -45° (top-left), 80% brightness → bright top & left edges */
		border-top: 0.5px solid rgba(255, 255, 255, 0.9);
		border-left: 0.5px solid rgba(255, 255, 255, 0.9);
		border-bottom: 1px solid rgba(255, 255, 255, 0.3);
		border-right: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 28px;
		/* Depth: 72 */
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
		background: none;
		border: none;
		cursor: pointer;
		padding: 2px 0;
		text-align: left;
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
		bottom: 0;
		left: 0;
		right: 0;
		overflow: hidden;
		padding: 14px 0;
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
