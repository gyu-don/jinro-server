// Data Access Object for Actions table

import { dbConnection } from '../connection';
import type {
  Action,
  ActionRow,
  CreateActionData,
  ActionType,
  ActionPhase,
  ActionResult
} from '../../types/database';

export class ActionsDAO {
  private db = dbConnection.getDatabase();

  // Convert database row to Action object
  private rowToAction(row: ActionRow): Action {
    return {
      ...row,
      result: row.result ? JSON.parse(row.result) as ActionResult : null
    };
  }

  // Convert Action object to database row
  private actionToRow(action: Action | CreateActionData): Omit<ActionRow, 'id' | 'created_at'> {
    return {
      ...action,
      result: action.result ? JSON.stringify(action.result) : null
    } as Omit<ActionRow, 'id' | 'created_at'>;
  }

  public create(actionData: CreateActionData): Action {
    const row = this.actionToRow(actionData);
    const stmt = this.db.prepare(`
      INSERT INTO actions (
        game_id, player_token, action_type, target_player, result, day_count, phase, success
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      row.game_id,
      row.player_token,
      row.action_type,
      row.target_player,
      row.result,
      row.day_count,
      row.phase,
      row.success
    );

    return this.findById(result.lastInsertRowid as number)!;
  }

  public findById(id: number): Action | null {
    const stmt = this.db.prepare('SELECT * FROM actions WHERE id = ?');
    const row = stmt.get(id) as ActionRow | undefined;
    return row ? this.rowToAction(row) : null;
  }

  public findByGameId(gameId: string): Action[] {
    const stmt = this.db.prepare('SELECT * FROM actions WHERE game_id = ? ORDER BY created_at');
    const rows = stmt.all(gameId) as ActionRow[];
    return rows.map(row => this.rowToAction(row));
  }

  public findByPlayerToken(playerToken: string): Action[] {
    const stmt = this.db.prepare('SELECT * FROM actions WHERE player_token = ? ORDER BY created_at');
    const rows = stmt.all(playerToken) as ActionRow[];
    return rows.map(row => this.rowToAction(row));
  }

  public findByGameAndPlayer(gameId: string, playerToken: string): Action[] {
    const stmt = this.db.prepare('SELECT * FROM actions WHERE game_id = ? AND player_token = ? ORDER BY created_at');
    const rows = stmt.all(gameId, playerToken) as ActionRow[];
    return rows.map(row => this.rowToAction(row));
  }

  public findByActionType(gameId: string, actionType: ActionType, day?: number): Action[] {
    let sql = 'SELECT * FROM actions WHERE game_id = ? AND action_type = ?';
    const params: (string | number)[] = [gameId, actionType];

    if (day !== undefined) {
      sql += ' AND day_count = ?';
      params.push(day);
    }

    sql += ' ORDER BY created_at';

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as ActionRow[];
    return rows.map(row => this.rowToAction(row));
  }

  public findByPhase(gameId: string, phase: ActionPhase, day?: number): Action[] {
    let sql = 'SELECT * FROM actions WHERE game_id = ? AND phase = ?';
    const params: (string | number)[] = [gameId, phase];

    if (day !== undefined) {
      sql += ' AND day_count = ?';
      params.push(day);
    }

    sql += ' ORDER BY created_at';

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as ActionRow[];
    return rows.map(row => this.rowToAction(row));
  }

  public findByDay(gameId: string, day: number): Action[] {
    const stmt = this.db.prepare('SELECT * FROM actions WHERE game_id = ? AND day_count = ? ORDER BY created_at');
    const rows = stmt.all(gameId, day) as ActionRow[];
    return rows.map(row => this.rowToAction(row));
  }

  public delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM actions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  public deleteByGameId(gameId: string): number {
    const stmt = this.db.prepare('DELETE FROM actions WHERE game_id = ?');
    const result = stmt.run(gameId);
    return result.changes;
  }

  // Specific action queries
  public findDivineActions(gameId: string, playerToken?: string, day?: number): Action[] {
    let sql = 'SELECT * FROM actions WHERE game_id = ? AND action_type = ?';
    const params: (string | number)[] = [gameId, 'divine'];

    if (playerToken) {
      sql += ' AND player_token = ?';
      params.push(playerToken);
    }

    if (day !== undefined) {
      sql += ' AND day_count = ?';
      params.push(day);
    }

    sql += ' ORDER BY created_at';

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as ActionRow[];
    return rows.map(row => this.rowToAction(row));
  }

  public findKillActions(gameId: string, day?: number): Action[] {
    return this.findByActionType(gameId, 'kill', day);
  }

  public findVoteActions(gameId: string, day?: number): Action[] {
    return this.findByActionType(gameId, 'vote', day);
  }

  public findSpeakActions(gameId: string, playerToken?: string, day?: number): Action[] {
    let sql = 'SELECT * FROM actions WHERE game_id = ? AND action_type = ?';
    const params: (string | number)[] = [gameId, 'speak'];

    if (playerToken) {
      sql += ' AND player_token = ?';
      params.push(playerToken);
    }

    if (day !== undefined) {
      sql += ' AND day_count = ?';
      params.push(day);
    }

    sql += ' ORDER BY created_at';

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as ActionRow[];
    return rows.map(row => this.rowToAction(row));
  }

  // Check if a player has already performed a specific action in the current day/phase
  public hasPlayerActed(gameId: string, playerToken: string, actionType: ActionType, day: number, phase: ActionPhase): boolean {
    const stmt = this.db.prepare(`
      SELECT 1 FROM actions 
      WHERE game_id = ? AND player_token = ? AND action_type = ? AND day_count = ? AND phase = ? AND success = TRUE
    `);
    const row = stmt.get(gameId, playerToken, actionType, day, phase);
    return !!row;
  }

  // Get vote results for a day
  public getVoteResults(gameId: string, day: number): Record<string, string[]> {
    const voteActions = this.findVoteActions(gameId, day);
    const results: Record<string, string[]> = {};

    for (const action of voteActions) {
      if (action.target_player && action.success) {
        if (!results[action.target_player]) {
          results[action.target_player] = [];
        }
        // Note: We need to get player name from token
        // This might require joining with players table or storing voter name
        results[action.target_player].push(action.player_token);
      }
    }

    return results;
  }

  // Get kill target for a night
  public getKillTarget(gameId: string, day: number): string | null {
    const killActions = this.findKillActions(gameId, day);
    const successfulKill = killActions.find(action => action.success);
    return successfulKill?.target_player || null;
  }

  // Get divine results for a player
  public getDivineResults(gameId: string, playerToken: string): Action[] {
    return this.findDivineActions(gameId, playerToken);
  }

  // Count actions by type and day
  public countActions(gameId: string, actionType: ActionType, day?: number): number {
    let sql = 'SELECT COUNT(*) as count FROM actions WHERE game_id = ? AND action_type = ?';
    const params: (string | number)[] = [gameId, actionType];

    if (day !== undefined) {
      sql += ' AND day_count = ?';
      params.push(day);
    }

    const stmt = this.db.prepare(sql);
    const row = stmt.get(...params) as { count: number };
    return row.count;
  }

  // Get action statistics for a game
  public getActionStats(gameId: string): {
    total: number;
    by_type: Record<ActionType, number>;
    by_phase: Record<ActionPhase, number>;
    by_day: Record<number, number>;
  } {
    // Total actions
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM actions WHERE game_id = ?');
    const totalRow = totalStmt.get(gameId) as { count: number };

    // By type
    const typeStmt = this.db.prepare('SELECT action_type, COUNT(*) as count FROM actions WHERE game_id = ? GROUP BY action_type');
    const typeRows = typeStmt.all(gameId) as { action_type: ActionType; count: number }[];
    const byType: Record<ActionType, number> = { divine: 0, kill: 0, vote: 0, speak: 0 };
    for (const row of typeRows) {
      byType[row.action_type] = row.count;
    }

    // By phase
    const phaseStmt = this.db.prepare('SELECT phase, COUNT(*) as count FROM actions WHERE game_id = ? GROUP BY phase');
    const phaseRows = phaseStmt.all(gameId) as { phase: ActionPhase; count: number }[];
    const byPhase: Record<ActionPhase, number> = { day: 0, night: 0 };
    for (const row of phaseRows) {
      byPhase[row.phase] = row.count;
    }

    // By day
    const dayStmt = this.db.prepare('SELECT day_count, COUNT(*) as count FROM actions WHERE game_id = ? GROUP BY day_count');
    const dayRows = dayStmt.all(gameId) as { day_count: number; count: number }[];
    const byDay: Record<number, number> = {};
    for (const row of dayRows) {
      byDay[row.day_count] = row.count;
    }

    return {
      total: totalRow.count,
      by_type: byType,
      by_phase: byPhase,
      by_day: byDay
    };
  }
}