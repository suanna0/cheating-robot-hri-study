import { COUNTDOWN_TOTAL_MS } from '$lib/countdown';
import type {
	Choice,
	CheatMode,
	GameState,
	Outcome,
	AdminViewState,
	UserViewState,
	Role,
	Theme
} from '$lib/types';

// Singleton game state
let gameState: GameState = {
	adminConnected: false,
	userConnected: false,
	userChoice: null,
	adminChoice: null,
	phase: 'waiting',
	lastResult: null,
	theme: 'nica',
	adminReady: false,
	pendingCheatMode: null,
	countdownStartedAt: null,
	countdownEndsAt: null,
	stats: {
		adminWins: 0,
		userWins: 0,
		ties: 0,
		cheatsUsed: 0
	}
};

let countdownTimeout: ReturnType<typeof setTimeout> | null = null;

// Event listeners for SSE
type Listener = (state: GameState) => void;
const listeners: Map<string, { callback: Listener; role: Role }> = new Map();

function clearCountdownTimer(): void {
	if (countdownTimeout) {
		clearTimeout(countdownTimeout);
		countdownTimeout = null;
	}
}

function scheduleCountdownFinalize(): void {
	clearCountdownTimer();
	const endsAt = gameState.countdownEndsAt;
	if (endsAt == null) return;
	const ms = Math.max(0, endsAt - Date.now());
	countdownTimeout = setTimeout(() => {
		countdownTimeout = null;
		finalizeAfterCountdown();
	}, ms);
}

function notifyListeners() {
	listeners.forEach(({ callback }) => {
		callback(gameState);
	});
}

