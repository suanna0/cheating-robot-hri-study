<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Choice, UserViewState } from '$lib/types';

	let state = $state<UserViewState | null>(null);
	let connected = $state(false);
	let error = $state<string | null>(null);
	let eventSource: EventSource | null = null;

	const choices: Choice[] = ['rock', 'paper', 'scissors'];
	const choiceEmoji: Record<Choice, string> = {
		rock: '🪨',
		paper: '📄',
		scissors: '✂️'
	};

	onMount(async () => {
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
			}
		};

		eventSource.onerror = () => {
			error = 'Connection lost';
		};
	});

	onDestroy(() => {
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
</script>

<svelte:head>
	<title>Play - Rock Paper Scissors</title>
</svelte:head>

<main>
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
			<p>Waiting for admin to join...</p>
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
					<p>Opponent</p>
					<span class="emoji">{choiceEmoji[state.lastResult.adminChoice]}</span>
					<span class="label">{state.lastResult.adminChoice}</span>
				</div>
			</div>

			<p class="waiting-text">Waiting for next round...</p>
		</div>
	{/if}
</main>

<style>
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
</style>
