-- Migration 001: Initial Database Schema
-- Created: 2025-06-04
-- Description: Creates the initial database schema for the Jinro (Werewolf) game

-- ゲーム基本情報テーブル
CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL CHECK (status IN ('waiting', 'day_phase', 'night_phase', 'finished')),
    current_phase TEXT CHECK (current_phase IN ('discussion', 'voting', 'action', 'consultation')),
    day_count INTEGER DEFAULT 0,
    game_config JSON NOT NULL,
    phase_start_time DATETIME,
    phase_timeout_seconds INTEGER,
    winner_team TEXT CHECK (winner_team IN ('village', 'werewolf') OR winner_team IS NULL),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- プレイヤー情報テーブル
CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    name TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('villager', 'fortune_teller', 'medium', 'werewolf', 'madman')),
    status TEXT NOT NULL DEFAULT 'alive' CHECK (status IN ('alive', 'dead')),
    death_day INTEGER NULL,
    death_cause TEXT NULL CHECK (death_cause IN ('executed', 'killed') OR death_cause IS NULL),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- メッセージログテーブル
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    player_name TEXT NOT NULL,
    message TEXT NOT NULL,
    phase TEXT NOT NULL CHECK (phase IN ('day', 'night')),
    phase_detail TEXT CHECK (phase_detail IN ('discussion', 'consultation') OR phase_detail IS NULL),
    target TEXT NOT NULL DEFAULT 'all' CHECK (target IN ('all', 'werewolf')),
    day_count INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- プレイヤーアクションテーブル
CREATE TABLE IF NOT EXISTS actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    player_token TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('divine', 'kill', 'vote', 'speak')),
    target_player TEXT,
    result JSON,
    day_count INTEGER NOT NULL,
    phase TEXT NOT NULL CHECK (phase IN ('day', 'night')),
    success BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (player_token) REFERENCES players(token)
);

-- フェーズ履歴テーブル（デバッグ・観戦用）
CREATE TABLE IF NOT EXISTS phase_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    phase TEXT NOT NULL CHECK (phase IN ('day_discussion', 'day_voting', 'night_action', 'night_consultation')),
    day_count INTEGER NOT NULL,
    phase_results JSON,
    started_at DATETIME NOT NULL,
    ended_at DATETIME,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_players_game_id ON players(game_id);
CREATE INDEX IF NOT EXISTS idx_players_token ON players(token);
CREATE INDEX IF NOT EXISTS idx_players_game_status ON players(game_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_game_id ON messages(game_id);
CREATE INDEX IF NOT EXISTS idx_messages_phase ON messages(game_id, day_count, phase);
CREATE INDEX IF NOT EXISTS idx_messages_target ON messages(game_id, target, phase);
CREATE INDEX IF NOT EXISTS idx_actions_game_player ON actions(game_id, player_token);
CREATE INDEX IF NOT EXISTS idx_actions_type_day ON actions(game_id, action_type, day_count);
CREATE INDEX IF NOT EXISTS idx_actions_phase ON actions(game_id, phase, day_count);
CREATE INDEX IF NOT EXISTS idx_phase_history_game ON phase_history(game_id, day_count);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_game_player ON players(game_id, name);
CREATE INDEX IF NOT EXISTS idx_phase_history_order ON phase_history(game_id, day_count, started_at);

-- トリガー作成
CREATE TRIGGER IF NOT EXISTS update_games_timestamp 
AFTER UPDATE ON games
BEGIN
    UPDATE games SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;