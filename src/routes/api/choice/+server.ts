import { json } from '@sveltejs/kit';
import { submitChoice } from '$lib/server/gameState';
import type { Choice, Role } from '$lib/types';

export async function POST({ request }) {
	const { role, choice } = (await request.json()) as { role: Role; choice: Choice };

	if (role !== 'user') {
		return json({ success: false, error: 'Only user role is supported' }, { status: 400 });
	}

	const validChoices: Choice[] = ['rock', 'paper', 'scissors'];
	if (!choice || !validChoices.includes(choice)) {
		return json({ success: false, error: 'Invalid choice' }, { status: 400 });
	}

	const result = submitChoice('user', choice);
	return json(result, { status: result.success ? 200 : 400 });
}
