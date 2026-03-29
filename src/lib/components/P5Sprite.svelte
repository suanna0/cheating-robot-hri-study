<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Theme } from '$lib/types';

	let { theme }: { theme: Theme } = $props();

	let container: HTMLDivElement;
	let p5Instance: import('p5').default | null = null;

	// Mouse-follow state
	let x = $state(0);
	let y = $state(0);
	let targetX = 0;
	let targetY = 0;
	let rafId: number;

	function onMouseMove(e: MouseEvent) {
		// Offset relative to screen center, scaled down for subtlety
		targetX = (e.clientX - window.innerWidth / 2) * 0.06;
		targetY = (e.clientY - window.innerHeight / 2) * 0.04;
	}

	function tick() {
		x += (targetX - x) * 0.05;
		y += (targetY - y) * 0.05;
		rafId = requestAnimationFrame(tick);
	}

	async function mountSketch(t: Theme) {
		if (p5Instance) {
			p5Instance.remove();
			p5Instance = null;
		}
		const P5 = (await import('p5')).default;
		const sketch = t === 'nico'
			? (await import('$lib/sprites/nicoSketch')).default
			: (await import('$lib/sprites/nicaSketch')).default;

		p5Instance = new P5(sketch, container);
	}

	$effect(() => {
		if (container) mountSketch(theme);
	});

	onMount(() => {
		window.addEventListener('mousemove', onMouseMove);
		rafId = requestAnimationFrame(tick);
	});

	onDestroy(() => {
		cancelAnimationFrame(rafId);
		window.removeEventListener('mousemove', onMouseMove);
		p5Instance?.remove();
	});
</script>

<div
	bind:this={container}
	class="sprite-wrap"
	style="transform: translate({x}px, {y}px)"
></div>

<style>
	.sprite-wrap {
		width: 50vh;
		height: 50vh;
		pointer-events: none;
		will-change: transform;
	}
	.sprite-wrap :global(canvas) {
		display: block;
	}
</style>
