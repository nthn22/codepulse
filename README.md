# CodePulse — AI-Powered Code Review

CodePulse lets you paste code, upload a file, or import from GitHub and get instant AI feedback powered by Claude. Reviews stream in real-time, and logged-in users get their full review history saved to a database.

---

## Features

- **AI code review** — Claude analyzes your code for bugs, security issues, performance, and best practices
- **Real-time streaming** — the review appears word-by-word as Claude generates it (no waiting for a full response)
- **File upload** — drag and drop or select a file; language is auto-detected from the extension
- **GitHub import** — paste a public GitHub file URL and the code loads directly into the editor
- **Authentication** — register/login with email and password, sessions stored via JWT
- **Review history** — every review is saved to the database for logged-in users, browsable from the History page

---

## Tech Stack

### Frontend
| Tool | Purpose |
|---|---|
| React 19 | UI component library |
| React Router | Client-side routing (`/`, `/review`, `/login`, etc.) |
| Vite | Development server and build tool |
| Tailwind CSS | Utility-first styling |
| Monaco Editor | The same editor that powers VS Code |
| React Markdown | Renders the AI review as formatted markdown |

### Backend
| Tool | Purpose |
|---|---|
| Node.js + Express | HTTP server and API routes |
| Anthropic SDK | Calls the Claude API and streams the response |
| Prisma | Database ORM — type-safe queries, migrations |
| PostgreSQL | Relational database (users + review history) |
| JSON Web Tokens | Stateless authentication |
| bcryptjs | Hashes passwords before storing them |

---

## Architecture Overview

```
Browser (React)
    │
    │  HTTP / SSE (Server-Sent Events)
    ▼
Express Server (Node.js)
    │
    ├── /api/auth     → register, login, get current user
    ├── /api/reviews  → stream a review (Claude), save to DB, fetch history
    └── /api/github   → proxy fetch a file from GitHub
    │
    ├── Anthropic API (Claude) — streams the AI response
    └── PostgreSQL (Prisma)   — stores users and reviews
```

**Key concept — SSE (Server-Sent Events):**
Instead of waiting for Claude to finish and returning one big response, the server opens a persistent HTTP connection and sends small chunks of text as Claude produces them. The browser reads these chunks and appends them to the UI in real-time. This is what makes the review appear to "type itself out."

**Key concept — JWT Authentication:**
When you log in, the server creates a signed token (JWT) containing your user ID and returns it. Your browser stores this token and sends it with every future request in the `Authorization: Bearer <token>` header. The server verifies the signature to confirm it's legitimate — no session storage needed on the server side.

---

## Project Structure

```
ai_project/
├── client/                  # React frontend (Vite)
│   └── src/
│       ├── __tests__/       # Vitest component/hook tests
│       ├── components/      # Shared UI components (Navbar)
│       ├── context/         # React Context for global auth state
│       ├── hooks/           # Custom React hooks (useStream)
│       ├── pages/           # One file per route
│       ├── services/        # Functions that call the backend API
│       ├── test/            # Test setup file
│       └── utils/           # Pure helper functions (detectLanguage)
│
└── server/                  # Express backend (Node.js)
    ├── prisma/              # Database schema + migration files
    └── src/
        ├── __tests__/       # Jest route/middleware tests
        ├── lib/             # Shared singletons (Prisma client)
        ├── middleware/      # Express middleware (JWT auth check)
        ├── routes/          # One file per API resource
        ├── services/        # Business logic (Claude API calls)
        └── utils/           # Pure helper functions (GitHub URL conversion)
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- A PostgreSQL database (free tier at [neon.tech](https://neon.tech) works great)
- An Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

### 1. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Configure environment variables

Create `server/.env` (copy from `server/.env.example`):

```env
PORT=3001
CLIENT_URL=http://localhost:5173
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://user:password@host/dbname
JWT_SECRET=any_long_random_string
```

Generate a good JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Run the database migration

```bash
cd server
npm run db:migrate   # creates tables, generates Prisma client
```

### 4. Start the servers

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

Open **http://localhost:5173**

---

## Running Tests

```bash
# Server (Jest) — 22 tests
cd server && npm test

# Client (Vitest) — 31 tests
cd client && npm test
```

---

## Deployment (Render / Railway)

The server serves the built client as static files in production — one service, one deploy.

```bash
# Build command
npm run build   # installs deps, builds React app, generates Prisma client

# Start command
npm start       # runs Express, which serves both the API and the React app
```

Set these environment variables on your hosting platform:
- `NODE_ENV=production`
- `ANTHROPIC_API_KEY`
- `DATABASE_URL`
- `JWT_SECRET`

After first deploy, run the migration once via your platform's shell:
```bash
cd server && npx prisma migrate deploy
```
