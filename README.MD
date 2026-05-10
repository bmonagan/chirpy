# Chirpy

A Twitter-like REST API built with Node.js, Express, and PostgreSQL.

## Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: JWT (access tokens) + opaque refresh tokens
- **Password hashing**: Argon2

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
ALLOWED_ORIGINS=http://localhost:8080   # comma-separated for CORS
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
| PATCH | `/api/users/profile` | JWT | Update bio and avatar URL |

### Chirps

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/chirps` | None | Get chirps with pagination. Query: `authorId`, `sort`, `limit`, `offset` |
| GET | `/api/chirps/:chirpId` | None | Get a single chirp |
| POST | `/api/chirps` | JWT | Create a chirp (max 140 chars) |
| DELETE | `/api/chirps/:chirpId` | JWT | Delete your own chirp |

### Likes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/chirps/:chirpId/like` | JWT | Like a chirp |
| DELETE | `/api/chirps/:chirpId/like` | JWT | Unlike a chirp |
| GET | `/api/chirps/:chirpId/like` | None | Get like count for a chirp |

### Follows

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/users/:userId/follow` | JWT | Follow a user |
| DELETE | `/api/users/:userId/follow` | JWT | Unfollow a user |
| GET | `/api/users/:userId/followers` | None | Get followers of a user |
| GET | `/api/users/:userId/following` | None | Get users a user follows |

### Comments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/chirps/:chirpId/comments` | JWT | Comment on a chirp |
| GET | `/api/chirps/:chirpId/comments` | None | Get comments for a chirp. Query: `sort` |
| DELETE | `/api/comments/:commentId` | JWT | Delete your own comment |

### Webhooks

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/polka/webhooks` | API key | Polka webhook for events |

Supported events:
- `user.upgraded` — Upgrade user to Chirpy Red
- `chirp.created` — New chirp created
- `chirp.deleted` — Chirp deleted
- `user.followed` — User followed another
- `user.unfollowed` — User unfollowed another
- `chirp.liked` — Chirp liked
- `chirp.unliked` — Chirp unliked

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/metrics` | View file server hit count |
| POST | `/admin/reset` | Reset hit count and wipe users (dev only) |

### Health

```
GET /api/healthz
```

Returns JSON with status, uptime, database health, platform, and response time.

## Auth Flow

```
POST /api/login
  → returns { token (JWT, 1hr), refreshToken }

Authorization: Bearer <JWT>          ← for protected routes
Authorization: Bearer <refreshToken> ← for /api/refresh and /api/revoke
```

JWTs expire after 1 hour. Use `/api/refresh` with your refresh token to get a new one without re-authenticating.

## Middleware Features

- **Rate Limiting**: Built-in rate limiter (100 requests per minute per IP:path)
- **CORS**: Configurable via `ALLOWED_ORIGINS` env var
- **Request Validation**: Validation middleware available
- **Error Handling**: Standardized error responses with timestamps