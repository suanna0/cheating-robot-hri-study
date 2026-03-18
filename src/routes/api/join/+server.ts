import { json } from '@sveltejs/kit';
import { joinGame, leaveGame, getState } from '$lib/server/gameState';
import type { Role } from '$lib/types';

export async function POST({ request }) {
	const { role } = (await request.json()) as { role: Role };

	if (!role || (role !== 'admin' && role !== 'user')) {
		return json({ success: false, error: 'Invalid role' }, { status: 400 });
	}

	const result = joinGame(role);
	return json(result, { status: result.success ? 200 : 409 });
}

export async function DELETE({ request }) {
	const { role } = (await request.json()) as { role: Role };

	if (!role || (role !== 'admin' && role !== 'user')) {
		return json({ success: false, error: 'Invalid role' }, { status: 400 });
	}

	leaveGame(role);
	return json({ success: true });
}

export async function GET() {
	const state = getState();
	return json({
		adminConnected: state.adminConnected,
		userConnected: state.userConnected,
		theme: state.theme
	});
}
