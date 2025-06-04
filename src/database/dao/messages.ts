// Data Access Object for Messages table

import { dbConnection } from '../connection';
import type {
  Message,
  CreateMessageData,
  MessagePhase,
  MessageTarget
} from '../../types/database';

export class MessagesDAO {
  private db = dbConnection.getDatabase();

  public create(messageData: CreateMessageData): Message {
    const stmt = this.db.prepare(`
      INSERT INTO messages (
        game_id, player_name, message, phase, phase_detail, target, day_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      messageData.game_id,
      messageData.player_name,
      messageData.message,
      messageData.phase,
      messageData.phase_detail,
      messageData.target,
      messageData.day_count
    );

    return this.findById(result.lastInsertRowid as number)!;
  }

  public findById(id: number): Message | null {
    const stmt = this.db.prepare('SELECT * FROM messages WHERE id = ?');
    const row = stmt.get(id) as Message | undefined;
    return row || null;
  }

  public findByGameId(gameId: string): Message[] {
    const stmt = this.db.prepare('SELECT * FROM messages WHERE game_id = ? ORDER BY created_at');
    const rows = stmt.all(gameId) as Message[];
    return rows;
  }

  public findByGameIdAndPhase(gameId: string, phase: MessagePhase, day?: number): Message[] {
    let sql = 'SELECT * FROM messages WHERE game_id = ? AND phase = ?';
    const params: (string | number)[] = [gameId, phase];

    if (day !== undefined) {
      sql += ' AND day_count = ?';
      params.push(day);
    }

    sql += ' ORDER BY created_at';

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as Message[];
    return rows;
  }

  public findByGameIdAndTarget(gameId: string, target: MessageTarget, phase?: MessagePhase, day?: number): Message[] {
    let sql = 'SELECT * FROM messages WHERE game_id = ? AND target = ?';
    const params: (string | number)[] = [gameId, target];

    if (phase !== undefined) {
      sql += ' AND phase = ?';
      params.push(phase);
    }

    if (day !== undefined) {
      sql += ' AND day_count = ?';
      params.push(day);
    }

    sql += ' ORDER BY created_at';

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as Message[];
    return rows;
  }

  public findByPlayer(gameId: string, playerName: string): Message[] {
    const stmt = this.db.prepare('SELECT * FROM messages WHERE game_id = ? AND player_name = ? ORDER BY created_at');
    const rows = stmt.all(gameId, playerName) as Message[];
    return rows;
  }

  public findPublicMessages(gameId: string, day?: number): Message[] {
    return this.findByGameIdAndTarget(gameId, 'all', 'day', day);
  }

  public findWerewolfMessages(gameId: string, day?: number): Message[] {
    return this.findByGameIdAndTarget(gameId, 'werewolf', 'night', day);
  }

  public delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM messages WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  public deleteByGameId(gameId: string): number {
    const stmt = this.db.prepare('DELETE FROM messages WHERE game_id = ?');
    const result = stmt.run(gameId);
    return result.changes;
  }

  // Count messages by player in current day/phase
  public countPlayerMessagesInPhase(gameId: string, playerName: string, phase: MessagePhase, day: number, target?: MessageTarget): number {
    let sql = 'SELECT COUNT(*) as count FROM messages WHERE game_id = ? AND player_name = ? AND phase = ? AND day_count = ?';
    const params: (string | number)[] = [gameId, playerName, phase, day];

    if (target !== undefined) {
      sql += ' AND target = ?';
      params.push(target);
    }

    const stmt = this.db.prepare(sql);
    const row = stmt.get(...params) as { count: number };
    return row.count;
  }

  // Get message count for werewolf consultation in current night
  public getWerewolfConsultationCount(gameId: string, day: number): number {
    return this.countPlayerMessagesInPhase(gameId, '', 'night', day, 'werewolf');
  }

  // Get all messages for a specific day
  public findByDay(gameId: string, day: number): Message[] {
    const stmt = this.db.prepare('SELECT * FROM messages WHERE game_id = ? AND day_count = ? ORDER BY created_at');
    const rows = stmt.all(gameId, day) as Message[];
    return rows;
  }

  // Get messages since a specific timestamp
  public findSince(gameId: string, since: string): Message[] {
    const stmt = this.db.prepare('SELECT * FROM messages WHERE game_id = ? AND created_at > ? ORDER BY created_at');
    const rows = stmt.all(gameId, since) as Message[];
    return rows;
  }

  // Get recent messages (last N messages)
  public findRecent(gameId: string, limit: number = 50): Message[] {
    const stmt = this.db.prepare('SELECT * FROM messages WHERE game_id = ? ORDER BY created_at DESC LIMIT ?');
    const rows = stmt.all(gameId, limit) as Message[];
    return rows.reverse(); // Return in chronological order
  }

  // Get message statistics for a game
  public getMessageStats(gameId: string): {
    total: number;
    by_phase: Record<MessagePhase, number>;
    by_target: Record<MessageTarget, number>;
    by_player: Record<string, number>;
  } {
    // Total messages
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM messages WHERE game_id = ?');
    const totalRow = totalStmt.get(gameId) as { count: number };

    // By phase
    const phaseStmt = this.db.prepare('SELECT phase, COUNT(*) as count FROM messages WHERE game_id = ? GROUP BY phase');
    const phaseRows = phaseStmt.all(gameId) as { phase: MessagePhase; count: number }[];
    const byPhase: Record<MessagePhase, number> = { day: 0, night: 0 };
    for (const row of phaseRows) {
      byPhase[row.phase] = row.count;
    }

    // By target
    const targetStmt = this.db.prepare('SELECT target, COUNT(*) as count FROM messages WHERE game_id = ? GROUP BY target');
    const targetRows = targetStmt.all(gameId) as { target: MessageTarget; count: number }[];
    const byTarget: Record<MessageTarget, number> = { all: 0, werewolf: 0 };
    for (const row of targetRows) {
      byTarget[row.target] = row.count;
    }

    // By player
    const playerStmt = this.db.prepare('SELECT player_name, COUNT(*) as count FROM messages WHERE game_id = ? GROUP BY player_name');
    const playerRows = playerStmt.all(gameId) as { player_name: string; count: number }[];
    const byPlayer: Record<string, number> = {};
    for (const row of playerRows) {
      byPlayer[row.player_name] = row.count;
    }

    return {
      total: totalRow.count,
      by_phase: byPhase,
      by_target: byTarget,
      by_player: byPlayer
    };
  }
}