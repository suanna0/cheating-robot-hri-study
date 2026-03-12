import { json } from '@sveltejs/kit';
import { resolveRound, resetRound } from '$lib/server/gameState';
import type { Choice, CheatMode } from '$lib/types';

export async function POST({ request }) {
	const { cheatMode, adminChoice } = (await request.json()) as {
		cheatMode: CheatMode;
		adminChoice: Choice;
	};

	const validModes: CheatMode[] = ['fair', 'false-win', 'reactive'];
	if (!cheatMode || !validModes.includes(cheatMode)) {
		return json({ success: false, error: 'Invalid cheat mode' }, { status: 400 });
	}

	const validChoices: Choice[] = ['rock', 'paper', 'scissors'];
	if (!adminChoice || !validChoices.includes(adminChoice)) {
		return json({ success: false, error: 'Invalid admin choice' }, { status: 400 });
	}

	const result = resolveRound(cheatMode, adminChoice);
	return json(result, { status: result.success ? 200 : 400 });
}

export async function DELETE() {
	const result = resetRound();
	return json(result, { status: result.success ? 200 : 400 });
}
