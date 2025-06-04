// Data Access Object for Games table

import { dbConnection } from '../connection';
import type {
  Game,
  GameRow,
  CreateGameData,
  UpdateGameData,
  GameConfig
} from '../../types/database';

export class GamesDAO {
  private db = dbConnection.getDatabase();

  // Convert database row to Game object
  private rowToGame(row: GameRow): Game {
    return {
      ...row,
      game_config: JSON.parse(row.game_config) as GameConfig
    };
  }

  // Convert Game object to database row
  private gameToRow(game: Game | CreateGameData): Omit<GameRow, 'created_at' | 'updated_at'> {
    return {
      ...game,
      game_config: JSON.stringify(game.game_config)
    } as Omit<GameRow, 'created_at' | 'updated_at'>;
  }

  public create(gameData: CreateGameData): Game {
    const row = this.gameToRow(gameData);
    const stmt = this.db.prepare(`
      INSERT INTO games (
        id, status, current_phase, day_count, game_config,
        phase_start_time, phase_timeout_seconds, winner_team
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      row.id,
      row.status,
      row.current_phase,
      row.day_count,
      row.game_config,
      row.phase_start_time,
      row.phase_timeout_seconds,
      row.winner_team
    );

    return this.findById(gameData.id)!;
  }

  public findById(id: string): Game | null {
    const stmt = this.db.prepare('SELECT * FROM games WHERE id = ?');
    const row = stmt.get(id) as GameRow | undefined;
    return row ? this.rowToGame(row) : null;
  }

  public findAll(): Game[] {
    const stmt = this.db.prepare('SELECT * FROM games ORDER BY created_at DESC');
    const rows = stmt.all() as GameRow[];
    return rows.map(row => this.rowToGame(row));
  }

  public findByStatus(status: string): Game[] {
    const stmt = this.db.prepare('SELECT * FROM games WHERE status = ? ORDER BY created_at DESC');
    const rows = stmt.all(status) as GameRow[];
    return rows.map(row => this.rowToGame(row));
  }

  public update(id: string, updateData: UpdateGameData): Game | null {
    const currentGame = this.findById(id);
    if (!currentGame) {
      return null;
    }

    const updatedGame = { ...currentGame, ...updateData };
    const row = this.gameToRow(updatedGame);

    const stmt = this.db.prepare(`
      UPDATE games SET
        status = ?,
        current_phase = ?,
        day_count = ?,
        game_config = ?,
        phase_start_time = ?,
        phase_timeout_seconds = ?,
        winner_team = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const result = stmt.run(
      row.status,
      row.current_phase,
      row.day_count,
      row.game_config,
      row.phase_start_time,
      row.phase_timeout_seconds,
      row.winner_team,
      id
    );

    return result.changes > 0 ? this.findById(id) : null;
  }

  public delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM games WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  public updatePhase(id: string, phase: string, phaseStartTime: string, timeoutSeconds: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE games SET
        current_phase = ?,
        phase_start_time = ?,
        phase_timeout_seconds = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const result = stmt.run(phase, phaseStartTime, timeoutSeconds, id);
    return result.changes > 0;
  }

  public incrementDay(id: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE games SET
        day_count = day_count + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const result = stmt.run(id);
    return result.changes > 0;
  }

  public finishGame(id: string, winnerTeam: 'village' | 'werewolf'): boolean {
    const stmt = this.db.prepare(`
      UPDATE games SET
        status = 'finished',
        winner_team = ?,
        current_phase = NULL,
        phase_start_time = NULL,
        phase_timeout_seconds = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const result = stmt.run(winnerTeam, id);
    return result.changes > 0;
  }

  // Get games that have timed out
  public findTimedOutGames(): Game[] {
    const stmt = this.db.prepare(`
      SELECT * FROM games 
      WHERE status IN ('day_phase', 'night_phase')
        AND phase_start_time IS NOT NULL
        AND phase_timeout_seconds IS NOT NULL
        AND datetime(phase_start_time, '+' || phase_timeout_seconds || ' seconds') <= datetime('now')
    `);

    const rows = stmt.all() as GameRow[];
    return rows.map(row => this.rowToGame(row));
  }
}