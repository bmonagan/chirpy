# Chirpy

A Twitter-like REST API built with Node.js, Express, and PostgreSQL.

## Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: JWT (access tokens) + opaque refresh tokens
- **Password hashing**: bcrypt

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL instance

### Setup

```bash
npm install
```

Create a `.env` file:

```env
DB_URL=postgres://user:password@localhost:5432/chirpy
JWT_SECRET=your_secret_here
POLKA_KEY=your_polka_webhook_key
PLATFORM=dev   # set to "prod" to disable /admin/reset
```

Migrations run automatically on startup.

```bash
npm run dev
```

Server starts at `http://localhost:8080`.

## API Reference

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/login` | None | Login, returns JWT + refresh token |
| POST | `/api/refresh` | Refresh token | Exchange refresh token for new JWT |
| POST | `/api/revoke` | Refresh token | Revoke a refresh token |

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/users` | None | Create a new user |
| PUT | `/api/users` | JWT | Update email and password |

### Chirps

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/chirps` | None | Get all chirps. Query params: `authorId`, `sort` (`asc`/`desc`) |
| GET | `/api/chirps/:chirpId` | None | Get a single chirp |
| POST | `/api/chirps` | JWT | Create a chirp (max 140 chars) |
| DELETE | `/api/chirps/:chirpId` | JWT | Delete your own chirp |

### Webhooks

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/polka/webhooks` | API key | Polka webhook — handles `user.upgraded` event |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/metrics` | View file server hit count |
| POST | `/admin/reset` | Reset hit count and wipe users (dev only) |

### Health

```
GET /api/healthz → 200 OK
```

## Auth Flow

```
POST /api/login
  → returns { token (JWT, 1hr), refreshToken }

Authorization: Bearer <JWT>          ← for protected routes
Authorization: Bearer <refreshToken> ← for /api/refresh and /api/revoke
```

JWTs expire after 1 hour. Use `/api/refresh` with your refresh token to get a new one without re-authenticating.