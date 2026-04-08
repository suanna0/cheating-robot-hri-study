<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Theme } from '$lib/types';

	let { theme, adminConnected, x = $bindable(0), y = $bindable(0) }: { theme: Theme; adminConnected: boolean; x?: number; y?: number } = $props();

	let container: HTMLDivElement;
	let p5Instance: import('p5').default | null = null;

	// Two-stage lerp for rubbery delay
	let lagX = 0, lagY = 0;   // intermediate ghost position
	let targetX = 0, targetY = 0;
	let rafId: number;

	function onMouseMove(e: MouseEvent) {
		targetX = (e.clientX - window.innerWidth  / 2) * 0.06;
		targetY = (e.clientY - window.innerHeight / 2) * 0.04;
	}

	function tick() {
		// stage 1 — ghost chases cursor slowly
		lagX += (targetX - lagX) * 0.03;
		lagY += (targetY - lagY) * 0.03;
		// stage 2 — sprite chases ghost even more slowly
		x += (lagX - x) * 0.04;
		y += (lagY - y) * 0.04;
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
	class:visible={adminConnected}
	style="transform: translate({x}px, {y}px)"
></div>

<style>
	.sprite-wrap {
		width: 50vh;
		height: 50vh;
		pointer-events: none;
		will-change: transform;
		opacity: 0;
		transition: opacity 1.2s ease;
	}
	.sprite-wrap.visible {
		opacity: 1;
	}
	.sprite-wrap :global(canvas) {
		display: block;
	}
</style>
