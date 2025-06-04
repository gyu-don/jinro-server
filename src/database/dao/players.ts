// Data Access Object for Players table

import { dbConnection } from '../connection';
import type {
  Player,
  CreatePlayerData,
  UpdatePlayerData,
  PlayerRole,
  PlayerStatus
} from '../../types/database';

export class PlayersDAO {
  private db = dbConnection.getDatabase();

  public create(playerData: CreatePlayerData): Player {
    const stmt = this.db.prepare(`
      INSERT INTO players (
        game_id, name, token, role, status, death_day, death_cause
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      playerData.game_id,
      playerData.name,
      playerData.token,
      playerData.role,
      playerData.status,
      playerData.death_day,
      playerData.death_cause
    );

    return this.findById(result.lastInsertRowid as number)!;
  }

  public findById(id: number): Player | null {
    const stmt = this.db.prepare('SELECT * FROM players WHERE id = ?');
    const row = stmt.get(id) as Player | undefined;
    return row || null;
  }

  public findByToken(token: string): Player | null {
    const stmt = this.db.prepare('SELECT * FROM players WHERE token = ?');
    const row = stmt.get(token) as Player | undefined;
    return row || null;
  }

  public findByGameId(gameId: string): Player[] {
    const stmt = this.db.prepare('SELECT * FROM players WHERE game_id = ? ORDER BY created_at');
    const rows = stmt.all(gameId) as Player[];
    return rows;
  }

  public findByGameIdAndRole(gameId: string, role: PlayerRole): Player[] {
    const stmt = this.db.prepare('SELECT * FROM players WHERE game_id = ? AND role = ?');
    const rows = stmt.all(gameId, role) as Player[];
    return rows;
  }

  public findAlivePlayersByGameId(gameId: string): Player[] {
    const stmt = this.db.prepare('SELECT * FROM players WHERE game_id = ? AND status = ?');
    const rows = stmt.all(gameId, 'alive') as Player[];
    return rows;
  }

  public findDeadPlayersByGameId(gameId: string): Player[] {
    const stmt = this.db.prepare('SELECT * FROM players WHERE game_id = ? AND status = ?');
    const rows = stmt.all(gameId, 'dead') as Player[];
    return rows;
  }

  public findByGameIdAndName(gameId: string, name: string): Player | null {
    const stmt = this.db.prepare('SELECT * FROM players WHERE game_id = ? AND name = ?');
    const row = stmt.get(gameId, name) as Player | undefined;
    return row || null;
  }

  public update(token: string, updateData: UpdatePlayerData): Player | null {
    const currentPlayer = this.findByToken(token);
    if (!currentPlayer) {
      return null;
    }

    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      return currentPlayer;
    }

    values.push(token);

    const stmt = this.db.prepare(`
      UPDATE players SET ${fields.join(', ')}
      WHERE token = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0 ? this.findByToken(token) : null;
  }

  public killPlayer(token: string, day: number, cause: 'executed' | 'killed'): boolean {
    const stmt = this.db.prepare(`
      UPDATE players SET
        status = 'dead',
        death_day = ?,
        death_cause = ?
      WHERE token = ?
    `);

    const result = stmt.run(day, cause, token);
    return result.changes > 0;
  }

  public delete(token: string): boolean {
    const stmt = this.db.prepare('DELETE FROM players WHERE token = ?');
    const result = stmt.run(token);
    return result.changes > 0;
  }

  // Get role counts for a game
  public getRoleCounts(gameId: string): Record<PlayerRole, number> {
    const stmt = this.db.prepare(`
      SELECT role, COUNT(*) as count
      FROM players
      WHERE game_id = ?
      GROUP BY role
    `);

    const rows = stmt.all(gameId) as { role: PlayerRole; count: number }[];
    
    const counts: Record<PlayerRole, number> = {
      villager: 0,
      fortune_teller: 0,
      medium: 0,
      werewolf: 0,
      madman: 0
    };

    for (const row of rows) {
      counts[row.role] = row.count;
    }

    return counts;
  }

  // Get alive player counts by team
  public getAliveTeamCounts(gameId: string): { village: number; werewolf: number } {
    const stmt = this.db.prepare(`
      SELECT role, COUNT(*) as count
      FROM players
      WHERE game_id = ? AND status = 'alive'
      GROUP BY role
    `);

    const rows = stmt.all(gameId) as { role: PlayerRole; count: number }[];
    
    let villageCount = 0;
    let werewolfCount = 0;

    for (const row of rows) {
      if (row.role === 'werewolf' || row.role === 'madman') {
        werewolfCount += row.count;
      } else {
        villageCount += row.count;
      }
    }

    return { village: villageCount, werewolf: werewolfCount };
  }

  // Check if a player exists in the game
  public playerExistsInGame(gameId: string, playerName: string): boolean {
    const stmt = this.db.prepare('SELECT 1 FROM players WHERE game_id = ? AND name = ?');
    const row = stmt.get(gameId, playerName);
    return !!row;
  }

  // Get werewolf players for a game (for consultation)
  public getWerewolves(gameId: string): Player[] {
    return this.findByGameIdAndRole(gameId, 'werewolf');
  }

  // Get players who died on a specific day
  public getPlayersDeadOnDay(gameId: string, day: number): Player[] {
    const stmt = this.db.prepare('SELECT * FROM players WHERE game_id = ? AND death_day = ?');
    const rows = stmt.all(gameId, day) as Player[];
    return rows;
  }
}