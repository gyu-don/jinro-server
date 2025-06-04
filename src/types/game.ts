export type PlayerRole = 
  | 'villager'
  | 'fortune_teller'
  | 'medium'
  | 'werewolf'
  | 'madman';

export type PlayerStatus = 'alive' | 'dead';

export type GamePhase = 
  | 'waiting'
  | 'night'
  | 'day_discussion'
  | 'day_voting'
  | 'finished';

export type GameTeam = 'village' | 'werewolf';

export interface Player {
  name: string;
  token: string;
  role: PlayerRole;
  status: PlayerStatus;
  team: GameTeam;
}

export interface GameConfig {
  villagers: number;
  fortune_teller: number;
  medium?: number;
  werewolves: number;
  madman: number;
}

export interface GameState {
  id: string;
  status: GamePhase;
  dayCount: number;
  players: Player[];
  config: GameConfig;
  timeRemaining: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  gameId: string;
  speaker: string;
  message: string;
  timestamp: Date;
  phase: GamePhase;
  target: 'all' | 'werewolf';
}

export interface Action {
  id: string;
  gameId: string;
  player: string;
  actionType: 'divine' | 'kill' | 'vote';
  target: string;
  timestamp: Date;
  result?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}