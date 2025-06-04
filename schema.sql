-- Jinro (Werewolf) Game Database Schema
-- SQLite schema for LLM-powered werewolf game

-- ゲーム基本情報
CREATE TABLE games (
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

-- プレイヤー情報
CREATE TABLE players (
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

-- メッセージログ
CREATE TABLE messages (
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

-- プレイヤーアクション
CREATE TABLE actions (
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

-- フェーズ履歴（デバッグ・観戦用）
CREATE TABLE phase_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    phase TEXT NOT NULL CHECK (phase IN ('day_discussion', 'day_voting', 'night_action', 'night_consultation')),
    day_count INTEGER NOT NULL,
    phase_results JSON,
    started_at DATETIME NOT NULL,
    ended_at DATETIME,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- パフォーマンス向上のためのインデックス
CREATE INDEX idx_players_game_id ON players(game_id);
CREATE INDEX idx_players_token ON players(token);
CREATE INDEX idx_players_game_status ON players(game_id, status);
CREATE INDEX idx_messages_game_id ON messages(game_id);
CREATE INDEX idx_messages_phase ON messages(game_id, day_count, phase);
CREATE INDEX idx_messages_target ON messages(game_id, target, phase);
CREATE INDEX idx_actions_game_player ON actions(game_id, player_token);
CREATE INDEX idx_actions_type_day ON actions(game_id, action_type, day_count);
CREATE INDEX idx_actions_phase ON actions(game_id, phase, day_count);
CREATE INDEX idx_phase_history_game ON phase_history(game_id, day_count);

-- ゲーム状態更新のトリガー
CREATE TRIGGER update_games_timestamp 
AFTER UPDATE ON games
BEGIN
    UPDATE games SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- データ整合性を保つための制約追加
CREATE UNIQUE INDEX idx_unique_game_player ON players(game_id, name);
CREATE INDEX idx_phase_history_order ON phase_history(game_id, day_count, started_at);