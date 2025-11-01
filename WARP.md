# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands

### Backend (Express + MongoDB)
- Install: `cd backend && npm install`
- Dev server (nodemon): `npm run dev`
- Start (prod): `npm start`
- Health check: `curl http://localhost:5001/api/health`
- Notes: No test or lint scripts are defined for the backend.

Required env (loaded via dotenv):
- `MONGODB_URI` (Mongo connection string)
- `JWT_SECRET` (for auth middleware)
- Optional email creds if using password reset (see nodemailer usage)

### Frontend (Create React App)
- Install: `cd frontend && npm install`
- Dev server: `npm start`
- Build: `npm run build`
- Tests (Jest via CRA): `npm test`
  - Run once (CI mode): `CI=true npm test -- --watchAll=false`
  - Run a single test file/pattern: `npm test -- <pattern>` (e.g., `npm test -- GamePage`)
- Lint: No explicit script; CRA includes ESLint during development/build.

Env:
- Copy `frontend/.env.example` to `.env` and set `REACT_APP_API_URL` (defaults to `http://localhost:5001/api`).

### Typical dev flow
- Start backend first (`npm run dev` in `backend/`), then start frontend (`npm start` in `frontend/`). The frontend Axios client points to the backend via `REACT_APP_API_URL`.

## Architecture overview

### High level
- Two apps:
  - `backend/`: Node.js/Express API with MongoDB (Mongoose), JWT auth, and email utilities.
  - `frontend/`: React (CRA) client with role-based pages (doctor/caretaker/patient), charts (Recharts), and icons (lucide-react).

### Backend structure
- Entry: `backend/src/server.js`
  - Sets up CORS, JSON parsing, connects to Mongo via `MONGODB_URI`.
  - Mounts routes: `/api/auth`, `/api/users`, `/api/game`.
  - Error handler returns JSON; health endpoint at `/api/health`.
- Auth middleware: `backend/src/middleware/auth.middleware.js`
  - `protect`: extracts Bearer token, verifies with `JWT_SECRET`, attaches `req.user`.
  - `doctorOnly`: guards doctor-only routes.
- Data model: `backend/src/models/user.model.js`
  - Users have `type` = doctor | patient | caretaker.
  - Game data: sessions with `levelspan`, `play[{responsetime, correct}]` where `correct ∈ {-1,0,1}` and `responsetime` is `-1` when exceeding allowed time.
  - Scoring tracked in `totalScore`; `level = floor(totalScore/100) + 1`.
- Game endpoints: `backend/src/routes/game.routes.js` → `backend/src/controllers/game.controller.js`
  - `POST /api/game/save-session` (protected): persists a session, scores entries (+10 correct, −5 incorrect; not done = 0; session score floored at 0), updates `totalScore` and `level`.
  - `GET /api/game/levelspan/:userId?` (protected): fetches `currentlevelspan` (defaults to requester).
  - `PUT /api/game/levelspan/:userId` (protected): doctor/caretaker can update `currentlevelspan` (1–10).
  - `GET /api/game/analytics/:userId` (doctor-only): aggregates response/accuracy stats and returns last 10 sessions.
  - `GET /api/game/stats/:userId?` (protected): lightweight recent-session summary (defaults to requester).
- Auth routes: `backend/src/routes/auth.routes.js` (register, login, forgot-password, OTP verify/reset). Uses email utility for OTP.

### Frontend structure
- Axios client: `frontend/src/services/api.js`
  - `baseURL = REACT_APP_API_URL || http://localhost:5001/api`.
  - Attaches `Authorization: Bearer <token>` from `localStorage`.
- Domain services: `frontend/src/services/gameService.js` wraps `/game/*` endpoints.
- Routing/Auth:
  - `frontend/src/context/AuthContext.js` manages auth state/token.
  - `frontend/src/components/common/ProtectedRoute.js` guards private routes.
- Pages (selected):
  - Doctor: dashboards, patient analytics (`pages/doctor/PatientAnalytics.js`) visualizing response times and accuracy.
  - Caretaker/Patient: dashboards and settings.
  - Game: multiple game UIs under `pages/game/` implementing reaction/pose-based interactions.
- Tooling: CRA (react-scripts), Tailwind (present in devDependencies), Recharts for visualizations, lucide-react for icons.

## Important usage notes (from README)
- Response-time model: `responsetime` ∈ [0, `levelspan`] or `-1` if exceeded; `correct` ∈ {1, −1, 0}.
- `currentlevelspan` (1–10s) is adjustable by doctor/caretaker and used by the game timer.
- API endpoints for game/session management match those listed above; frontend analytics reflect these fields.

