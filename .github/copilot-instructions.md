# AceExam AI Coding Instructions

Expert instructions for coding in the AceExam monorepo.

## Project Architecture
- **Monorepo**: Uses `pnpm workspaces`. Components are `frontend` (Vite + React), `backend` (Express + MySQL), and `packages/shared` (TypeScript types).
- **Socket.io**: Real-time communication for user counts and answer live-feeds.
- **Identity**: User identity is tracked via `fingerprint` (fingerprintjs) passed in socket `auth`.
- **API Endpoint**: Backend runs on port 3003 by default; Socket.io uses path `/socket.io/aceexam`.

## Tech Stack
- **Frontend**: React 19, Vite, TypeScript, Socket.io-client.
- **Backend**: Node.js (ESM), Express, Socket.io, `mysql2/promise`.
- **Database**: MySQL with JSON columns for question options.

## Key Conventions & Patterns
- **Bilingual Support**: All user-facing content (questions, options, answers) MUST have `_en` and `_cn` suffixes. UI translations are managed in [frontend/locales.ts](frontend/locales.ts).
- **Shared Types**: Centralize all entity shapes (e.g., `Question`, `AppState`) in [packages/shared/src/index.ts](packages/shared/src/index.ts). Re-exported by [frontend/types.ts](frontend/types.ts).
- **Real-time Events**:
  - `submit_answer`: Emitted by client when user selects an option.
  - `broadcast_answer`: Emitted by server to all clients (except sender) for live feed.
  - `user_count_update`: Emitted by server when fingerprints connect/disconnect.
- **Hooks**: Use [frontend/hooks/useSocket.ts](frontend/hooks/useSocket.ts) for WebSocket logic.

## Database Schema
- **Questions**: Primary source of truth. `options_en`/`options_cn` are JSON. Answers are string-delimited (e.g., "A;B" for multiple choice).
- **Answers**: Logs individual submissions tied to `fingerprint`.

## Developer Workflows
- **Setup**: `pnpm install` in root.
- **Dev**: `pnpm dev` starts both frontend and backend.
- **Data**: `pnpm run import` in [backend](backend) imports seed data from `data.json`.
- **Env**: Backend needs `DB_*` vars in `backend/.env`. Frontend uses `GEMINI_API_KEY` for AI features.

## Critical Files
- [backend/database.js](backend/database.js): Core DB provider logic.
- [frontend/api/questions.ts](frontend/api/questions.ts): Question fetching and processing logic.
- [packages/shared/src/index.ts](packages/shared/src/index.ts): Source of truth for shared types.
