<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<style>
	:global(body) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		margin: 0;
		padding: 20px;
		background: #1a1a2e;
		color: #eee;
		min-height: 100vh;
		box-sizing: border-box;
	}

	:global(*) {
		box-sizing: border-box;
	}

	:global(body[data-theme='nica']) {
		background: #fff0f5;
		color: #4a0020;
	}
</style>
