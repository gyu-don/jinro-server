// Database type definitions for Jinro (Werewolf) game

export type GameStatus = 'waiting' | 'day_phase' | 'night_phase' | 'finished';
export type GamePhase = 'discussion' | 'voting' | 'action' | 'consultation';
export type WinnerTeam = 'village' | 'werewolf' | null;

export type PlayerRole = 'villager' | 'fortune_teller' | 'medium' | 'werewolf' | 'madman';
export type PlayerStatus = 'alive' | 'dead';
export type DeathCause = 'executed' | 'killed' | null;

export type MessagePhase = 'day' | 'night';
export type MessagePhaseDetail = 'discussion' | 'consultation' | null;
export type MessageTarget = 'all' | 'werewolf';

export type ActionType = 'divine' | 'kill' | 'vote' | 'speak';
export type ActionPhase = 'day' | 'night';

export type PhaseHistoryType = 'day_discussion' | 'day_voting' | 'night_action' | 'night_consultation';

// Game configuration JSON structure
export interface GameConfig {
  player_count: number;
  roles: {
    villager: number;
    fortune_teller: number;
    medium?: number;
    werewolf: number;
    madman: number;
  };
  timeouts: {
    day_discussion: number;
    day_voting: number;
    night_action: number;
    night_consultation: number;
  };
  limits: {
    day_speaks_per_player: number;
    night_werewolf_speaks: number;
  };
}

// Action result structures
export interface DivineResult {
  action: 'divine';
  target: string;
  result: 'villager' | 'werewolf';
}

export interface KillResult {
  action: 'kill';
  target: string;
}

export interface VoteResult {
  action: 'vote';
  target: string;
}

export interface MediumResult {
  action: 'medium';
  target: string;
  result: 'villager' | 'werewolf';
}

export type ActionResult = DivineResult | KillResult | VoteResult | MediumResult;

// Phase results structures
export interface VotingPhaseResult {
  phase: 'day_voting';
  votes: Record<string, string>;
  executed: string | null;
  vote_counts: Record<string, number>;
}

export interface NightActionResult {
  phase: 'night_action';
  killed: string | null;
  divine_results?: DivineResult[];
  medium_results?: MediumResult[];
}

export interface DiscussionPhaseResult {
  phase: 'day_discussion';
  message_count: number;
  participants: string[];
}

export interface ConsultationPhaseResult {
  phase: 'night_consultation';
  message_count: number;
  participants: string[];
}

export type PhaseResult = VotingPhaseResult | NightActionResult | DiscussionPhaseResult | ConsultationPhaseResult;

// Database table interfaces
export interface Game {
  id: string;
  status: GameStatus;
  current_phase: GamePhase | null;
  day_count: number;
  game_config: GameConfig;
  phase_start_time: string | null;
  phase_timeout_seconds: number | null;
  winner_team: WinnerTeam;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: number;
  game_id: string;
  name: string;
  token: string;
  role: PlayerRole;
  status: PlayerStatus;
  death_day: number | null;
  death_cause: DeathCause;
  created_at: string;
}

export interface Message {
  id: number;
  game_id: string;
  player_name: string;
  message: string;
  phase: MessagePhase;
  phase_detail: MessagePhaseDetail;
  target: MessageTarget;
  day_count: number;
  created_at: string;
}

export interface Action {
  id: number;
  game_id: string;
  player_token: string;
  action_type: ActionType;
  target_player: string | null;
  result: ActionResult | null;
  day_count: number;
  phase: ActionPhase;
  success: boolean;
  created_at: string;
}

export interface PhaseHistory {
  id: number;
  game_id: string;
  phase: PhaseHistoryType;
  day_count: number;
  phase_results: PhaseResult | null;
  started_at: string;
  ended_at: string | null;
}

// Database row types (as returned by SQLite)
export interface GameRow extends Omit<Game, 'game_config'> {
  game_config: string; // JSON string
}

export interface ActionRow extends Omit<Action, 'result'> {
  result: string | null; // JSON string
}

export interface PhaseHistoryRow extends Omit<PhaseHistory, 'phase_results'> {
  phase_results: string | null; // JSON string
}

// Utility types for creating records
export type CreateGameData = Omit<Game, 'id' | 'created_at' | 'updated_at'>;
export type CreatePlayerData = Omit<Player, 'id' | 'created_at'>;
export type CreateMessageData = Omit<Message, 'id' | 'created_at'>;
export type CreateActionData = Omit<Action, 'id' | 'created_at'>;
export type CreatePhaseHistoryData = Omit<PhaseHistory, 'id'>;

// Update types
export type UpdateGameData = Partial<Omit<Game, 'id' | 'created_at' | 'updated_at'>>;
export type UpdatePlayerData = Partial<Omit<Player, 'id' | 'game_id' | 'token' | 'created_at'>>;
export type UpdatePhaseHistoryData = Partial<Pick<PhaseHistory, 'ended_at' | 'phase_results'>>;