export function subscribe(id: string, role: Role, callback: Listener): () => void {
	listeners.set(id, { callback, role });
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

export function setTheme(theme: Theme): void {
	gameState.theme = theme;
	notifyListeners();
}

export function getUserView(): UserViewState {
	return {
		adminConnected: gameState.adminConnected,
		userConnected: gameState.userConnected,
		userChoice: gameState.userChoice,
		phase: gameState.phase,
		theme: gameState.theme,
		countdownStartedAt: gameState.countdownStartedAt,
		countdownEndsAt: gameState.countdownEndsAt,
		lastResult: gameState.lastResult
			? {
					outcome: gameState.lastResult.displayedOutcome,
					adminChoice: gameState.lastResult.adminChoice,
					userChoice: gameState.lastResult.userChoice,
					...(gameState.lastResult.decoyAdminChoice != null
						? { decoyAdminChoice: gameState.lastResult.decoyAdminChoice }
						: {})
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

	if (gameState.adminConnected && gameState.userConnected) {
		if (gameState.phase === 'waiting') {
			gameState.phase = 'playing';
		}
	}

	notifyListeners();
	return { success: true };
}

function clearRoundProgress(): void {
	clearCountdownTimer();
	gameState.userChoice = null;
	gameState.adminChoice = null;
	gameState.adminReady = false;
	gameState.pendingCheatMode = null;
	gameState.countdownStartedAt = null;
	gameState.countdownEndsAt = null;
	gameState.lastResult = null;
}

export function leaveGame(role: Role): void {
	clearCountdownTimer();
	if (role === 'admin') {
		gameState.adminConnected = false;
	} else {
		gameState.userConnected = false;
	}

	if (!gameState.adminConnected || !gameState.userConnected) {
		gameState.phase = 'waiting';
		clearRoundProgress();
	}

	notifyListeners();
}

export function submitChoice(role: Role, choice: Choice): { success: boolean; error?: string } {
	if (role !== 'user') {
		return { success: false, error: 'Only the user submits via this endpoint' };
	}
	if (gameState.phase !== 'playing') {
		return { success: false, error: 'Game not in playing phase' };
	}
	if (gameState.userChoice != null) {
		return { success: false, error: 'Choice already locked' };
	}

	gameState.userChoice = choice;
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

/** Bot plays this → user wins (for reactive decoy). */
function getLosingChoiceForBot(userChoice: Choice): Choice {
	const map: Record<Choice, Choice> = {
		rock: 'scissors',
		paper: 'rock',
		scissors: 'paper'
	};
	return map[userChoice];
}

function beginCountdown(): void {
	const now = Date.now();
	gameState.phase = 'countdown';
	gameState.countdownStartedAt = now;
	gameState.countdownEndsAt = now + COUNTDOWN_TOTAL_MS;
	scheduleCountdownFinalize();
}

export function setAdminReady(
	cheatMode: CheatMode,
	adminChoice: Choice | undefined
): { success: boolean; error?: string } {
	if (gameState.phase !== 'playing') {
		return { success: false, error: 'Game not in playing phase' };
	}
	if (!gameState.userChoice) {
		return { success: false, error: 'Participant has not chosen yet' };
	}
	if (gameState.adminReady) {
		return { success: false, error: 'Already locked in for this round' };
	}

	if (cheatMode === 'reactive') {
		if (adminChoice != null) {
			return { success: false, error: 'Reactive mode does not take a hand choice' };
		}
		gameState.adminChoice = null;
	} else {
		if (!adminChoice) {
			return { success: false, error: 'Hand choice required for this mode' };
		}
		gameState.adminChoice = adminChoice;
	}

	gameState.pendingCheatMode = cheatMode;
	gameState.adminReady = true;

	beginCountdown();
	notifyListeners();
	return { success: true };
}

function finalizeAfterCountdown(): void {
	if (gameState.phase !== 'countdown') {
		return;
	}
	const cheatMode = gameState.pendingCheatMode;
	const userChoice = gameState.userChoice;
	if (!cheatMode || !userChoice) {
		gameState.phase = 'playing';
		gameState.adminReady = false;
		gameState.pendingCheatMode = null;
		gameState.countdownStartedAt = null;
		gameState.countdownEndsAt = null;
		notifyListeners();
		return;
	}

	let finalAdminChoice: Choice;
	let decoyAdminChoice: Choice | undefined;
	let trueOutcome: Outcome;
	let displayedOutcome: Outcome;

	if (cheatMode === 'reactive') {
		finalAdminChoice = getWinningChoice(userChoice);
		decoyAdminChoice = getLosingChoiceForBot(userChoice);
		trueOutcome = calculateOutcome(userChoice, finalAdminChoice);
		displayedOutcome = 'admin';
		gameState.stats.cheatsUsed++;
	} else {
		const committed = gameState.adminChoice;
		if (!committed) {
			gameState.phase = 'playing';
			gameState.adminReady = false;
			gameState.pendingCheatMode = null;
			gameState.countdownStartedAt = null;
			gameState.countdownEndsAt = null;
			notifyListeners();
			return;
		}
		finalAdminChoice = committed;
		trueOutcome = calculateOutcome(userChoice, finalAdminChoice);

		if (cheatMode === 'fair') {
			displayedOutcome = trueOutcome;
		} else {
			displayedOutcome = 'admin';
			gameState.stats.cheatsUsed++;
		}
	}

	gameState.adminChoice = finalAdminChoice;
	gameState.lastResult = {
		trueOutcome,
		displayedOutcome,
		cheatMode,
		adminChoice: finalAdminChoice,
		userChoice,
		...(decoyAdminChoice != null ? { decoyAdminChoice } : {})
	};
	gameState.phase = 'resolved';
	gameState.pendingCheatMode = null;
	gameState.adminReady = false;
	gameState.countdownStartedAt = null;
	gameState.countdownEndsAt = null;

	if (trueOutcome === 'admin') {
		gameState.stats.adminWins++;
	} else if (trueOutcome === 'user') {
		gameState.stats.userWins++;
	} else {
		gameState.stats.ties++;
	}

	notifyListeners();
}

export function resetRound(): { success: boolean; error?: string } {
	if (gameState.phase !== 'resolved') {
		return { success: false, error: 'Cannot reset, round not resolved' };
	}

	clearCountdownTimer();
	gameState.userChoice = null;
	gameState.adminChoice = null;
	gameState.lastResult = null;
	gameState.adminReady = false;
	gameState.pendingCheatMode = null;
	gameState.countdownStartedAt = null;
	gameState.countdownEndsAt = null;
	gameState.phase = 'playing';

	notifyListeners();
	return { success: true };
}

export function resetGame(): void {
	clearCountdownTimer();
	gameState = {
		adminConnected: false,
		userConnected: false,
		userChoice: null,
		adminChoice: null,
		phase: 'waiting',
		lastResult: null,
		theme: gameState.theme,
		adminReady: false,
		pendingCheatMode: null,
		countdownStartedAt: null,
		countdownEndsAt: null,
		stats: {
			adminWins: 0,
			userWins: 0,
			ties: 0,
			cheatsUsed: 0
		}
	};
	notifyListeners();
}
