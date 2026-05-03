# 🎬 Movie Ticketing System API

A production-grade RESTful API built with **NestJS**, **MySQL**, and **Sequelize**. Admins manage movies, screens, and showtimes; customers browse listings, reserve seats, and confirm bookings.

---

## Table of Contents

1. [Setup Instructions](#setup-instructions)
2. [Environment Variables](#environment-variables)
3. [Concurrency Strategy](#concurrency-strategy) ⬅️ _mandatory section_
4. [API Overview](#api-overview)
5. [Testing](#testing)
6. [Known Limitations / Future Improvements](#known-limitations--future-improvements)

---

## Setup Instructions

### Prerequisites

- Node.js 20+
- MySQL 8.0+
- npm

### 1. Clone and install

```bash
git clone <repo-url>
cd movie-ticketing
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your MySQL credentials and JWT secrets
```

### 3. Create the database

```sql
CREATE DATABASE movie_ticketing;
CREATE DATABASE movie_ticketing_test;  -- for tests
```

### 4. Run migrations

```bash
npm run db:migrate
```

### 5. Start the server

```bash
# Development (with hot reload)
npm run start:dev

# Production
npm run build && npm run start:prod
```

### 6. Open Swagger UI

```
http://localhost:3000/api/docs
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | HTTP port | `3000` |
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USERNAME` | MySQL username | `root` |
| `DB_PASSWORD` | MySQL password | `password` |
| `DB_DATABASE` | Database name | `movie_ticketing` |
| `JWT_ACCESS_SECRET` | Secret for access tokens | `long-random-string` |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | `different-long-random-string` |
| `JWT_ACCESS_EXPIRES_IN` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | `7d` |

---

## Concurrency Strategy

### The Problem

When two users simultaneously attempt to book the same seat, a naive implementation produces a race condition:

1. Request A reads seat status → `available`
2. Request B reads seat status → `available`
3. Request A writes → `held` ✅
4. Request B also writes → `held` ❌ **double booking!**

Both passed the availability check because neither had committed yet when the other read.

### Chosen Approach: Pessimistic Locking (`SELECT ... FOR UPDATE`)

We use **MySQL row-level pessimistic locking** inside a Sequelize transaction. The critical code is in `src/modules/bookings/bookings.service.ts → reserve()`:

```typescript
const inventoryRows = await this.seatInventoryModel.findAll({
  where: { showtimeId: dto.showtimeId, seatId: { [Op.in]: dto.seatIds } },
  lock: Transaction.LOCK.UPDATE,   // <-- SELECT ... FOR UPDATE
  transaction: t,
});
```

**How it prevents the race:**

1. Request A enters the transaction and issues `SELECT ... FOR UPDATE` on the seat row → MySQL grants the exclusive row lock.
2. Request B enters a concurrent transaction and issues `SELECT ... FOR UPDATE` on the **same row** → MySQL blocks B until A commits or rolls back.
3. Request A sees `status = available` → transitions to `held` → commits.
4. Request B is now unblocked → reads the row → sees `status = held` → throws `409 SEAT_UNAVAILABLE`.

The lock lives in the **database**, not in application memory, so it works correctly under horizontal scaling with multiple Node.js instances.

### Why Not the Alternatives?

| Approach | Why not chosen |
|---|---|
| **Optimistic locking** (version field) | Requires retry logic on the client; a poor UX for a ticketing system where seats are scarce. First-writer-wins is cleaner. |
| **SKIP LOCKED** | Good for job queues. For ticketing, we want the second request to fail immediately with a clear error — not silently skip. |
| **Advisory locks** | `pg_try_advisory_xact_lock` is PostgreSQL-only. We're on MySQL. |
| **Application-level mutex** | Fails under horizontal scaling; state lives in one process only. Explicitly disallowed. |

### Trade-offs of Pessimistic Locking

| Pro | Con |
|---|---|
| Correct by construction — no retry needed | Lock contention under very high concurrency |
| Simple to reason about | Slightly lower throughput than optimistic on low-contention rows |
| Works across multiple app instances | Long transactions hold locks longer — keep transactions short |
| MySQL `innodb_lock_wait_timeout` prevents deadlock starvation | Deadlock possible if two transactions lock rows in different orders (mitigated by consistent lock ordering) |

**Lock ordering**: we always fetch seat inventory sorted by `seatId` to ensure consistent lock acquisition order, preventing circular deadlocks.

### Failure Mode Without the Lock

Without `FOR UPDATE`, both concurrent requests execute this sequence atomically _from their own perspective_ but non-atomically _from each other's_:

```
Time →  Tx A reads (available)   Tx B reads (available)
                                  Tx A writes held        Tx A commits
        Tx B writes held          Tx B commits  ← DOUBLE BOOKING
```

The `test/concurrency/concurrency.spec.ts` test demonstrates and proves the fix.

---

## API Overview

All endpoints are prefixed `/api`. Full interactive docs at `/api/docs`.

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | Public | Register user |
| POST | `/login` | Public | Login, get tokens |
| POST | `/refresh` | Public | Rotate refresh token |
| POST | `/logout` | Public | Revoke refresh token |

### Movies — `/api/movies`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | Admin | Create movie |
| GET | `/` | JWT | List with filter/search/sort/pagination |
| GET | `/:id` | JWT | Get movie details |
| PATCH | `/:id` | Admin | Update movie |
| DELETE | `/:id` | Admin | Soft delete |

### Screens — `/api/screens`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | Admin | Create screen + auto-generate seats |
| GET | `/` | JWT | List screens |
| GET | `/:id` | JWT | Screen details + full seat map |

### Showtimes — `/api/showtimes`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | Admin | Create showtime + auto-create seat inventory |
| GET | `/` | JWT | List (filter by movieId, screenId, date) |
| GET | `/:id` | JWT | Showtime details |
| GET | `/:id/seats` | JWT | Full seat map with per-seat status |

### Bookings — `/api/bookings`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/reserve` | JWT | Step 1 — Hold seats (10 min) |
| POST | `/:id/confirm` | JWT | Step 2 — Mock payment + confirm |
| GET | `/my` | JWT | My bookings |
| GET | `/` | Admin | All bookings with filters |
| GET | `/:id` | JWT | Booking details |
| DELETE | `/:id` | JWT | Cancel booking |

### Pricing Rules

- `standard` seats = `basePrice × 1.0`
- `premium` seats = `basePrice × 1.5`
- `vip` seats = `basePrice × 2.0`

Seat types are assigned per row when creating a screen via `rowTypeConfig`.

### Background Job

A cron job runs **every minute** and:
1. Finds all `SeatInventory` rows with `status = held` and `heldUntil < NOW()`
2. Reverts them to `available`
3. Marks the associated `Booking` as `expired`

---

## Testing

### Run all tests

```bash
npm test
```

### Run unit tests only

```bash
npm run test:unit
```

### Run the concurrency test (mandatory)

```bash
npm run test:concurrency
```

Expected output:
```
PASS  test/concurrency/concurrency.spec.ts
  Concurrency — Seat Reservation Race Condition
    ✓ 10 simultaneous requests for the same seat → exactly 1 succeeds, 9 get ConflictException
    ✓ 3 seats, 10 simultaneous requests — still exactly 1 succeeds
    ✓ seat remains available if all requests fail (bad showtime)
```

### Run integration tests (requires MySQL)

```bash
# Ensure .env is configured with test DB
npm run test:integration
```

### View coverage

```bash
npm run test:cov
```

Coverage report is generated at `./coverage/lcov-report/index.html`.

### Target coverage

Business logic (booking service, RBAC guard, pricing) targets **>70%** line coverage.

---

## Project Structure

```
src/
├── config/
│   ├── configuration.ts      # All env vars typed
│   ├── constants.ts          # Enums, multipliers, ROW_LABELS
│   └── database.js           # Sequelize CLI config
├── modules/
│   ├── auth/                 # JWT strategy, refresh tokens, auth service/controller
│   ├── users/                # User model
│   ├── movies/               # Movie CRUD
│   ├── screens/              # Screen + Seat generation
│   ├── showtimes/            # Showtime + SeatInventory creation
│   ├── bookings/             # Reserve → Confirm → Cancel + expiry
│   └── payments/             # Payment model
├── middleware/
│   ├── jwt-auth.guard.ts     # Global JWT guard
│   ├── roles.guard.ts        # RBAC guard + @Roles() decorator
│   ├── global-exception.filter.ts   # Centralised error handler
│   ├── current-user.decorator.ts    # @CurrentUser() param decorator
│   └── public.decorator.ts   # @Public() to skip auth
├── jobs/
│   └── hold-expiry.job.ts    # @Cron every minute
├── migrations/               # Sequelize CLI migrations (never sync:push)
├── app.module.ts
└── main.ts                   # Bootstrap: Swagger, validation, rate limits
test/
├── unit/
│   ├── pricing.spec.ts
│   ├── roles.guard.spec.ts
│   └── bookings.service.spec.ts
├── integration/
│   ├── auth.spec.ts
│   └── booking-lifecycle.spec.ts
└── concurrency/
    └── concurrency.spec.ts   ← mandatory, must pass reliably
```

---

## Known Limitations / Future Improvements

### Given More Time

1. **Seat lock ordering** — Currently we lock in query-result order. For true deadlock-safety with multi-seat bookings, seats should be locked in a deterministic sorted order (e.g., by `seatId ASC`) to prevent circular wait chains.

2. **Redis for hold expiry** — The in-process cron job works on a single instance. Under horizontal scaling, multiple instances run the same job simultaneously. A Redis-based distributed lock (e.g., Redlock) around the cron job would prevent duplicate expiry processing.

3. **Refresh token family invalidation** — Currently, stolen refresh tokens can be reused until explicitly revoked. A "token family" approach would invalidate all tokens in a chain the moment any revoked token in the chain is presented.

4. **Event-driven seat release** — Instead of (or alongside) polling, a message queue (e.g., BullMQ + Redis) could handle hold expiry with second-level precision instead of per-minute granularity.

5. **Seat map caching** — `GET /showtimes/:id/seats` re-queries all inventory on every request. For popular shows, this could be cached in Redis with a short TTL and invalidated on every status transition.

6. **Admin user seeding** — Currently there's no migration seed for the first admin user. In production, an initial admin should be created via a one-time seed script with credentials from environment variables.

7. **Webhook / email notifications** — Booking confirmation and cancellation events should trigger notifications (email, push). A simple event emitter or message queue integration would support this.

8. **E2E tests with a real DB** — The integration tests are written but rely on a live MySQL instance. A Docker Compose setup for the test environment would make CI/CD self-contained.
