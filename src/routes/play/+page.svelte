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
		targetX = (e.clientX - window.innerWidth / 2) * 0.1;
		targetY = (e.clientY - window.innerHeight / 2) * 0.08;
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
			cardY += (targetY - cardY) * 0.06;
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

{#if state?.theme === 'pink' && state.phase === 'playing' && !error && state.adminConnected}
	<!-- Pink theme: full-screen gradient playing UI -->
	<div class="pink-screen" onmousemove={onMouseMove}>
		{#if !state.userChoice}
			<div class="pink-card" style="transform: translate({cardX}px, {cardY}px)">
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
							<span class="pink-arrow">{hoveredChoice === i ? '→' : '\u00a0\u00a0'}</span>
							<span class="pink-word">{choice}</span>
						</button>
					{/each}
				</div>
			</div>
		{:else}
			<div class="pink-card" style="transform: translate({cardX}px, {cardY}px)">
				<div class="pink-card-label">YOU&nbsp; CHOSE</div>
				<div class="pink-list">
					<div class="pink-list-item pink-active">
						<span class="pink-num">[{choices.indexOf(state.userChoice) + 1}]</span>
						<span class="pink-arrow">→</span>
						<span class="pink-word">{state.userChoice}</span>
					</div>
				</div>
				<div class="pink-waiting-small">waiting for opponent…</div>
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
{:else}
	<main class:pink={state?.theme === 'pink'}>
		<h1>Rock Paper Scissors</h1>

		{#if error}
			<div class="error">
				<p>{error}</p>
				<a href="/" class="btn">Back to Home</a>
			</div>
		{:else if !state}
			<p class="loading">Connecting...</p>
		{:else if !state.adminConnected}
			<div class="waiting">
				<p>Waiting for the robot to get ready...</p>
				<div class="spinner"></div>
			</div>
		{:else if state.phase === 'waiting'}
			<p class="waiting">Waiting for game to start...</p>
		{:else if state.phase === 'playing'}
			<div class="game">
				{#if state.userChoice}
					<div class="chosen">
						<p>You chose:</p>
						<div class="choice-display">
							<span class="emoji">{choiceEmoji[state.userChoice]}</span>
							<span class="label">{state.userChoice}</span>
						</div>
						<p class="waiting-text">Waiting for opponent...</p>
					</div>
				{:else}
					<p class="prompt">Choose your move:</p>
					<div class="choices">
						{#each choices as choice}
							<button class="choice-btn" onclick={() => makeChoice(choice)}>
								<span class="emoji">{choiceEmoji[choice]}</span>
								<span class="label">{choice}</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{:else if state.phase === 'resolved' && state.lastResult}
			<div class="result">
				<h2 class="outcome" class:win={state.lastResult.outcome === 'user'} class:lose={state.lastResult.outcome === 'admin'}>
					{getResultMessage(state.lastResult.outcome)}
				</h2>

				<div class="matchup">
					<div class="player-choice">
						<p>You</p>
						<span class="emoji">{choiceEmoji[state.lastResult.userChoice]}</span>
						<span class="label">{state.lastResult.userChoice}</span>
					</div>
					<span class="vs">vs</span>
					<div class="player-choice">
						<p>Robot</p>
						<span class="emoji">{choiceEmoji[state.lastResult.adminChoice]}</span>
						<span class="label">{state.lastResult.adminChoice}</span>
					</div>
				</div>

				<p class="waiting-text">Waiting for next round...</p>
			</div>
		{/if}
	</main>
{/if}

<style>
	/* ── Techy theme (default) ── */
	main {
		max-width: 600px;
		margin: 0 auto;
		text-align: center;
		padding-top: 40px;
	}

	h1 {
		font-size: 2rem;
		margin-bottom: 2rem;
		color: #38ef7d;
	}

	.loading, .waiting {
		color: #888;
	}

	.error {
		color: #ff6b6b;
	}

	.btn {
		display: inline-block;
		padding: 12px 24px;
		background: #38ef7d;
		color: #1a1a2e;
		text-decoration: none;
		border-radius: 8px;
		margin-top: 1rem;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid #333;
		border-top: 3px solid #38ef7d;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 20px auto;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.prompt {
		font-size: 1.2rem;
		margin-bottom: 1.5rem;
	}

	.choices {
		display: flex;
		gap: 20px;
		justify-content: center;
	}

	.choice-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 20px 30px;
		background: #2a2a4e;
		border: 2px solid #38ef7d;
		border-radius: 16px;
		cursor: pointer;
		transition: transform 0.2s, background 0.2s;
	}

	.choice-btn:hover {
		transform: scale(1.1);
		background: #3a3a6e;
	}

	.emoji {
		font-size: 3rem;
		margin-bottom: 8px;
	}

	.label {
		font-size: 1rem;
		color: #ccc;
		text-transform: capitalize;
	}

	.chosen {
		padding: 2rem;
	}

	.choice-display {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 2rem;
		background: #2a2a4e;
		border-radius: 16px;
		margin: 1rem auto;
		width: fit-content;
	}

	.waiting-text {
		color: #666;
		margin-top: 1.5rem;
	}

	.result {
		padding: 2rem;
	}

	.outcome {
		font-size: 2.5rem;
		margin-bottom: 2rem;
	}

	.outcome.win {
		color: #38ef7d;
	}

	.outcome.lose {
		color: #ff6b6b;
	}

	.matchup {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 2rem;
	}

	.player-choice {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 1.5rem;
		background: #2a2a4e;
		border-radius: 12px;
	}

	.player-choice p {
		margin: 0 0 0.5rem 0;
		color: #888;
	}

	.vs {
		font-size: 1.5rem;
		color: #666;
	}

	/* Pink theme overrides for non-playing phases */
	main.pink h1 { color: #d63384; }
	main.pink .loading, main.pink .waiting { color: #9e4070; }
	main.pink .waiting-text { color: #9e4070; }
	main.pink .error { color: #d63384; }

	main.pink .btn {
		background: #d63384;
		color: white;
	}

	main.pink .spinner {
		border-color: #ffb6c1;
		border-top-color: #d63384;
	}

	main.pink .choice-btn {
		background: #ffe4ef;
		border-color: #ffb6c1;
		color: #4a0020;
	}

	main.pink .choice-btn:hover {
		background: #ffd6e7;
		border-color: #d63384;
	}

	main.pink .choice-display {
		background: #ffe4ef;
		border-color: #d63384;
	}

	main.pink .label { color: #9e4070; }
	main.pink .outcome.win { color: #d63384; }
	main.pink .outcome.lose { color: #c0392b; }

	main.pink .player-choice {
		background: #ffe4ef;
	}

	main.pink .player-choice p { color: #9e4070; }
	main.pink .vs { color: #ffb6c1; }

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
	.pink-screen {
		position: fixed;
		inset: 0;
		background: linear-gradient(
			to bottom,
			#e84040 0%,
			#e8407a 40%,
			#d070c8 70%,
			#d0a8e8 100%
		);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.pink-card {
		will-change: transform;
		background: rgba(255, 255, 255, 0.22);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border: 1px solid rgba(255, 255, 255, 0.35);
		border-radius: 14px;
		padding: 20px 28px 22px;
		min-width: 240px;
		/* Position card slightly below center */
		margin-top: 18vh;
	}

	.pink-card-label {
		font-family: 'FragmentMono', 'Courier New', Courier, monospace;
		font-size: 0.65rem;
		letter-spacing: 0.12em;
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
		font-size: 0.72rem;
		color: rgba(80, 60, 100, 0.45);
		min-width: 22px;
	}

	.pink-arrow {
		font-family: 'FragmentMono', 'Courier New', Courier, monospace;
		font-size: 0.85rem;
		color: rgba(50, 40, 80, 0.55);
		min-width: 14px;
	}

	.pink-word {
		font-family: 'Arial Narrow', 'Arial', sans-serif;
		font-size: 1.1rem;
		font-weight: 400;
		color: #2d2d4a;
		letter-spacing: 0.02em;
	}

	.pink-active .pink-word {
		color: #1a1a3a;
	}

	.pink-waiting-small {
		font-family: 'FragmentMono', 'Courier New', Courier, monospace;
		font-size: 0.65rem;
		color: rgba(80, 60, 100, 0.5);
		margin-top: 12px;
		letter-spacing: 0.05em;
	}

	/* Marquee */
	.pink-marquee-track {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		overflow: hidden;
		background: rgba(220, 180, 240, 0.25);
		padding: 14px 0;
		white-space: nowrap;
	}

	.pink-marquee-content {
		display: inline-block;
		animation: marquee 18s linear infinite;
		font-family: 'PPKyoto', Georgia, serif;
		font-weight: 100;
		font-size: 3.2rem;
		color: rgba(40, 30, 60, 0.55);
		letter-spacing: 0.01em;
	}

	@keyframes marquee {
		0%   { transform: translateX(0); }
		100% { transform: translateX(-50%); }
	}
</style>
