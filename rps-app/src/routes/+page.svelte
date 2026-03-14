<script lang="ts">
	import { onMount } from 'svelte';

	let adminConnected = $state(false);
	let userConnected = $state(false);
	let loading = $state(true);

	onMount(async () => {
		const res = await fetch('/api/join');
		const data = await res.json();
		adminConnected = data.adminConnected;
		userConnected = data.userConnected;
		loading = false;
	});
</script>

<svelte:head>
	<title>Rock Paper Scissors</title>
</svelte:head>

<main>
	<h1>Welcome to Rock Paper Scissors!</h1>
	<p class="subtitle">Play against a robot and see who wins.</p>

	{#if loading}
		<p class="loading">Loading...</p>
	{:else}
		<div class="buttons">
			<a href="/admin" class="btn admin" class:disabled={adminConnected}>
				{#if adminConnected}
					Admin Connected
				{:else}
					Join as Admin
				{/if}
			</a>

			<a href="/play" class="btn user" class:disabled={userConnected}>
				{#if userConnected}
					User Connected
				{:else}
					Play Now
				{/if}
			</a>
		</div>

		<div class="status">
			<p>
				Admin: <span class:connected={adminConnected}>{adminConnected ? 'Connected' : 'Waiting'}</span>
			</p>
			<p>
				User: <span class:connected={userConnected}>{userConnected ? 'Connected' : 'Waiting'}</span>
			</p>
		</div>
	{/if}
</main>

<style>
	main {
		max-width: 600px;
		margin: 0 auto;
		text-align: center;
		padding-top: 60px;
	}

	h1 {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
	}

	.subtitle {
		color: #888;
		margin-bottom: 3rem;
	}

	.loading {
		color: #888;
	}

	.buttons {
		display: flex;
		gap: 20px;
		justify-content: center;
		margin-bottom: 3rem;
	}

	.btn {
		padding: 20px 40px;
		font-size: 1.2rem;
		border: none;
		border-radius: 12px;
		cursor: pointer;
		text-decoration: none;
		transition: transform 0.2s, opacity 0.2s;
	}

	.btn:hover:not(.disabled) {
		transform: scale(1.05);
	}

	.btn.admin {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
	}

	.btn.user {
		background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
		color: white;
	}

	.btn.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.status {
		color: #666;
	}

	.status p {
		margin: 0.5rem 0;
	}

	.connected {
		color: #38ef7d;
	}
</style>
