// Basic database functionality test

import { DatabaseConnection } from '../database/connection';
import { gamesDAO, playersDAO, messagesDAO, actionsDAO, phaseHistoryDAO } from '../database';
import type { GameConfig } from '../types/database';
import { v4 as uuidv4 } from 'uuid';

describe('Database Implementation', () => {
  let testGameId: string;
  let testPlayerToken: string;

  beforeAll(() => {
    // Use in-memory database for testing
    process.env.DATABASE_PATH = ':memory:';
  });

  beforeEach(() => {
    testGameId = `test_game_${uuidv4()}`;
    testPlayerToken = `test_token_${uuidv4()}`;
  });

  describe('GamesDAO', () => {
    test('should create and retrieve a game', () => {
      const gameConfig: GameConfig = {
        player_count: 5,
        roles: {
          villager: 2,
          fortune_teller: 1,
          werewolf: 1,
          madman: 1
        },
        timeouts: {
          day_discussion: 300,
          day_voting: 60,
          night_action: 120,
          night_consultation: 180
        },
        limits: {
          day_speaks_per_player: 5,
          night_werewolf_speaks: 10
        }
      };

      const game = gamesDAO.create({
        id: testGameId,
        status: 'waiting',
        current_phase: null,
        day_count: 0,
        game_config: gameConfig,
        phase_start_time: null,
        phase_timeout_seconds: null,
        winner_team: null
      });

      expect(game.id).toBe(testGameId);
      expect(game.status).toBe('waiting');
      expect(game.game_config.player_count).toBe(5);

      const retrieved = gamesDAO.findById(testGameId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(testGameId);
    });

    test('should update game status', () => {
      const gameConfig: GameConfig = {
        player_count: 5,
        roles: { villager: 2, fortune_teller: 1, werewolf: 1, madman: 1 },
        timeouts: { day_discussion: 300, day_voting: 60, night_action: 120, night_consultation: 180 },
        limits: { day_speaks_per_player: 5, night_werewolf_speaks: 10 }
      };

      gamesDAO.create({
        id: testGameId,
        status: 'waiting',
        current_phase: null,
        day_count: 0,
        game_config: gameConfig,
        phase_start_time: null,
        phase_timeout_seconds: null,
        winner_team: null
      });

      const updated = gamesDAO.update(testGameId, {
        status: 'day_phase',
        current_phase: 'discussion',
        day_count: 1
      });

      expect(updated).not.toBeNull();
      expect(updated?.status).toBe('day_phase');
      expect(updated?.current_phase).toBe('discussion');
      expect(updated?.day_count).toBe(1);
    });
  });

  describe('PlayersDAO', () => {
    beforeEach(() => {
      const gameConfig: GameConfig = {
        player_count: 5,
        roles: { villager: 2, fortune_teller: 1, werewolf: 1, madman: 1 },
        timeouts: { day_discussion: 300, day_voting: 60, night_action: 120, night_consultation: 180 },
        limits: { day_speaks_per_player: 5, night_werewolf_speaks: 10 }
      };

      gamesDAO.create({
        id: testGameId,
        status: 'waiting',
        current_phase: null,
        day_count: 0,
        game_config: gameConfig,
        phase_start_time: null,
        phase_timeout_seconds: null,
        winner_team: null
      });
    });

    test('should create and retrieve players', () => {
      const player = playersDAO.create({
        game_id: testGameId,
        name: 'TestBear',
        token: testPlayerToken,
        role: 'villager',
        status: 'alive',
        death_day: null,
        death_cause: null
      });

      expect(player.name).toBe('TestBear');
      expect(player.role).toBe('villager');
      expect(player.status).toBe('alive');

      const retrieved = playersDAO.findByToken(testPlayerToken);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('TestBear');

      const gamePlayersRetrieved = playersDAO.findByGameId(testGameId);
      expect(gamePlayersRetrieved).toHaveLength(1);
      expect(gamePlayersRetrieved[0]?.name).toBe('TestBear');
    });

    test('should get role counts', () => {
      playersDAO.create({
        game_id: testGameId,
        name: 'Bear',
        token: `${testPlayerToken}_1`,
        role: 'villager',
        status: 'alive',
        death_day: null,
        death_cause: null
      });

      playersDAO.create({
        game_id: testGameId,
        name: 'Fox',
        token: `${testPlayerToken}_2`,
        role: 'werewolf',
        status: 'alive',
        death_day: null,
        death_cause: null
      });

      const counts = playersDAO.getRoleCounts(testGameId);
      expect(counts.villager).toBe(1);
      expect(counts.werewolf).toBe(1);
      expect(counts.fortune_teller).toBe(0);
    });
  });

  describe('MessagesDAO', () => {
    beforeEach(() => {
      const gameConfig: GameConfig = {
        player_count: 5,
        roles: { villager: 2, fortune_teller: 1, werewolf: 1, madman: 1 },
        timeouts: { day_discussion: 300, day_voting: 60, night_action: 120, night_consultation: 180 },
        limits: { day_speaks_per_player: 5, night_werewolf_speaks: 10 }
      };

      gamesDAO.create({
        id: testGameId,
        status: 'waiting',
        current_phase: null,
        day_count: 0,
        game_config: gameConfig,
        phase_start_time: null,
        phase_timeout_seconds: null,
        winner_team: null
      });
    });

    test('should create and retrieve messages', () => {
      const message = messagesDAO.create({
        game_id: testGameId,
        player_name: 'TestBear',
        message: 'Hello everyone!',
        phase: 'day',
        phase_detail: 'discussion',
        target: 'all',
        day_count: 1
      });

      expect(message.message).toBe('Hello everyone!');
      expect(message.phase).toBe('day');
      expect(message.target).toBe('all');

      const gameMessages = messagesDAO.findByGameId(testGameId);
      expect(gameMessages).toHaveLength(1);
      expect(gameMessages[0]?.message).toBe('Hello everyone!');
    });

    test('should filter messages by phase and target', () => {
      messagesDAO.create({
        game_id: testGameId,
        player_name: 'Bear',
        message: 'Day message',
        phase: 'day',
        phase_detail: 'discussion',
        target: 'all',
        day_count: 1
      });

      messagesDAO.create({
        game_id: testGameId,
        player_name: 'Wolf',
        message: 'Night message',
        phase: 'night',
        phase_detail: 'consultation',
        target: 'werewolf',
        day_count: 1
      });

      const dayMessages = messagesDAO.findByGameIdAndPhase(testGameId, 'day');
      expect(dayMessages).toHaveLength(1);
      expect(dayMessages[0]?.message).toBe('Day message');

      const werewolfMessages = messagesDAO.findWerewolfMessages(testGameId);
      expect(werewolfMessages).toHaveLength(1);
      expect(werewolfMessages[0]?.message).toBe('Night message');
    });
  });

  describe('ActionsDAO', () => {
    beforeEach(() => {
      const gameConfig: GameConfig = {
        player_count: 5,
        roles: { villager: 2, fortune_teller: 1, werewolf: 1, madman: 1 },
        timeouts: { day_discussion: 300, day_voting: 60, night_action: 120, night_consultation: 180 },
        limits: { day_speaks_per_player: 5, night_werewolf_speaks: 10 }
      };

      gamesDAO.create({
        id: testGameId,
        status: 'waiting',
        current_phase: null,
        day_count: 0,
        game_config: gameConfig,
        phase_start_time: null,
        phase_timeout_seconds: null,
        winner_team: null
      });
    });

    test('should create and retrieve actions with JSON results', () => {
      const action = actionsDAO.create({
        game_id: testGameId,
        player_token: testPlayerToken,
        action_type: 'divine',
        target_player: 'Fox',
        result: {
          action: 'divine',
          target: 'Fox',
          result: 'villager'
        },
        day_count: 1,
        phase: 'night',
        success: true
      });

      expect(action.action_type).toBe('divine');
      expect(action.target_player).toBe('Fox');
      expect(action.result).toEqual({
        action: 'divine',
        target: 'Fox',
        result: 'villager'
      });

      const divineActions = actionsDAO.findDivineActions(testGameId);
      expect(divineActions).toHaveLength(1);
      expect(divineActions[0]?.result).toEqual({
        action: 'divine',
        target: 'Fox',
        result: 'villager'
      });
    });
  });

  describe('PhaseHistoryDAO', () => {
    beforeEach(() => {
      const gameConfig: GameConfig = {
        player_count: 5,
        roles: { villager: 2, fortune_teller: 1, werewolf: 1, madman: 1 },
        timeouts: { day_discussion: 300, day_voting: 60, night_action: 120, night_consultation: 180 },
        limits: { day_speaks_per_player: 5, night_werewolf_speaks: 10 }
      };

      gamesDAO.create({
        id: testGameId,
        status: 'waiting',
        current_phase: null,
        day_count: 0,
        game_config: gameConfig,
        phase_start_time: null,
        phase_timeout_seconds: null,
        winner_team: null
      });
    });

    test('should track phase history with results', () => {
      const startTime = new Date().toISOString();
      
      const phase = phaseHistoryDAO.create({
        game_id: testGameId,
        phase: 'day_discussion',
        day_count: 1,
        phase_results: {
          phase: 'day_discussion',
          message_count: 5,
          participants: ['Bear', 'Fox', 'Wolf']
        },
        started_at: startTime,
        ended_at: null
      });

      expect(phase.phase).toBe('day_discussion');
      expect(phase.day_count).toBe(1);
      expect(phase.phase_results).toEqual({
        phase: 'day_discussion',
        message_count: 5,
        participants: ['Bear', 'Fox', 'Wolf']
      });

      const timeline = phaseHistoryDAO.getGameTimeline(testGameId);
      expect(timeline).toHaveLength(1);
      expect(timeline[0]?.phase).toBe('day_discussion');
    });
  });
});

export {};