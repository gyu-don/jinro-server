# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web application for LLM-powered Werewolf games (人狼ゲーム). The system allows Large Language Models to play Werewolf through programmatic API calls, with all player actions executed via web endpoints accessible through MCP servers or CURL commands.

### Core Concept
- **API-driven gameplay**: All actions are accessible through web endpoints
- **Flexible time management**: Wall-clock timeouts combined with action count limits
- **Multi-phase game structure**: Day/night cycles with discussion, voting, and special actions

## Game Architecture

### Data Storage
- **SQLite + JSON format**: Game state, player info, and message logs stored as JSON in SQLite
- **Table structure**:
  - `games` (id, game_data JSON, created_at, updated_at)
  - `messages` (id, game_id, message_data JSON, created_at)
  - `actions` (id, game_id, action_data JSON, created_at)

### Key Game Phases
1. **Night Phase**: Werewolf consultation → Fortune teller divination → Werewolf kill → Medium ability
2. **Day Phase**: Night results → Discussion → Voting → Execution results

### Player Roles & Victory Conditions
- **Village Team**: Eliminate all werewolves (Villager, Fortune Teller, Medium)
- **Werewolf Team**: Equal or outnumber villagers (Werewolf, Madman)

## API Endpoint Structure

### Core Endpoints
- `POST /api/games` - Create new game
- `GET /api/games/{game_id}` - Get game status
- `GET /api/games/{game_id}/players/{player_token}/status` - Get player status
- `POST /api/games/{game_id}/players/{player_token}/speak` - Send message
- `POST /api/games/{game_id}/players/{player_token}/divine` - Fortune teller action
- `POST /api/games/{game_id}/players/{player_token}/kill` - Werewolf action
- `POST /api/games/{game_id}/players/{player_token}/vote` - Voting action
- `GET /api/games/{game_id}/spectate` - Spectator view

### Action Timeouts
- Night actions (divine/kill): 120 seconds from night phase start
- Werewolf consultation: 180 seconds, max 10 messages
- Day discussion: 300 seconds, max 5 messages per player
- Voting: 60 seconds

## Player Configuration Examples
- **5 players**: 2 Villagers, 1 Fortune Teller, 1 Werewolf, 1 Madman
- **7 players**: 3 Villagers, 1 Fortune Teller, 1 Medium, 1 Werewolf, 1 Madman
- **9 players**: 4 Villagers, 1 Fortune Teller, 1 Medium, 2 Werewolves, 1 Madman

## Development Notes

### Automatic Player Assignment
- **Names**: Auto-generated animal names (Bear, Fox, Wolf, Rabbit, Eagle, etc.)
- **Tokens**: Unique API authentication identifiers
- **Roles**: Randomly assigned at game start

### Timeout Handling
- Automatic random target selection for timed-out actions
- Simultaneous timer start for all night phase actions
- Phase-specific timeout behaviors defined in specification

### Commit Practices
- Always use Conventional Commit for commit message