import { json } from '@sveltejs/kit';
import { resetRound } from '$lib/server/gameState';

export async function DELETE() {
	const result = resetRound();
	return json(result, { status: result.success ? 200 : 400 });
}
