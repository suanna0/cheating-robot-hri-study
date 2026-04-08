export type Choice = 'rock' | 'paper' | 'scissors';
export type Outcome = 'admin' | 'user' | 'tie';
export type CheatMode = 'fair' | 'false-win' | 'reactive';
export type Phase = 'waiting' | 'playing' | 'resolved';
export type Role = 'admin' | 'user';

export interface RoundResult {
	trueOutcome: Outcome;
	displayedOutcome: Outcome;
	cheatMode: CheatMode;
	adminChoice: Choice;
	userChoice: Choice;
}

export interface Stats {
	adminWins: number;
	userWins: number;
	ties: number;
	cheatsUsed: number;
}

export interface GameState {
	adminConnected: boolean;
	userConnected: boolean;
	userChoice: Choice | null;
	adminChoice: Choice | null;
	phase: Phase;
	lastResult: RoundResult | null;
	stats: Stats;
}

export interface AdminViewState extends GameState {
	// Admin sees everything
}

export interface UserViewState {
	adminConnected: boolean;
	userConnected: boolean;
	userChoice: Choice | null;
	phase: Phase;
	lastResult: {
		outcome: Outcome; // What the user is told (possibly fake)
		adminChoice: Choice; // What admin "played" (possibly fake for reactive cheat)
		userChoice: Choice;
	} | null;
}

export interface SSEMessage {
	type: 'state' | 'error';
	data: AdminViewState | UserViewState;
	role: Role;
}
