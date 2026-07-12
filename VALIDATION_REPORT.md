# Validation Report

Validation date: **2026-07-12**

Environment: isolated Linux packaging container. Network access and a pre-populated Maven repository were not available.

## Passed checks

### Frontend unit/integration suite

Command:

```bash
cd frontend
npm test -- --run
```

Result:

- 20 test files passed;
- 151 tests passed;
- 3 tests intentionally skipped;
- no failed tests.

The suite includes full client X3DH/Double Ratchet exchange, concurrent-send serialization, out-of-order messages, trust-state changes, secure storage migration, auth storage, WebSocket deduplication and endpoint configuration.

### Frontend production build

```bash
cd frontend
npm run build
```

Result: passed. Vite emitted a large-chunk advisory for the main application bundle; this is a performance optimisation item, not a build failure.

### Frontend lint

```bash
cd frontend
npm run lint
```

Result: passed with zero errors. 35 warnings remain within the configured repository gate; there are zero lint errors.

### Frontend coverage gate

```bash
cd frontend
npm run test:coverage -- --run
```

Result: passed. Repository-wide coverage at the last full run was approximately:

- statements/lines: 54.88%;
- branches: 65.67%;
- functions: 55.04%.

Critical auth, crypto, trust and realtime modules have dedicated behavioural tests. The project-wide percentage is not represented as high-assurance coverage; UI and integration coverage should continue to increase.

### Configuration/static checks

Passed:

- `git diff --check`;
- YAML parsing for Docker Compose, Kubernetes and GitHub Actions files;
- Nginx configuration syntax check with the backend hostname substituted by a local test endpoint;
- Java source syntax screening on 33 changed/new Java files using `javac -proc:none` (dependency symbols unavailable, but no parser-level syntax failures were detected);
- direct Java compilation of the dependency-free CORS/WebSocket origin parser;
- Kubernetes Kustomize resource-reference consistency check;
- Electron endpoint validator negative and positive paths;
- packaged Electron-mode Vite build with an assertion that generated asset URLs are relative;
- Electron production endpoint validator negative path (missing `.env.electron` correctly fails closed).

### Packaging checks

The final archive is created without `.git`, `node_modules`, frontend build/coverage output, backend `target`, Electron release output, logs, runtime attachments or real `.env` files. The ZIP is verified with `unzip -t` and a SHA-256 checksum is recorded at packaging time.

## Backend Maven limitation

A full backend build/test command is defined and required by CI:

```bash
cd backend
./mvnw verify
```

It could not be executed inside the packaging container because:

- no system Maven installation was present;
- the Maven Wrapper distribution/JAR was not bundled in the source archive;
- no local Maven dependency repository was available;
- outbound network/DNS was unavailable, so Maven and dependencies could not be downloaded.

Backend tests were added and changed source was statically inspected, but this report does **not** claim a successful local Maven compilation or integration run. The first connected CI run must execute `./mvnw verify`; any resulting dependency/API/compiler issue must block release.

## Not performed in this environment

- Docker image builds and full Compose startup;
- PostgreSQL/Redis/Kafka integration tests;
- browser Playwright E2E against a running backend;
- Electron installer build/signing;
- Kubernetes deployment;
- load, soak, reconnect-storm or chaos testing;
- penetration testing or independent cryptographic audit.

These are mandatory release activities, not optional evidence.
