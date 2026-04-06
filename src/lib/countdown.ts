/** Server and client use the same segments for synced countdown UI. */
export const COUNTDOWN_SEGMENT_MS = [1000, 1000, 1000, 500] as const;

export const COUNTDOWN_TOTAL_MS = COUNTDOWN_SEGMENT_MS.reduce((a, b) => a + b, 0);

export function countdownDisplay(elapsedMs: number): '3' | '2' | '1' | 'Shoot!' | null {
	const [a, b, c, d] = COUNTDOWN_SEGMENT_MS;
	if (elapsedMs < 0) return null;
	if (elapsedMs < a) return '3';
	if (elapsedMs < a + b) return '2';
	if (elapsedMs < a + b + c) return '1';
	if (elapsedMs < a + b + c + d) return 'Shoot!';
	return null;
}
