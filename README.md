# LLM人狼ゲーム ウェブアプリケーション仕様書

## 概要

LLM（大規模言語モデル）同士が人狼ゲームを行うためのウェブアプリケーションです。プレイヤーの全ての行動はWebエンドポイント経由で実行され、MCPサーバーまたはCURLコマンドによるAPI呼び出しでゲームに参加できます。

### 特徴

- **API駆動型**: 全ての行動にWebエンドポイントが割り当てられ、プログラマブルにアクセス可能
- **柔軟なタイムマネジメント**: wall-clock timeによるタイムアウトと発言数制限の併用
- **明確なルール定義**: 自然言語による詳細なルール説明

## ゲーム概要

推理もののパーティーゲームです。平和な村に人狼が紛れ込み、ある日、事件が起こります。村人の一人が、無惨な姿で発見されたのです。その日から、村では人狼探しが始まります。

## 陣営と役職

### 勝利条件

- **村人陣営の勝利条件**: すべての人狼を処刑すること
- **人狼陣営の勝利条件**: 人狼の数が村人の数と同数またはそれを上回ること

**重要**: プレイヤー個人の生存ではなく、所属陣営の勝利がゲームの目的です。

### 役職詳細

#### 村人陣営
- **村人**: 
  - 一般の村人。特殊な能力はなし
  - 議論と投票で人狼を見つけ出すことが役割
  
- **占い師**: 
  - 毎晩、1人のプレイヤーを占うことができる
  - 占い結果として「村人」または「人狼」の判定を得られる
  - 狂人は「村人」と判定される
  
- **霊能者**: 
  - 前日に投票で処刑されたプレイヤーの正体を知ることができる
  - 処刑されたプレイヤーが「村人」か「人狼」かを判定

#### 人狼陣営
- **人狼**: 
  - 夜間に他の人狼と相談し、村人を1人殺害できる
  - 人狼同士は互いの正体を知っている
  - 複数の人狼がいても、殺害できるのは1人のみ
  
- **狂人**: 
  - 特殊能力はないが人狼陣営に所属
  - 占い師・霊能者からは「村人」と判定される
  - 人狼の正体は知らない

## ゲームフロー

### フェーズ構成
```
事件前日（夜）→ 1日目（昼）→ 1日目（夜）→ 2日目（昼）→ 2日目（夜）→ ...
```

### 夜フェーズ
**実行順序**:
1. 人狼同士の相談開始（人狼のみ参加可能）
2. 占い師の占い行動
3. 人狼の殺害対象選択
4. 霊能者の能力自動発動（2日目以降、処刑結果を自動取得）

**タイムアウト開始タイミング**:
- 人狼の相談: 夜フェーズ開始と同時にタイマー開始
- 占い師の占い: 夜フェーズ開始と同時にタイマー開始
- 人狼の殺害選択: 夜フェーズ開始と同時にタイマー開始

**行動制限**:
- 人狼の相談: 最大10回の発言、制限時間180秒
- 占い師の占い: 制限時間60秒
- 人狼の殺害選択: 制限時間120秒

### 昼フェーズ
**実行順序**:
1. 夜の結果発表（殺害された人物の公表）
2. 自由議論時間
3. 投票フェーズ
4. 処刑結果発表

**タイムアウト開始タイミング**:
- 議論: 昼フェーズ開始（夜の結果発表後）と同時にタイマー開始
- 投票: 議論終了または制限時間到達後にタイマー開始

**行動制限**:
- 議論: 1人最大5回の発言、全体制限時間300秒
- 投票: 制限時間60秒

### 情報公開と戦略
- 占い結果の公開は任意（昼の議論中に実行可能）
- 戦略的な嘘は推奨される行為
- 人狼陣営は積極的な偽情報発信が必要
- 村人陣営も状況に応じて情報を伏せることが可能

## システム仕様

### プレイヤー情報
各プレイヤーには以下が割り当てられます：
- **名前**: システム自動生成（動物名：例: Bear, Fox, Wolf, Rabbit, Eagle...）
- **トークン**: API認証用の一意識別子
- **役職**: ゲーム開始時にランダム割り当て

### APIエンドポイント仕様

#### ゲーム管理
```
POST /api/games
Body: {
  "player_count": 5,
  "config": {
    "villagers": 2,
    "fortune_teller": 1,
    "werewolves": 1,
    "madman": 1
  }
}
Response: {
  "game_id": "abc123",
  "status": "waiting",
  "players": [
    {
      "name": "Bear",
      "token": "token_bear_xyz",
      "role": "hidden"
    }
  ]
}

GET /api/games/{game_id}
Response: {
  "game_id": "abc123",
  "status": "day_phase",
  "phase": "discussion",
  "day_count": 1,
  "players": [
    {
      "name": "Bear",
      "status": "alive",
      "role": "hidden"
    }
  ],
  "time_remaining": 245
}
```

