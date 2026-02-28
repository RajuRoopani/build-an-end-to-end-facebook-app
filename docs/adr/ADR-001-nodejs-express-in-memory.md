## ADR-001: Node.js + Express + In-Memory Storage for Facebook App Backend

**Status:** Accepted

---

### Context

This is a demo/MVP social app. The team has previously used Python/FastAPI for all backends. The product requirement explicitly calls for Node.js, making this our first JS backend. We need to pick a routing framework, storage strategy, and test runner.

---

### Decision

**Runtime:** Node.js (LTS)
**Framework:** Express 4.x
**Storage:** In-memory singleton module (`storage.js`)
**Test runner:** Node's built-in `node --test` (no additional dependencies)
**UUID generation:** `uuid` package (`v4`)

---

### Consequences

**Positive:**
- Express is the most documented Node.js framework — zero ramp-up risk
- In-memory storage eliminates DB setup, migrations, and connection pooling for a demo app
- `node --test` is built-in since Node 18 — no dev dependency needed
- `storage.reset()` gives tests a clean slate without mocking

**Negative:**
- Data does not survive server restarts — acceptable for MVP
- In-memory means single-process only — no horizontal scaling without a shared store
- No TypeScript — lose compile-time safety; mitigated by input validation in each route handler

**Deferred:**
- Auth/JWT middleware (all routes are public in MVP)
- Database persistence (Postgres + Knex or Mongoose)
- Rate limiting

---

### Alternatives Considered

| Option | Why Rejected |
|---|---|
| Fastify | Less familiar; Express is the requirement-implied default |
| SQLite | Adds file I/O, requires schema migrations — overkill for MVP |
| Jest | Extra dev dependency; Node's built-in test runner is sufficient |
