# AGENTS.md

## Cursor Cloud specific instructions

This repo is **Chaos E2EE Messenger**: a Spring Boot (Java 17) backend in `backend/` and a
React/Vite web client (with optional Electron packaging) in `frontend/`. Runtime dependencies are
PostgreSQL, Redis, and a Kafka-compatible broker (Redpanda). Standard commands live in the root
`README.md`, `frontend/package.json` scripts, `backend/pom.xml`, and `.github/workflows/ci.yml` —
prefer those. Only the non-obvious caveats are captured here.

### Java version (important)
- The backend targets **Java 17**, but the default `java` on this VM is Java 21. `JAVA_HOME` is
  pre-set to `/usr/lib/jvm/java-17-openjdk-amd64` in `~/.bashrc`, so a fresh login shell uses the
  correct JDK for `./mvnw`. If you spawn a shell that doesn't source `~/.bashrc`, export
  `JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64` before running Maven.
- `backend/mvnw` may lose its executable bit; run `chmod +x backend/mvnw` if you get "Permission denied".

### Docker daemon is not auto-started
- Docker is installed but `dockerd` does **not** start on boot. Start it once per VM session, e.g.
  in a tmux session: `sudo dockerd` (leave it running). If the CLI reports a socket permission
  error, run `sudo chmod 666 /var/run/docker.sock`.
- Docker uses the `fuse-overlayfs` storage driver with the containerd-snapshotter feature disabled
  (see `/etc/docker/daemon.json`); don't switch it back to `overlay2`.

### Dependency services (Postgres / Redis / Redpanda)
- Start them with the dev compose file (publishes ports to the host):
  `cd backend && docker compose -f docker-compose.dev.yml up -d`
  → Postgres `5432` (db `chaos_messenger`, user/pass `postgres`/`postgres`), Redis `6379`,
  Redpanda Kafka `19092`.
- Kafka/outbox is **disabled by default in the dev profile** (`chaos.kafka.enabled=false`), so basic
  messaging works with just Postgres + Redis. Redpanda is only needed for durable realtime/outbox
  paths and the `test:e2e:real` Playwright suite.

### Running the backend (dev)
- `JWT_SECRET` has **no default** and must be set, or startup fails. `SPRING_PROFILES_ACTIVE=dev`
  supplies working Postgres/Redis defaults that match the dev compose file.
- From `backend/`: `SPRING_PROFILES_ACTIVE=dev JWT_SECRET=<32+ char secret> ./mvnw spring-boot:run`
  → API on `http://localhost:8080`, Swagger UI at `/swagger-ui.html`, health at `/actuator/health`.

### Running the frontend (dev)
- From `frontend/`: copy `.env.example` to `.env` (defaults already point at `http://localhost:8080`),
  then `npm run dev` → Vite on `http://localhost:5173`.
- WebCrypto needs a secure context; `localhost` qualifies, so the Caddy/HTTPS reverse proxy from the
  root `docker-compose.yml` is **not** needed for local dev.
- `npm ci` runs an `electron-builder` postinstall; use `npm ci --ignore-scripts` (as CI does) unless
  you specifically need the Electron desktop build.

### Lint / test / build
- Frontend (from `frontend/`): `npm run lint`, `npm run typecheck` (+ `typecheck:crypto`,
  `typecheck:protocol`), `npm run test:coverage -- --run`, `npm run build`.
- Backend (from `backend/`): `./mvnw --batch-mode verify` (Checkstyle + JUnit + JaCoCo coverage gate).
  Backend tests use **Testcontainers**, so the Docker daemon must be running for `verify`.
