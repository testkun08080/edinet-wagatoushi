# EDINETプロジェクト サブエージェント

階層的なサブエージェント構造で、フロントエンドとバックエンドの開発・レビューを効率化します。

## エージェント構造

```
coordinator (統括エージェント)
├── frontend-dev (edinet-screener担当)
│   └── frontend-reviewer (フロントエンドレビュー)
└── backend-dev (edinet-wrapper担当)
    └── backend-reviewer (バックエンドレビュー)
```

## 各エージェントの役割

### 🎯 coordinator
**統括エージェント** - タスクの振り分けと進捗管理

- ユーザーリクエストを分析
- 適切なサブエージェント（frontend/backend）に振り分け
- レビュープロセスの管理
- 全体進捗の報告

### ⚛️ frontend-dev
**フロントエンド開発担当** - React/Vike/TypeScript

#### 担当範囲
- `edinet-screener/` 配下のすべてのファイル
- React/TypeScript実装
- Vikeのファイルシステムルーティング
- shadcn/ui コンポーネント
- Recharts チャート実装
- React Context 状態管理

#### 技術スタック
- Vike (SSR + ファイルシステムルーティング)
- React 18 + TypeScript
- Tailwind CSS
- shadcn/ui (Radix UI)
- Recharts

### 🔍 frontend-reviewer
**フロントエンドレビュー担当**

#### レビュー観点
- TypeScript型安全性
- Reactベストプラクティス
- Vike特有の実装
- パフォーマンス最適化
- アクセシビリティ
- セキュリティ

### 🐍 backend-dev
**バックエンド開発担当** - Python/EDINET解析

#### 担当範囲
- `edinet-wrapper/` 配下のすべてのファイル
- EDINET APIクライアント
- TSV解析ロジック
- JSON生成スクリプト
- Pydanticデータモデル

#### 技術スタック
- Python 3.12+
- uv (依存関係管理)
- Pydantic (データバリデーション)
- EDINET API

### 🔍 backend-reviewer
**バックエンドレビュー担当**

#### レビュー観点
- 型ヒント・Pydantic
- エラーハンドリング
- EDINET API連携
- データパース・バリデーション
- パフォーマンス
- セキュリティ

## 使用方法

### 基本的な使い方

```bash
# coordinatorエージェントを起動（推奨）
@coordinator フロントエンドのテーブルにソート機能を追加してください

# 特定のエージェントを直接起動
@frontend-dev CompanyTableにカラムソート機能を追加
@backend-dev EDINET APIのリトライロジックを改善
```

### ワークフロー例

#### 1. フロントエンド機能追加

```
ユーザー: @coordinator 企業詳細ページにチャートを追加

↓

coordinator: frontend-devに振り分け
↓
frontend-dev: 実装完了
↓
frontend-reviewer: レビュー実施
↓
coordinator: ユーザーに報告
```

#### 2. バックエンドデータ修正

```
ユーザー: @coordinator JSONにROE指標を追加

↓

coordinator: backend-devに振り分け
↓
backend-dev: build_screener_data.pyを修正
↓
backend-reviewer: データ整合性チェック
↓
coordinator: フロントエンドへの影響確認（必要に応じてfrontend-devも起動）
```

#### 3. 横断的な機能追加

```
ユーザー: @coordinator 新しい財務指標（PBR）を追加

↓

coordinator: backend-dev と frontend-dev を並行起動
↓
backend-dev: company_metrics.jsonにPBR追加
frontend-dev: テーブルカラムとフィルタに追加
↓
両方のreviewerが並行レビュー
↓
coordinator: 統合確認後、ユーザーに報告
```

## ファイル構成

```
.claude/agents/
├── README.md                      # このファイル
├── index.ts                       # エージェントエクスポート
├── coordinator.agent.ts           # 統括エージェント
├── frontend-dev.agent.ts          # フロントエンド開発
├── frontend-reviewer.agent.ts     # フロントエンドレビュー
├── backend-dev.agent.ts           # バックエンド開発
└── backend-reviewer.agent.ts      # バックエンドレビュー
```

## Tips

### 効率的な使い方

1. **基本的にcoordinatorを使う**: タスクの振り分けと全体管理を任せる
2. **並行処理**: 複数エージェントを同時起動して高速化
3. **レビュー自動化**: 実装後、自動的にreviewerが起動
4. **コンテキスト継承**: 各エージェントは親の会話履歴を参照可能

### 各エージェントを直接使うケース

- **frontend-dev**: フロントエンドのみの小規模修正
- **backend-dev**: バックエンドのみの小規模修正
- **reviewer**: 既存コードのレビューのみ

### 注意事項

- エージェントは `edinet-screener/` または `edinet-wrapper/` をworking directoryとして起動
- プロジェクトルートに影響する変更は、coordinatorを使用
- レビュー指摘事項は必ず対応（Critical > Major > Minor）

## 今後の拡張

- **test-runner**: 自動テスト実行エージェント
- **deployment**: デプロイ自動化エージェント
- **data-validator**: JSON整合性チェックエージェント
