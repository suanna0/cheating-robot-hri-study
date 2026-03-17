import { json } from '@sveltejs/kit';
import { resetGame } from '$lib/server/gameState';

export async function POST() {
	resetGame();
	return json({ success: true });
}
