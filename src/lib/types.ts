export type Choice = 'rock' | 'paper' | 'scissors';
export type Outcome = 'admin' | 'user' | 'tie';
export type CheatMode = 'fair' | 'false-win' | 'reactive';
export type Phase = 'waiting' | 'playing' | 'countdown' | 'resolved';
export type Role = 'admin' | 'user';
export type Theme = 'nico' | 'nica';

export interface RoundResult {
	trueOutcome: Outcome;
	displayedOutcome: Outcome;
	cheatMode: CheatMode;
	adminChoice: Choice;
	userChoice: Choice;
	/** First-frame bot hand for reactive cheat (user sees this before correction). */
	decoyAdminChoice?: Choice;
}

export interface Stats {
	adminWins: number;
	userWins: number;
	ties: number;
	cheatsUsed: number;
	gamesPlayed: number;
}

export interface GameState {
	adminConnected: boolean;
	userConnected: boolean;
	userChoice: Choice | null;
	adminChoice: Choice | null;
	phase: Phase;
	lastResult: RoundResult | null;
	stats: Stats;
	theme: Theme;
	adminReady: boolean;
	pendingCheatMode: CheatMode | null;
	countdownStartedAt: number | null;
	countdownEndsAt: number | null;
}

export interface AdminViewState extends GameState {
	// Admin sees everything
}

export interface UserViewState {
	adminConnected: boolean;
	userConnected: boolean;
	userChoice: Choice | null;
	phase: Phase;
	theme: Theme;
	countdownStartedAt: number | null;
	countdownEndsAt: number | null;
	lastResult: {
		outcome: Outcome;
		adminChoice: Choice;
		userChoice: Choice;
		decoyAdminChoice?: Choice;
	} | null;
}

export interface SSEMessage {
	type: 'state' | 'error';
	data: AdminViewState | UserViewState;
	role: Role;
}
