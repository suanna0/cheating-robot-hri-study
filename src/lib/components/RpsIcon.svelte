<script lang="ts">
	import type { Choice } from '$lib/types';

	let {
		choice,
		size = 'md',
		showLabel = false
	}: {
		choice: Choice;
		size?: 'sm' | 'md' | 'lg';
		showLabel?: boolean;
	} = $props();

	const emoji: Record<Choice, string> = {
		rock: '🪨',
		paper: '📄',
		scissors: '✂️'
	};

	const label: Record<Choice, string> = {
		rock: 'Rock',
		paper: 'Paper',
		scissors: 'Scissors'
	};

	const sizeClass = size === 'lg' ? 'rps-lg' : size === 'sm' ? 'rps-sm' : 'rps-md';
</script>

<span class="rps-icon {sizeClass}" role="img" aria-label={label[choice]}>
	<span class="rps-emoji">{emoji[choice]}</span>
	{#if showLabel}
		<span class="rps-label">{label[choice]}</span>
	{/if}
</span>

<style>
	.rps-icon {
		display: inline-flex;
		align-items: center;
		gap: 0.35em;
		vertical-align: middle;
	}

	.rps-emoji {
		line-height: 1;
		display: block;
	}

	.rps-sm .rps-emoji {
		font-size: 28px;
	}

	.rps-md .rps-emoji {
		font-size: 40px;
	}

	.rps-lg .rps-emoji {
		font-size: 56px;
	}

	.rps-label {
		font-size: 14px;
		font-weight: 500;
		text-transform: capitalize;
		opacity: 0.85;
	}
</style>
