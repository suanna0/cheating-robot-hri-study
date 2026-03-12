import { subscribe, getAdminView, getUserView } from '$lib/server/gameState';
import type { Role } from '$lib/types';

export function GET({ url }): Response {
	const role = url.searchParams.get('role') as Role;

	if (!role || (role !== 'admin' && role !== 'user')) {
		return new Response('Invalid role', { status: 400 });
	}

	const id = crypto.randomUUID();

	const stream = new ReadableStream({
		start(controller) {
			const encoder = new TextEncoder();

			const unsubscribe = subscribe(id, role, () => {
				const data = role === 'admin' ? getAdminView() : getUserView();
				const message = `data: ${JSON.stringify({ type: 'state', data, role })}\n\n`;
				try {
					controller.enqueue(encoder.encode(message));
				} catch {
					// Stream closed
					unsubscribe();
				}
			});

			// Handle client disconnect
			return () => {
				unsubscribe();
			};
		},
		cancel() {
			// Called when stream is cancelled
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
}
