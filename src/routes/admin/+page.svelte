<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Choice, CheatMode, AdminViewState, Theme } from '$lib/types';

	let state = $state<AdminViewState | null>(null);
	let connected = $state(false);
	let error = $state<string | null>(null);
	let eventSource: EventSource | null = null;

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
		if (eventSource) eventSource.close();
		fetch('/api/join', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ role: 'admin' })
		});
	});

	const winsAgainst: Record<Choice, Choice> = { rock: 'paper', scissors: 'rock', paper: 'scissors' };

	async function resolveRound() {
		if (!state) return;
		let choice: Choice;
		if (selectedCheatMode === 'reactive') {
			const userChoice = state.userChoice;
			if (!userChoice) return;
			choice = winsAgainst[userChoice];
		} else {
			choice = choices[Math.floor(Math.random() * choices.length)];
		}
		await fetch('/api/resolve', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ cheatMode: selectedCheatMode, adminChoice: choice })
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
	<title>Admin — Rock Paper Scissors</title>
</svelte:head>

<div class="page">
	<div class="container">

		<!-- Header -->
		<header>
			<div class="header-left">
				<p class="eyebrow">Control Panel</p>
				{#if state}
					<div class="theme-toggle">
						<span class="toggle-label">Theme</span>
						<div class="segmented">
							<button class:active={state.theme === 'nico'} onclick={() => setTheme('nico')}>Nico</button>
							<button class:active={state.theme === 'nica'} onclick={() => setTheme('nica')}>Nica</button>
						</div>
					</div>
				{/if}
			</div>
			{#if state}
				<div class="header-right">
					<div class="stat-row">
						<div class="stat"><span class="stat-label">Admin</span><span class="stat-value">{state.stats.adminWins}</span></div>
						<div class="stat-divider"></div>
						<div class="stat"><span class="stat-label">User</span><span class="stat-value">{state.stats.userWins}</span></div>
						<div class="stat-divider"></div>
						<div class="stat"><span class="stat-label">Ties</span><span class="stat-value">{state.stats.ties}</span></div>
						<div class="stat-divider"></div>
						<div class="stat"><span class="stat-label">Cheats</span><span class="stat-value danger">{state.stats.cheatsUsed}</span></div>
					</div>
				</div>
			{/if}
		</header>

		<!-- Body -->
		{#if error}
			<div class="card center-card">
				<p class="body-text danger">{error}</p>
				<a href="/" class="btn-primary">Back to Home</a>
			</div>
		{:else if !state}
			<div class="card center-card">
				<div class="spinner"></div>
				<p class="body-text muted">Connecting…</p>
			</div>
		{:else if !state.userConnected}
			<div class="card center-card">
				<div class="spinner"></div>
				<p class="body-text">Waiting for participant to join</p>
				<p class="body-text muted">Share the /play URL</p>
				<div class="theme-picker">
					<p class="picker-label">Set theme</p>
					<div class="segmented">
						<button class:active={state.theme === 'nico'} onclick={() => setTheme('nico')}>Nico</button>
						<button class:active={state.theme === 'nica'} onclick={() => setTheme('nica')}>Nica</button>
					</div>
				</div>
			</div>
		{:else if state.phase === 'playing'}
			<div class="game-grid">

				<!-- User monitor -->
				<div class="card">
					<p class="section-label">Participant</p>
					{#if state.userChoice}
						<div class="choice-display">
							<span class="big-emoji">{choiceEmoji[state.userChoice]}</span>
							<span class="choice-name">{state.userChoice}</span>
						</div>
					{:else}
						<div class="choice-display muted">
							<span class="big-emoji">·</span>
							<span class="choice-name muted">Choosing…</span>
						</div>
					{/if}
				</div>

				<!-- Admin controls -->
				<div class="card">
					<p class="section-label">Cheat Mode</p>
					<div class="cheat-list">
						{#each cheatModes as mode}
							<label class="cheat-row" class:selected={selectedCheatMode === mode.value}>
								<input type="radio" name="cheatMode" value={mode.value} checked={selectedCheatMode === mode.value} onchange={() => selectedCheatMode = mode.value} />
								<div class="cheat-text">
									<span class="cheat-title">{mode.label}</span>
									<span class="cheat-desc">{mode.description}</span>
								</div>
								{#if selectedCheatMode === mode.value}
									<span class="checkmark">✓</span>
								{/if}
							</label>
						{/each}
					</div>

					<button
						class="btn-primary resolve"
						disabled={!state.userChoice}
						onclick={resolveRound}
					>
						{#if !state.userChoice}
							Waiting for participant…
						{:else}
							Resolve Round
						{/if}
					</button>
				</div>
			</div>

		{:else if state.phase === 'resolved' && state.lastResult}
			<div class="card result-card">
				<p class="section-label">Result</p>

				<div class="matchup">
					<div class="player">
						<span class="big-emoji">{choiceEmoji[state.lastResult.userChoice]}</span>
						<span class="player-label">Participant</span>
						<span class="choice-name">{state.lastResult.userChoice}</span>
					</div>
					<span class="vs">vs</span>
					<div class="player">
						<span class="big-emoji">{choiceEmoji[state.lastResult.adminChoice]}</span>
						<span class="player-label">Admin</span>
						<span class="choice-name">{state.lastResult.adminChoice}</span>
					</div>
				</div>

				<div class="result-meta">
					<div class="meta-item">
						<span class="meta-label">True outcome</span>
						<span class="meta-value">{getTrueOutcomeLabel(state.lastResult.trueOutcome)}</span>
					</div>
					<div class="meta-item">
						<span class="meta-label">Shown to user</span>
						<span class="meta-value">{getDisplayedOutcomeLabel(state.lastResult.displayedOutcome)}</span>
					</div>
					<div class="meta-item">
						<span class="meta-label">Cheat mode</span>
						<span class="meta-value" class:danger={state.lastResult.cheatMode !== 'fair'}>
							{state.lastResult.cheatMode === 'fair' ? 'Fair Play' :
							 state.lastResult.cheatMode === 'false-win' ? 'False Win' : 'Reactive Cheat'}
						</span>
					</div>
				</div>

				<button class="btn-primary" onclick={nextRound}>Next Round</button>
			</div>
		{/if}

	</div>
</div>

<style>
	/* ── Reset & base ── */
	.page {
		position: fixed;
		inset: 0;
		background: #f2f2f7;
		font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif;
		color: #1c1c1e;
		overflow-y: auto;
		-webkit-font-smoothing: antialiased;
	}

	.container {
		max-width: 860px;
		margin: 0 auto;
		padding: 40px 24px 60px;
	}

	/* ── Header ── */
	header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 32px;
		gap: 16px;
		flex-wrap: wrap;
	}

	.eyebrow {
		margin: 0 0 2px;
		font-size: 12px;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #8e8e93;
	}

	.header-right {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 10px;
	}

	.stat-row {
		display: flex;
		align-items: center;
		gap: 0;
		background: #fff;
		border-radius: 12px;
		padding: 10px 16px;
		box-shadow: 0 1px 3px rgba(0,0,0,0.08);
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0 14px;
		gap: 2px;
	}

	.stat-label {
		font-size: 10px;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #8e8e93;
	}

	.stat-value {
		font-size: 18px;
		font-weight: 600;
		color: #1c1c1e;
	}

	.stat-value.danger { color: #ff3b30; }

	.stat-divider {
		width: 1px;
		height: 28px;
		background: #e5e5ea;
	}

	.header-left {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.theme-toggle {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.toggle-label {
		font-size: 13px;
		color: #8e8e93;
	}

	.segmented {
		display: flex;
		background: #e5e5ea;
		border-radius: 9px;
		padding: 2px;
		gap: 2px;
	}

	.segmented button {
		padding: 5px 16px;
		border: none;
		border-radius: 7px;
		background: transparent;
		font-size: 13px;
		font-weight: 500;
		color: #3c3c43;
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
	}

	.segmented button.active {
		background: #fff;
		color: #1c1c1e;
		box-shadow: 0 1px 3px rgba(0,0,0,0.12);
	}

	/* ── Cards ── */
	.card {
		background: #fff;
		border-radius: 16px;
		padding: 20px;
		box-shadow: 0 1px 3px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04);
	}

	.center-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 48px 24px;
		gap: 12px;
		text-align: center;
	}

	.section-label {
		margin: 0 0 12px;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: #8e8e93;
	}

	/* ── Game grid ── */
	.game-grid {
		display: grid;
		grid-template-columns: 1fr 2fr;
		gap: 16px;
	}

	/* ── Choice display ── */
	.choice-display {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 24px 16px;
		gap: 6px;
	}

	.big-emoji { font-size: 48px; line-height: 1; }

	.choice-name {
		font-size: 15px;
		font-weight: 500;
		text-transform: capitalize;
		color: #1c1c1e;
	}

	.choice-name.muted { color: #c7c7cc; }

	/* ── Cheat modes ── */
	.cheat-list {
		display: flex;
		flex-direction: column;
		border-radius: 12px;
		overflow: hidden;
		border: 1px solid #e5e5ea;
		margin-bottom: 16px;
	}

	.cheat-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 14px;
		background: #fff;
		cursor: pointer;
		transition: background 0.12s;
		border-bottom: 1px solid #e5e5ea;
	}

	.cheat-row:last-child { border-bottom: none; }
	.cheat-row:hover { background: #f9f9fb; }
	.cheat-row.selected { background: #f0f7ff; }

	.cheat-row input { display: none; }

	.cheat-text {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.cheat-title {
		font-size: 14px;
		font-weight: 500;
		color: #1c1c1e;
	}

	.cheat-desc {
		font-size: 12px;
		color: #8e8e93;
	}

	.checkmark {
		font-size: 14px;
		color: #007aff;
		font-weight: 600;
	}

	/* ── Buttons ── */
	.btn-primary {
		display: inline-block;
		padding: 13px 24px;
		background: #007aff;
		color: #fff;
		font-size: 15px;
		font-weight: 600;
		border: none;
		border-radius: 12px;
		cursor: pointer;
		text-decoration: none;
		transition: opacity 0.15s;
	}

	.btn-primary:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.btn-primary.resolve {
		width: 100%;
		text-align: center;
	}

	/* ── Result card ── */
	.result-card {
		max-width: 540px;
		margin: 0 auto;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0;
	}

	.matchup {
		display: flex;
		align-items: center;
		gap: 24px;
		padding: 24px 0;
	}

	.player {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.player-label {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #8e8e93;
	}

	.vs {
		font-size: 13px;
		font-weight: 600;
		color: #c7c7cc;
	}

	.result-meta {
		width: 100%;
		border-radius: 12px;
		overflow: hidden;
		border: 1px solid #e5e5ea;
		margin-bottom: 20px;
	}

	.meta-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 11px 14px;
		background: #fff;
		border-bottom: 1px solid #e5e5ea;
	}

	.meta-item:last-child { border-bottom: none; }

	.meta-label {
		font-size: 14px;
		color: #8e8e93;
	}

	.meta-value {
		font-size: 14px;
		font-weight: 500;
		color: #1c1c1e;
	}

	.meta-value.danger { color: #ff3b30; }

	/* ── Theme picker (waiting card) ── */
	.theme-picker {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		margin-top: 8px;
	}

	.picker-label {
		margin: 0;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: #8e8e93;
	}

	/* ── Misc ── */
	.body-text {
		margin: 0;
		font-size: 15px;
		color: #1c1c1e;
	}

	.body-text.muted { color: #8e8e93; }
	.body-text.danger { color: #ff3b30; }

	.spinner {
		width: 28px;
		height: 28px;
		border: 2.5px solid #e5e5ea;
		border-top-color: #007aff;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	@media (max-width: 640px) {
		.game-grid { grid-template-columns: 1fr; }
		header { flex-direction: column; }
		.header-right { align-items: flex-start; }
	}
</style>
