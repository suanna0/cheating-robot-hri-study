import type { Choice, CheatMode, GameState, Outcome, AdminViewState, UserViewState, Role } from '$lib/types';

// Singleton game state
let gameState: GameState = {
	adminConnected: false,
	userConnected: false,
	userChoice: null,
	adminChoice: null,
	phase: 'waiting',
	lastResult: null,
	stats: {
		adminWins: 0,
		userWins: 0,
		ties: 0,
		cheatsUsed: 0
	}
};

// Event listeners for SSE
type Listener = (state: GameState) => void;
const listeners: Map<string, { callback: Listener; role: Role }> = new Map();

function notifyListeners() {
	listeners.forEach(({ callback }) => {
		callback(gameState);
	});
}

export function subscribe(id: string, role: Role, callback: Listener): () => void {
	listeners.set(id, { callback, role });
	// Send initial state
	callback(gameState);

	return () => {
		listeners.delete(id);
	};
}

export function getState(): GameState {
	return { ...gameState };
}

export function getAdminView(): AdminViewState {
	return { ...gameState };
}

export function getUserView(): UserViewState {
	return {
		adminConnected: gameState.adminConnected,
		userConnected: gameState.userConnected,
		userChoice: gameState.userChoice,
		phase: gameState.phase,
		lastResult: gameState.lastResult
			? {
					outcome: gameState.lastResult.displayedOutcome,
					adminChoice: gameState.lastResult.adminChoice,
					userChoice: gameState.lastResult.userChoice
				}
			: null
	};
}

export function joinGame(role: Role): { success: boolean; error?: string } {
	if (role === 'admin') {
		if (gameState.adminConnected) {
			return { success: false, error: 'Admin already connected' };
		}
		gameState.adminConnected = true;
	} else {
		if (gameState.userConnected) {
			return { success: false, error: 'User already connected' };
		}
		gameState.userConnected = true;
	}

	// Move to playing phase if both connected
	if (gameState.adminConnected && gameState.userConnected) {
		gameState.phase = 'playing';
	}

	notifyListeners();
	return { success: true };
}

export function leaveGame(role: Role): void {
	if (role === 'admin') {
		gameState.adminConnected = false;
	} else {
		gameState.userConnected = false;
	}

	// Reset to waiting if either disconnects
	if (!gameState.adminConnected || !gameState.userConnected) {
		gameState.phase = 'waiting';
		gameState.userChoice = null;
		gameState.adminChoice = null;
	}

	notifyListeners();
}

export function submitChoice(role: Role, choice: Choice): { success: boolean; error?: string } {
	if (gameState.phase !== 'playing') {
		return { success: false, error: 'Game not in playing phase' };
	}

	if (role === 'admin') {
		gameState.adminChoice = choice;
	} else {
		gameState.userChoice = choice;
	}

	notifyListeners();
	return { success: true };
}

function calculateOutcome(userChoice: Choice, adminChoice: Choice): Outcome {
	if (userChoice === adminChoice) return 'tie';

	const winMap: Record<Choice, Choice> = {
		rock: 'scissors',
		paper: 'rock',
		scissors: 'paper'
	};

	return winMap[userChoice] === adminChoice ? 'user' : 'admin';
}

function getWinningChoice(against: Choice): Choice {
	const winMap: Record<Choice, Choice> = {
		rock: 'paper',
		paper: 'scissors',
		scissors: 'rock'
	};
	return winMap[against];
}

export function resolveRound(
	cheatMode: CheatMode,
	adminChoice: Choice
): { success: boolean; error?: string } {
	if (gameState.phase !== 'playing') {
		return { success: false, error: 'Game not in playing phase' };
	}

	if (!gameState.userChoice) {
		return { success: false, error: 'User has not made a choice yet' };
	}

	let finalAdminChoice = adminChoice;
	let displayedOutcome: Outcome;

	// Calculate true outcome
	const trueOutcome = calculateOutcome(gameState.userChoice, adminChoice);

	if (cheatMode === 'fair') {
		displayedOutcome = trueOutcome;
	} else if (cheatMode === 'false-win') {
		// Admin claims victory regardless of actual outcome
		displayedOutcome = 'admin';
		gameState.stats.cheatsUsed++;
	} else {
		// Reactive cheat: pick winning choice against user
		finalAdminChoice = getWinningChoice(gameState.userChoice);
		displayedOutcome = 'admin';
		gameState.stats.cheatsUsed++;
	}

	gameState.adminChoice = finalAdminChoice;
	gameState.lastResult = {
		trueOutcome,
		displayedOutcome,
		cheatMode,
		adminChoice: finalAdminChoice,
		userChoice: gameState.userChoice
	};
	gameState.phase = 'resolved';

	// Update stats based on TRUE outcome
	if (trueOutcome === 'admin') {
		gameState.stats.adminWins++;
	} else if (trueOutcome === 'user') {
		gameState.stats.userWins++;
	} else {
		gameState.stats.ties++;
	}

	notifyListeners();
	return { success: true };
}

export function resetRound(): { success: boolean; error?: string } {
	if (gameState.phase !== 'resolved') {
		return { success: false, error: 'Cannot reset, round not resolved' };
	}

	gameState.userChoice = null;
	gameState.adminChoice = null;
	gameState.lastResult = null;
	gameState.phase = 'playing';

	notifyListeners();
	return { success: true };
}

export function resetGame(): void {
	gameState = {
		adminConnected: false,
		userConnected: false,
		userChoice: null,
		adminChoice: null,
		phase: 'waiting',
		lastResult: null,
		stats: {
			adminWins: 0,
			userWins: 0,
			ties: 0,
			cheatsUsed: 0
		}
	};
	notifyListeners();
}
