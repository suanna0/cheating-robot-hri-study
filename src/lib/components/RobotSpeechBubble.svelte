<script lang="ts">
	import type { Outcome } from '$lib/types';

	let { outcome, visible }: { outcome: Outcome; visible: boolean } = $props();

	function line(o: Outcome): string {
		switch (o) {
			case 'user':
				return 'AWW, YOU WON!';
			case 'admin':
				return 'YES, I WIN!';
			case 'tie':
				return 'WE HAVE TIED THIS ROUND';
		}
	}
</script>

{#if visible}
	<div class="bubble-wrap" role="status" aria-live="polite">
		<div class="bubble">{line(outcome)}</div>
	</div>
{/if}

<style>
	.bubble-wrap {
		position: absolute;
		left: 50%;
		bottom: 100%;
		transform: translateX(-50%);
		margin-bottom: 8px;
		z-index: 5;
		pointer-events: none;
		animation: popIn 0.35s ease-out;
	}

	.bubble {
		position: relative;
		white-space: nowrap;
		padding: 12px 16px;
		background: rgba(255, 255, 255, 0.80);
		color: #0b393c;
		font-family: 'FragmentMono', 'Courier New', Courier, monospace;
		font-size: 13px;
		font-weight: 500;
		line-height: 1.35;
		border-radius: 16px;
		box-shadow:
			0 8px 24px rgba(80, 40, 120, 0.15),
			0 0 0 1px rgba(255, 255, 255, 0.6);
	}

	@keyframes popIn {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(6px) scale(0.96);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0) scale(1);
		}
	}
</style>
