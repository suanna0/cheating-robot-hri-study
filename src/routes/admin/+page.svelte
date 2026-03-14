<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Choice, CheatMode, AdminViewState, Theme } from '$lib/types';

	let state = $state<AdminViewState | null>(null);
	let connected = $state(false);
	let error = $state<string | null>(null);
	let eventSource: EventSource | null = null;

	let selectedChoice = $state<Choice | null>(null);
	let selectedCheatMode = $state<CheatMode>('fair');

	const choices: Choice[] = ['rock', 'paper', 'scissors'];
	const choiceEmoji: Record<Choice, string> = {
		rock: '🪨',
		paper: '📄',
		scissors: '✂️'
	};

	const cheatModes: { value: CheatMode; label: string; description: string }[] = [
		{ value: 'fair', label: 'Play Fair', description: 'Honest game, real outcome shown' },
		{ value: 'false-win', label: 'False Win', description: 'Claim victory regardless of actual outcome' },
		{ value: 'reactive', label: 'Reactive Cheat', description: 'Pick winning move, then claim victory' }
	];

	onMount(async () => {
		// Join as admin
		const joinRes = await fetch('/api/join', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ role: 'admin' })
		});

		const joinData = await joinRes.json();
		if (!joinData.success) {
			error = joinData.error || 'Failed to join';
			return;
		}

		connected = true;

		// Connect to SSE
		eventSource = new EventSource('/api/events?role=admin');

		eventSource.onmessage = (event) => {
			const message = JSON.parse(event.data);
			if (message.type === 'state') {
				state = message.data as AdminViewState;
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
			body: JSON.stringify({ role: 'admin' })
		});
	});

	async function resolveRound() {
		if (!selectedChoice) return;

		await fetch('/api/resolve', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ cheatMode: selectedCheatMode, adminChoice: selectedChoice })
		});
	}

	async function setTheme(theme: Theme) {
		await fetch('/api/theme', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ theme })
		});
	}

	async function nextRound() {
		selectedChoice = null;
		selectedCheatMode = 'fair';
		await fetch('/api/resolve', { method: 'DELETE' });
	}

	function getTrueOutcomeLabel(outcome: 'admin' | 'user' | 'tie'): string {
		switch (outcome) {
			case 'admin': return 'Admin Won';
			case 'user': return 'User Won';
			case 'tie': return 'Tie';
		}
	}

	function getDisplayedOutcomeLabel(outcome: 'admin' | 'user' | 'tie'): string {
		switch (outcome) {
			case 'admin': return 'User sees: "You Lose!"';
			case 'user': return 'User sees: "You Win!"';
			case 'tie': return 'User sees: "Tie!"';
		}
	}
</script>

<svelte:head>
	<title>Admin - Rock Paper Scissors</title>
</svelte:head>

