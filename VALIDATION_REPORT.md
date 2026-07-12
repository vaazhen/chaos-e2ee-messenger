# Validation Report

Validation date: **2026-07-12**

Environment: isolated Linux packaging container. Backend execution was intentionally skipped at the user's request. External network access was insufficient for downloading Electron packaging binaries.

## Passed checks

### Frontend unit/integration tests

```bash
cd frontend
npm test -- --run
```

Result:

- 20 test files passed;
- 154 tests passed;
- 3 tests intentionally skipped;
- 0 failed tests.

Covered behaviour includes:

- X3DH/Double Ratchet bidirectional exchange;
- concurrent ratchet sends;
- skipped keys and out-of-order delivery;
- one-time pre-key consumption and replay rejection;
- secure storage migration;
- device trust and `KEY_CHANGED` blocking;
- memory-only access-token behaviour;
- WebSocket event deduplication;
- durable reconnect recovery and cursor persistence;
- critical message and UI flows.

### Frontend lint

```bash
npm run lint
```

Result: passed with **0 errors and 35 warnings**. The repository lint gate permits up to 50 warnings.

### Frontend production build

```bash
npm run build
```

Result: passed. Vite emitted a bundle-size advisory for the main application chunk; this is a performance optimisation item, not a build failure.

### Frontend coverage

```bash
npm run test:coverage -- --run
```

Result: coverage gate passed.

| Metric | Result |
|---|---:|
| Statements | 55.24% |
| Branches | 65.70% |
| Functions | 55.60% |
| Lines | 55.24% |

The crypto engine has dedicated behavioural coverage; repository-wide UI coverage should continue to increase.

### Electron frontend build

Checks performed:

- missing packaged endpoints fail closed;
- HTTPS/WSS endpoint configuration passes validation;
- Vite `electron` mode builds successfully;
- generated asset URLs are relative and compatible with packaged `file://` pages.

The final `electron-builder` installer stage was not completed because the isolated environment could not download platform Electron binaries. No signed installer is claimed.

### Configuration checks

Passed:

- YAML parsing for 22 Compose, Kubernetes and GitHub Actions files;
- Kubernetes Kustomize resource-reference validation;
- shell syntax checks for project scripts;
- frontend `package.json` and lockfile JSON parsing;
- basic committed-secret pattern scan;
- Compose service-graph inspection.

Docker itself was not available in this environment, so `docker compose config`, image builds and runtime health checks were not executed.

## Backend status

The backend was **not compiled or executed in this validation run**, following the user's explicit instruction. This report does not claim:

- successful `./mvnw verify`;
- Flyway migration execution;
- PostgreSQL/Redis/Kafka integration success;
- application startup;
- backend API or WebSocket runtime compatibility.

The backend must be treated as release-blocking until a connected CI or developer environment runs:

```bash
cd backend
./mvnw verify
```

Any compiler, dependency, migration or integration failure must block deployment.

## Not performed

- full Docker Compose startup;
- backend integration tests;
- browser Playwright E2E against a running backend;
- Electron installer packaging/signing/notarisation;
- Kubernetes deployment;
- load, soak or chaos tests;
- external penetration test;
- independent cryptographic audit.

## Packaging

The distributed archive excludes dependency directories, compiled output, coverage reports, runtime data, logs, local `.env` files and repository metadata. The final ZIP is checked with `unzip -t` and accompanied by a SHA-256 checksum.