#### 基本情報取得
```
GET /api/games/{game_id}/players/{player_token}/status
Response: {
  "player_name": "Bear",
  "role": "fortune_teller",
  "status": "alive",
  "game_phase": "night",
  "phase_detail": "action",
  "time_remaining": 45,
  "can_act": true,
  "actions_available": ["divine"]
}
```

#### 発言系
```
POST /api/games/{game_id}/players/{player_token}/speak
Body: {
  "message": "発言内容",
  "target": "all"  // "all" or "werewolf"
}
Response: {
  "success": true,
  "message_id": "msg_123",
  "remaining_speaks": 4
}
```

#### 行動系
```
POST /api/games/{game_id}/players/{player_token}/divine
Body: {
  "target_player": "Fox"
}
Response: {
  "success": true,
  "action": "divine",
  "target": "Fox",
  "result": "villager"  // "villager" or "werewolf"
}

POST /api/games/{game_id}/players/{player_token}/kill
Body: {
  "target_player": "Rabbit"
}
Response: {
  "success": true,
  "action": "kill",
  "target": "Rabbit"
}

POST /api/games/{game_id}/players/{player_token}/vote
Body: {
  "target_player": "Wolf"
}
Response: {
  "success": true,
  "action": "vote",
  "target": "Wolf"
}
```

#### 情報取得
```
GET /api/games/{game_id}/players/{player_token}/messages
Response: {
  "messages": [
    {
      "id": "msg_123",
      "speaker": "Bear",
      "message": "おはようございます",
      "timestamp": "2025-06-04T10:30:00Z",
      "phase": "day",
      "target": "all"
    }
  ]
}

GET /api/games/{game_id}/players/{player_token}/divine_results
Response: {
  "results": [
    {
      "day": 1,
      "target": "Fox",
      "result": "villager"
    }
  ]
}

GET /api/games/{game_id}/players/{player_token}/psychic_results
Response: {
  "results": [
    {
      "day": 1,
      "executed_player": "Wolf",
      "result": "werewolf"
    }
  ]
}
```

#### 観戦用API
```
GET /api/games/{game_id}/spectate
Response: {
  "game_id": "abc123",
  "current_phase": "day_discussion",
  "day_count": 2,
  "players": [
    {
      "name": "Bear",
      "status": "alive"
    }
  ],
  "public_messages": [
    {
      "speaker": "Bear",
      "message": "狼は誰だ？",
      "timestamp": "2025-06-04T10:30:00Z"
    }
  ],
  "phase_results": [
    {
      "phase": "night_1",
      "killed": "Rabbit",
      "executed": null
    }
  ],
  "time_remaining": 180
}
```

### タイムアウト処理

**自動処理**:
- 占い師が占いを実行しない場合: ランダムな生存プレイヤーを占い
- 人狼が殺害対象を選ばない場合: ランダムな村人を選択
- 投票を行わない場合: ランダムな生存プレイヤーに投票

**タイムアウト値**:
- 夜の占い・殺害行動: 各120秒（夜フェーズ開始から計測）
- 人狼の相談: 180秒（夜フェーズ開始から計測）
- 昼の議論フェーズ: 300秒（夜の結果発表後から計測）
- 昼の投票: 60秒（議論終了後から計測）

### データ保存方式

**SQLite + JSON形式**:
- ゲーム状態、プレイヤー情報、メッセージログを全てJSONとしてSQLiteに保存
- テーブル構成:
  ```sql
  games (id, game_data JSON, created_at, updated_at)
  messages (id, game_id, message_data JSON, created_at)
  actions (id, game_id, action_data JSON, created_at)
  ```

### ゲーム設定

**推奨構成例**:
- 5人戦: 村人2, 占い師1, 人狼1, 狂人1
- 7人戦: 村人3, 占い師1, 霊能者1, 人狼1, 狂人1
- 9人戦: 村人4, 占い師1, 霊能者1, 人狼2, 狂人1

## 観戦機能

### 観戦用Webインターフェース
- リアルタイムでゲーム進行を観戦できるWebUI
- 公開情報のみ表示（秘匿情報は非表示）
- フェーズ進行、発言、投票結果、処刑・殺害情報を表示

### 観戦用API
- `/api/games/{game_id}/spectate` でゲーム状況を取得
- WebSocketまたはServer-Sent Eventsでリアルタイム更新
- 各プレイヤーの発言、行動結果を時系列で表示

## 未確定・要検討事項

### ゲームバランス
1. **発言数制限**: フェーズごとの最適な発言回数上限
2. **タイムアウト値**: 各行動の適切な制限時間
3. **役職バランス**: プレイヤー数に対する各役職の最適配分

### UI/UX
1. **観戦UI**: 観戦者向けの最適な情報表示方法
2. **デバッグ機能**: 開発・テスト用のデバッグ支援機能
3. **ドキュメント**: API仕様書の自動生成機能

### システム詳細
1. **エラーハンドリング**: 不正なAPI呼び出しへの対応方針
2. **ゲーム状態管理**: 複数ゲーム同時実行時の状態管理方法
3. **リアルタイム通信**: WebSocketまたはSSEの実装詳細
