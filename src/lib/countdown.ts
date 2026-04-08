/** Server and client use the same segments for synced countdown UI. */
export const COUNTDOWN_SEGMENT_MS = [800, 800, 800, 800, 500] as const;

export const COUNTDOWN_TOTAL_MS = COUNTDOWN_SEGMENT_MS.reduce((a, b) => a + b, 0);

export function countdownDisplay(elapsedMs: number): 'Rock' | 'Paper' | 'Scissors' | 'Shoot!' | null {
	const [a, b, c, d] = COUNTDOWN_SEGMENT_MS;
	if (elapsedMs < 0) return null;
	if (elapsedMs < a) return 'Rock';
	if (elapsedMs < a + b) return 'Paper';
	if (elapsedMs < a + b + c) return 'Scissors';
	if (elapsedMs < a + b + c + d) return 'Shoot!';
	return null;
}
