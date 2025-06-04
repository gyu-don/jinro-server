#!/usr/bin/env tsx

// Database seeding script for development/testing

import { v4 as uuidv4 } from 'uuid';
import { gamesDAO, playersDAO, messagesDAO, actionsDAO, phaseHistoryDAO } from '../database';
import type { GameConfig } from '../types/database';

// Sample game configuration
const sampleGameConfig: GameConfig = {
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

// Animal names for players
const animalNames = ['Bear', 'Fox', 'Wolf', 'Rabbit', 'Eagle', 'Tiger', 'Lion', 'Deer', 'Owl', 'Snake'];

function generateToken(): string {
  return `token_${uuidv4().replace(/-/g, '')}`;
}

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');

    // Create a sample game
    const gameId = `game_${uuidv4()}`;
    console.log(`Creating game: ${gameId}`);

    const game = gamesDAO.create({
      id: gameId,
      status: 'waiting',
      current_phase: null,
      day_count: 0,
      game_config: sampleGameConfig,
      phase_start_time: null,
      phase_timeout_seconds: null,
      winner_team: null
    });

    // Create players
    const roles = ['villager', 'villager', 'fortune_teller', 'werewolf', 'madman'] as const;
    const players = [];

    for (let i = 0; i < 5; i++) {
      const player = playersDAO.create({
        game_id: gameId,
        name: animalNames[i]!,
        token: generateToken(),
        role: roles[i]!,
        status: 'alive',
        death_day: null,
        death_cause: null
      });
      players.push(player);
      console.log(`Created player: ${player.name} (${player.role})`);
    }

    // Create some sample messages
    console.log('Creating sample messages...');

    // Day 1 discussion messages
    messagesDAO.create({
      game_id: gameId,
      player_name: 'Bear',
      message: 'おはようございます。昨夜は平和でしたね。',
      phase: 'day',
      phase_detail: 'discussion',
      target: 'all',
      day_count: 1
    });

    messagesDAO.create({
      game_id: gameId,
      player_name: 'Fox',
      message: '誰か怪しい人はいませんか？',
      phase: 'day',
      phase_detail: 'discussion',
      target: 'all',
      day_count: 1
    });

    // Night werewolf consultation
    messagesDAO.create({
      game_id: gameId,
      player_name: 'Wolf',
      message: '今夜は誰を襲いましょうか？',
      phase: 'night',
      phase_detail: 'consultation',
      target: 'werewolf',
      day_count: 1
    });

    // Create sample actions
    console.log('Creating sample actions...');

    // Fortune teller divine action
    const fortuneTeller = players.find(p => p.role === 'fortune_teller');
    if (fortuneTeller) {
      actionsDAO.create({
        game_id: gameId,
        player_token: fortuneTeller.token,
        action_type: 'divine',
        target_player: 'Wolf',
        result: {
          action: 'divine',
          target: 'Wolf',
          result: 'werewolf'
        },
        day_count: 1,
        phase: 'night',
        success: true
      });
    }

    // Werewolf kill action
    const werewolf = players.find(p => p.role === 'werewolf');
    if (werewolf) {
      actionsDAO.create({
        game_id: gameId,
        player_token: werewolf.token,
        action_type: 'kill',
        target_player: 'Rabbit',
        result: {
          action: 'kill',
          target: 'Rabbit'
        },
        day_count: 1,
        phase: 'night',
        success: true
      });
    }

    // Create phase history
    console.log('Creating phase history...');

    const now = new Date().toISOString();
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

    // Night phase 1
    const nightPhase = phaseHistoryDAO.create({
      game_id: gameId,
      phase: 'night_action',
      day_count: 1,
      phase_results: {
        phase: 'night_action',
        killed: 'Rabbit',
        divine_results: [{
          action: 'divine',
          target: 'Wolf',
          result: 'werewolf'
        }]
      },
      started_at: oneHourAgo,
      ended_at: now
    });

    console.log('Database seeding completed successfully!');
    console.log(`\nSample data created:`);
    console.log(`  Game ID: ${gameId}`);
    console.log(`  Players: ${players.length}`);
    console.log(`  Messages: 3`);
    console.log(`  Actions: 2`);
    console.log(`  Phase History: 1`);

  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase();
}