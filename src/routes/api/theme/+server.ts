import { json } from '@sveltejs/kit';
import { setTheme } from '$lib/server/gameState';
import type { Theme } from '$lib/types';

export async function POST({ request }) {
	const { theme } = (await request.json()) as { theme: Theme };

	const validThemes: Theme[] = ['nico', 'nica'];
	if (!theme || !validThemes.includes(theme)) {
		return json({ success: false, error: 'Invalid theme' }, { status: 400 });
	}

	setTheme(theme);
	return json({ success: true });
}
