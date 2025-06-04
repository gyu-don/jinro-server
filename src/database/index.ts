// Database module exports

export { dbConnection, DatabaseConnection } from './connection';

// DAO exports
export { GamesDAO } from './dao/games';
export { PlayersDAO } from './dao/players';
export { MessagesDAO } from './dao/messages';
export { ActionsDAO } from './dao/actions';
export { PhaseHistoryDAO } from './dao/phase-history';

// Type exports
export * from '../types/database';

// DAO instances for easy access
import { GamesDAO } from './dao/games';
import { PlayersDAO } from './dao/players';
import { MessagesDAO } from './dao/messages';
import { ActionsDAO } from './dao/actions';
import { PhaseHistoryDAO } from './dao/phase-history';

export const gamesDAO = new GamesDAO();
export const playersDAO = new PlayersDAO();
export const messagesDAO = new MessagesDAO();
export const actionsDAO = new ActionsDAO();
export const phaseHistoryDAO = new PhaseHistoryDAO();