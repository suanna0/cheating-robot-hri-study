import { json } from '@sveltejs/kit';
import { setAdminReady } from '$lib/server/gameState';
import type { CheatMode, Choice } from '$lib/types';

export async function POST({ request }) {
	const body = (await request.json()) as { cheatMode?: CheatMode; adminChoice?: Choice };

	const validModes: CheatMode[] = ['fair', 'false-win', 'reactive'];
	if (!body.cheatMode || !validModes.includes(body.cheatMode)) {
		return json({ success: false, error: 'Invalid cheat mode' }, { status: 400 });
	}

	const validChoices: Choice[] = ['rock', 'paper', 'scissors'];
	if (body.cheatMode !== 'reactive') {
		if (!body.adminChoice || !validChoices.includes(body.adminChoice)) {
			return json({ success: false, error: 'Hand choice required' }, { status: 400 });
		}
	} else if (body.adminChoice != null) {
		return json({ success: false, error: 'Do not send adminChoice for reactive mode' }, { status: 400 });
	}

	const result = setAdminReady(
		body.cheatMode,
		body.cheatMode === 'reactive' ? undefined : body.adminChoice
	);
	return json(result, { status: result.success ? 200 : 400 });
}
