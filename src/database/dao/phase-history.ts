// Data Access Object for PhaseHistory table

import { dbConnection } from '../connection';
import type {
  PhaseHistory,
  PhaseHistoryRow,
  CreatePhaseHistoryData,
  UpdatePhaseHistoryData,
  PhaseHistoryType,
  PhaseResult
} from '../../types/database';

export class PhaseHistoryDAO {
  private db = dbConnection.getDatabase();

  // Convert database row to PhaseHistory object
  private rowToPhaseHistory(row: PhaseHistoryRow): PhaseHistory {
    return {
      ...row,
      phase_results: row.phase_results ? JSON.parse(row.phase_results) as PhaseResult : null
    };
  }

  // Convert PhaseHistory object to database row
  private phaseHistoryToRow(phaseHistory: PhaseHistory | CreatePhaseHistoryData): Omit<PhaseHistoryRow, 'id'> {
    return {
      ...phaseHistory,
      phase_results: phaseHistory.phase_results ? JSON.stringify(phaseHistory.phase_results) : null
    } as Omit<PhaseHistoryRow, 'id'>;
  }

  public create(phaseHistoryData: CreatePhaseHistoryData): PhaseHistory {
    const row = this.phaseHistoryToRow(phaseHistoryData);
    const stmt = this.db.prepare(`
      INSERT INTO phase_history (
        game_id, phase, day_count, phase_results, started_at, ended_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      row.game_id,
      row.phase,
      row.day_count,
      row.phase_results,
      row.started_at,
      row.ended_at
    );

    return this.findById(result.lastInsertRowid as number)!;
  }

  public findById(id: number): PhaseHistory | null {
    const stmt = this.db.prepare('SELECT * FROM phase_history WHERE id = ?');
    const row = stmt.get(id) as PhaseHistoryRow | undefined;
    return row ? this.rowToPhaseHistory(row) : null;
  }

  public findByGameId(gameId: string): PhaseHistory[] {
    const stmt = this.db.prepare('SELECT * FROM phase_history WHERE game_id = ? ORDER BY day_count, started_at');
    const rows = stmt.all(gameId) as PhaseHistoryRow[];
    return rows.map(row => this.rowToPhaseHistory(row));
  }

  public findByGameIdAndDay(gameId: string, day: number): PhaseHistory[] {
    const stmt = this.db.prepare('SELECT * FROM phase_history WHERE game_id = ? AND day_count = ? ORDER BY started_at');
    const rows = stmt.all(gameId, day) as PhaseHistoryRow[];
    return rows.map(row => this.rowToPhaseHistory(row));
  }

  public findByPhaseType(gameId: string, phase: PhaseHistoryType, day?: number): PhaseHistory[] {
    let sql = 'SELECT * FROM phase_history WHERE game_id = ? AND phase = ?';
    const params: (string | number)[] = [gameId, phase];

    if (day !== undefined) {
      sql += ' AND day_count = ?';
      params.push(day);
    }

    sql += ' ORDER BY started_at';

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as PhaseHistoryRow[];
    return rows.map(row => this.rowToPhaseHistory(row));
  }

  public findCurrentPhase(gameId: string): PhaseHistory | null {
    const stmt = this.db.prepare('SELECT * FROM phase_history WHERE game_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1');
    const row = stmt.get(gameId) as PhaseHistoryRow | undefined;
    return row ? this.rowToPhaseHistory(row) : null;
  }

  public findLatestCompletedPhase(gameId: string): PhaseHistory | null {
    const stmt = this.db.prepare('SELECT * FROM phase_history WHERE game_id = ? AND ended_at IS NOT NULL ORDER BY ended_at DESC LIMIT 1');
    const row = stmt.get(gameId) as PhaseHistoryRow | undefined;
    return row ? this.rowToPhaseHistory(row) : null;
  }

  public update(id: number, updateData: UpdatePhaseHistoryData): PhaseHistory | null {
    const currentPhaseHistory = this.findById(id);
    if (!currentPhaseHistory) {
      return null;
    }

    const fields = [];
    const values = [];

    if (updateData.ended_at !== undefined) {
      fields.push('ended_at = ?');
      values.push(updateData.ended_at);
    }

    if (updateData.phase_results !== undefined) {
      fields.push('phase_results = ?');
      values.push(updateData.phase_results ? JSON.stringify(updateData.phase_results) : null);
    }

    if (fields.length === 0) {
      return currentPhaseHistory;
    }

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE phase_history SET ${fields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0 ? this.findById(id) : null;
  }

  public endPhase(id: number, endTime: string, results?: PhaseResult): boolean {
    const updateData: UpdatePhaseHistoryData = {
      ended_at: endTime,
      phase_results: results
    };

    const updated = this.update(id, updateData);
    return !!updated;
  }

  public delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM phase_history WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  public deleteByGameId(gameId: string): number {
    const stmt = this.db.prepare('DELETE FROM phase_history WHERE game_id = ?');
    const result = stmt.run(gameId);
    return result.changes;
  }

  // Start a new phase
  public startPhase(gameId: string, phase: PhaseHistoryType, day: number, startTime: string): PhaseHistory {
    return this.create({
      game_id: gameId,
      phase,
      day_count: day,
      phase_results: null,
      started_at: startTime,
      ended_at: null
    });
  }

  // Get phase duration
  public getPhaseDuration(id: number): number | null {
    const phaseHistory = this.findById(id);
    if (!phaseHistory || !phaseHistory.ended_at) {
      return null;
    }

    const startTime = new Date(phaseHistory.started_at).getTime();
    const endTime = new Date(phaseHistory.ended_at).getTime();
    return Math.round((endTime - startTime) / 1000); // Return duration in seconds
  }

  // Get game timeline
  public getGameTimeline(gameId: string): PhaseHistory[] {
    return this.findByGameId(gameId);
  }

  // Get phases by day range
  public findByDayRange(gameId: string, startDay: number, endDay: number): PhaseHistory[] {
    const stmt = this.db.prepare(`
      SELECT * FROM phase_history 
      WHERE game_id = ? AND day_count BETWEEN ? AND ? 
      ORDER BY day_count, started_at
    `);
    const rows = stmt.all(gameId, startDay, endDay) as PhaseHistoryRow[];
    return rows.map(row => this.rowToPhaseHistory(row));
  }

  // Check if a specific phase has been completed for a day
  public isPhaseCompleted(gameId: string, phase: PhaseHistoryType, day: number): boolean {
    const stmt = this.db.prepare(`
      SELECT 1 FROM phase_history 
      WHERE game_id = ? AND phase = ? AND day_count = ? AND ended_at IS NOT NULL
    `);
    const row = stmt.get(gameId, phase, day);
    return !!row;
  }

  // Get incomplete phases (for cleanup/timeout handling)
  public findIncompletePhases(gameId?: string): PhaseHistory[] {
    let sql = 'SELECT * FROM phase_history WHERE ended_at IS NULL';
    const params: string[] = [];

    if (gameId) {
      sql += ' AND game_id = ?';
      params.push(gameId);
    }

    sql += ' ORDER BY started_at';

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as PhaseHistoryRow[];
    return rows.map(row => this.rowToPhaseHistory(row));
  }

  // Get game statistics
  public getGameStats(gameId: string): {
    total_phases: number;
    completed_phases: number;
    phase_counts: Record<PhaseHistoryType, number>;
    total_days: number;
    avg_phase_duration: number | null;
  } {
    const phases = this.findByGameId(gameId);
    
    const totalPhases = phases.length;
    const completedPhases = phases.filter(p => p.ended_at).length;
    
    const phaseCounts: Record<PhaseHistoryType, number> = {
      day_discussion: 0,
      day_voting: 0,
      night_action: 0,
      night_consultation: 0
    };

    let totalDuration = 0;
    let durationCount = 0;

    for (const phase of phases) {
      phaseCounts[phase.phase]++;
      
      if (phase.ended_at) {
        const duration = this.getPhaseDuration(phase.id);
        if (duration !== null) {
          totalDuration += duration;
          durationCount++;
        }
      }
    }

    const maxDay = phases.length > 0 ? Math.max(...phases.map(p => p.day_count)) : 0;
    const avgDuration = durationCount > 0 ? Math.round(totalDuration / durationCount) : null;

    return {
      total_phases: totalPhases,
      completed_phases: completedPhases,
      phase_counts: phaseCounts,
      total_days: maxDay,
      avg_phase_duration: avgDuration
    };
  }
}