<main>
	<div class="header">
		<h1>Admin Control Panel</h1>
		<div class="header-right">
			{#if state}
				<div class="theme-toggle">
					<span class="toggle-label">User Theme:</span>
					<button
						class="theme-btn techy"
						class:active={state.theme === 'techy'}
						onclick={() => setTheme('techy')}
					>
						⚡ Techy
					</button>
					<button
						class="theme-btn pink"
						class:active={state.theme === 'pink'}
						onclick={() => setTheme('pink')}
					>
						🌸 Pink
					</button>
				</div>
				<div class="stats">
					<span>Admin Wins: <strong>{state.stats.adminWins}</strong></span>
					<span>User Wins: <strong>{state.stats.userWins}</strong></span>
					<span>Ties: <strong>{state.stats.ties}</strong></span>
					<span class="cheats">Cheats Used: <strong>{state.stats.cheatsUsed}</strong></span>
				</div>
			{/if}
		</div>
	</div>

	{#if error}
		<div class="error">
			<p>{error}</p>
			<a href="/" class="btn">Back to Home</a>
		</div>
	{:else if !state}
		<p class="loading">Connecting...</p>
	{:else if !state.userConnected}
		<div class="waiting">
			<p>Waiting for user to join...</p>
			<div class="spinner"></div>
			<p class="hint">Share the /play URL with the participant</p>
		</div>
	{:else if state.phase === 'playing'}
		<div class="game-container">
			<!-- User's choice monitor -->
			<div class="panel user-monitor">
				<h2>User's Choice</h2>
				{#if state.userChoice}
					<div class="user-choice">
						<span class="emoji">{choiceEmoji[state.userChoice]}</span>
						<span class="label">{state.userChoice}</span>
					</div>
				{:else}
					<p class="waiting-text">User is choosing...</p>
				{/if}
			</div>

			<!-- Admin controls -->
			<div class="panel admin-controls">
				<h2>Your Move</h2>
				<div class="choices">
					{#each choices as choice}
						<button
							class="choice-btn"
							class:selected={selectedChoice === choice}
							onclick={() => selectedChoice = choice}
						>
							<span class="emoji">{choiceEmoji[choice]}</span>
							<span class="label">{choice}</span>
						</button>
					{/each}
				</div>

				<h2>Cheat Mode</h2>
				<div class="cheat-modes">
					{#each cheatModes as mode}
						<label class="cheat-option" class:selected={selectedCheatMode === mode.value}>
							<input
								type="radio"
								name="cheatMode"
								value={mode.value}
								checked={selectedCheatMode === mode.value}
								onchange={() => selectedCheatMode = mode.value}
							/>
							<div class="cheat-content">
								<strong>{mode.label}</strong>
								<span>{mode.description}</span>
							</div>
						</label>
					{/each}
				</div>

				<button
					class="resolve-btn"
					disabled={!selectedChoice || !state.userChoice}
					onclick={resolveRound}
				>
					{#if !state.userChoice}
						Waiting for user...
					{:else if !selectedChoice}
						Select your move
					{:else}
						Resolve Round
					{/if}
				</button>
			</div>
		</div>
	{:else if state.phase === 'resolved' && state.lastResult}
		<div class="result-panel">
			<h2>Round Result</h2>

			<div class="result-grid">
				<div class="result-item">
					<h3>True Outcome</h3>
					<p class="outcome">{getTrueOutcomeLabel(state.lastResult.trueOutcome)}</p>
				</div>

				<div class="result-item">
					<h3>Displayed to User</h3>
					<p class="outcome displayed">{getDisplayedOutcomeLabel(state.lastResult.displayedOutcome)}</p>
				</div>

				<div class="result-item">
					<h3>Cheat Mode</h3>
					<p class="cheat-badge" class:cheated={state.lastResult.cheatMode !== 'fair'}>
						{state.lastResult.cheatMode === 'fair' ? 'Fair Play' :
						 state.lastResult.cheatMode === 'false-win' ? 'False Win' : 'Reactive Cheat'}
					</p>
				</div>
			</div>

			<div class="matchup">
				<div class="player">
					<p>User</p>
					<span class="emoji">{choiceEmoji[state.lastResult.userChoice]}</span>
					<span class="label">{state.lastResult.userChoice}</span>
				</div>
				<span class="vs">vs</span>
				<div class="player">
					<p>Admin</p>
					<span class="emoji">{choiceEmoji[state.lastResult.adminChoice]}</span>
					<span class="label">{state.lastResult.adminChoice}</span>
				</div>
			</div>

			<button class="next-btn" onclick={nextRound}>
				Next Round
			</button>
		</div>
	{/if}
</main>

<style>
	main {
		max-width: 900px;
		margin: 0 auto;
		padding: 20px;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 2rem;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.header-right {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.75rem;
	}

	.theme-toggle {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.toggle-label {
		color: #888;
		font-size: 0.9rem;
	}

	.theme-btn {
		padding: 6px 16px;
		border-radius: 20px;
		border: 2px solid transparent;
		cursor: pointer;
		font-size: 0.9rem;
		transition: all 0.2s;
		opacity: 0.5;
	}

	.theme-btn.techy {
		background: #1a1a2e;
		color: #38ef7d;
		border-color: #38ef7d33;
	}

	.theme-btn.techy:hover, .theme-btn.techy.active {
		border-color: #38ef7d;
		opacity: 1;
	}

	.theme-btn.pink {
		background: #fff0f5;
		color: #d63384;
		border-color: #ffb6c133;
	}

	.theme-btn.pink:hover, .theme-btn.pink.active {
		border-color: #d63384;
		opacity: 1;
	}

	h1 {
		font-size: 1.8rem;
		color: #667eea;
		margin: 0;
	}

	.stats {
		display: flex;
		gap: 1.5rem;
		color: #888;
	}

	.stats strong {
		color: #fff;
	}

	.cheats strong {
		color: #ff6b6b;
	}

	.loading, .waiting {
		text-align: center;
		color: #888;
	}

	.hint {
		color: #666;
		font-size: 0.9rem;
	}

	.error {
		text-align: center;
		color: #ff6b6b;
	}

	.btn {
		display: inline-block;
		padding: 12px 24px;
		background: #667eea;
		color: white;
		text-decoration: none;
		border-radius: 8px;
		margin-top: 1rem;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid #333;
		border-top: 3px solid #667eea;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 20px auto;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.game-container {
		display: grid;
		grid-template-columns: 1fr 2fr;
		gap: 2rem;
	}

	.panel {
		background: #2a2a4e;
		border-radius: 16px;
		padding: 1.5rem;
	}

	.panel h2 {
		margin: 0 0 1rem 0;
		font-size: 1.2rem;
		color: #888;
	}

	.user-monitor {
		text-align: center;
	}

	.user-choice {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 2rem;
		background: #1a1a2e;
		border-radius: 12px;
		border: 2px solid #38ef7d;
	}

	.waiting-text {
		color: #666;
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

	.choices {
		display: flex;
		gap: 12px;
		margin-bottom: 1.5rem;
	}

	.choice-btn {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 15px;
		background: #1a1a2e;
		border: 2px solid #444;
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.choice-btn:hover {
		border-color: #667eea;
	}

	.choice-btn.selected {
		border-color: #667eea;
		background: #3a3a6e;
	}

	.choice-btn .emoji {
		font-size: 2rem;
	}

	.cheat-modes {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-bottom: 1.5rem;
	}

	.cheat-option {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		background: #1a1a2e;
		border: 2px solid #444;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.cheat-option:hover {
		border-color: #667eea;
	}

	.cheat-option.selected {
		border-color: #667eea;
		background: #3a3a6e;
	}

	.cheat-option input {
		display: none;
	}

	.cheat-content {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.cheat-content strong {
		color: #fff;
	}

	.cheat-content span {
		color: #888;
		font-size: 0.85rem;
	}

	.resolve-btn {
		width: 100%;
		padding: 16px;
		font-size: 1.1rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border: none;
		border-radius: 12px;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.resolve-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.result-panel {
		background: #2a2a4e;
		border-radius: 16px;
		padding: 2rem;
		text-align: center;
	}

	.result-panel h2 {
		margin: 0 0 1.5rem 0;
		color: #888;
	}

	.result-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.result-item {
		background: #1a1a2e;
		padding: 1rem;
		border-radius: 8px;
	}

	.result-item h3 {
		margin: 0 0 0.5rem 0;
		font-size: 0.9rem;
		color: #666;
	}

	.outcome {
		margin: 0;
		font-size: 1.1rem;
	}

	.displayed {
		color: #ff6b6b;
	}

	.cheat-badge {
		margin: 0;
		padding: 4px 8px;
		border-radius: 4px;
		display: inline-block;
	}

	.cheat-badge.cheated {
		background: #ff6b6b33;
		color: #ff6b6b;
	}

	.matchup {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 2rem;
		margin-bottom: 2rem;
	}

	.player {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 1rem;
		background: #1a1a2e;
		border-radius: 12px;
	}

	.player p {
		margin: 0 0 0.5rem 0;
		color: #888;
	}

	.vs {
		font-size: 1.5rem;
		color: #666;
	}

	.next-btn {
		padding: 16px 48px;
		font-size: 1.1rem;
		background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
		color: white;
		border: none;
		border-radius: 12px;
		cursor: pointer;
	}

	@media (max-width: 768px) {
		.game-container {
			grid-template-columns: 1fr;
		}

		.result-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
