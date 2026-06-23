# Chaos Messenger — Setup Guide

## Prerequisites

- Java 17+
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 16 (via Docker)
- Redis 7 (via Docker)

---

## Quick Start (Full Stack with Docker)

```bash
# 1. Generate secrets
JWT_SECRET=$(openssl rand -hex 32)
VAPID_KEYS=$(npx -y web-push generate-vapid-keys --json)
VAPID_PUBLIC=$(echo "$VAPID_KEYS" | jq -r '.publicKey')
VAPID_PRIVATE=$(echo "$VAPID_KEYS" | jq -r '.privateKey')

# 2. Create .env
cat > .env << EOF
JWT_SECRET=$JWT_SECRET
POSTGRES_PASSWORD=change-me
VAPID_PUBLIC_KEY=$VAPID_PUBLIC
VAPID_PRIVATE_KEY=$VAPID_PRIVATE
EOF

# 3. Start everything
docker compose up -d

# 4. Open http://localhost
```

## Manual Development

### Infrastructure
```bash
docker compose -f backend/docker-compose.dev.yml up -d
```

### Backend
```bash
cd backend
# Set env vars:
$env:JWT_SECRET = "your-256-bit-secret-key-change-me-1234567890"
$env:VAPID_PUBLIC_KEY = ""   # optional for dev
$env:VAPID_PRIVATE_KEY = ""  # optional for dev
./mvnw spring-boot:run
```

### Frontend (Web)
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

### Frontend (Desktop)
```bash
cd frontend
npm install
npm run electron:dev
```

---

## Features Guide

### E2EE Backup (Export/Import)

1. Open Settings → Backup tab
2. **Export:** Enter passphrase (8+ chars) → Click "Create backup"
3. **Import:** Switch to Import tab → Enter same passphrase → Click "Restore keys"
4. After import, re-login to complete recovery

Backup contains: identity keys, signing keys, signed prekey, one-time prekeys, registration ID.
Encrypted with PBKDF2 (600k iterations) + AES-256-GCM.

### Safety Numbers

1. Open a chat → Click info panel → Click "Verify Safety Number"
2. Compare the displayed fingerprint (numeric, hex, or words) with your contact
3. If they match, the E2EE connection is secure

### Push Notifications

- Register automatically on login
- Requires VAPID keys for actual push delivery
- To generate VAPID keys:
  ```bash
  npx web-push generate-vapid-keys
  ```
- Add to `.env`: `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`

### Voice/Video Calls

1. Requires both participants to be online
2. Call button appears in chat header
3. WebRTC with STUN (Google) — add TURN for production
4. E2EE via DTLS-SRTP

### Screen Sharing (Desktop only)

1. In a video call, click "Share screen" button
2. Select which window/screen to share
3. Click again to stop sharing

---

## Production Deployment

### Docker Compose

```bash
docker compose up -d
```

Includes: PostgreSQL 16, Redis 7, Backend (Spring Boot), Frontend (Nginx).
Healthchecks and restart policy configured.

### Kubernetes

```bash
kubectl apply -k k8s/
```

### CI/CD

GitHub Actions pipeline in `.github/workflows/ci.yml`:
1. Maven build + test
2. Vitest build + test
3. Docker build + push to ghcr.io
4. Kubernetes deploy with rollout status

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | **Yes** | — | HMAC-SHA256 secret (32+ chars) |
| `SPRING_DATASOURCE_URL` | No | `jdbc:postgresql://postgres:5432/chaos` | PostgreSQL JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | No | `chaos` | DB username |
| `SPRING_DATASOURCE_PASSWORD` | No | `change-me` | DB password |
| `VAPID_PUBLIC_KEY` | No | — | Web Push VAPID public key |
| `VAPID_PRIVATE_KEY` | No | — | Web Push VAPID private key |
| `CHAOS_CORS_ALLOWED_ORIGINS` | No | `http://localhost:5173` | CORS origins |

## Testing

### Frontend
```bash
cd frontend
npm test                        # unit tests
npm run test:coverage           # with coverage report
npm run test:e2e                # Playwright E2E
```

### Backend
```bash
cd backend
./mvnw test                     # unit + integration tests
./mvnw verify                   # with JaCoCo coverage check
```

Coverage thresholds:
- Frontend: 68% statements, lines, 55% branches, 45% functions
- Backend: 60% instruction, 40% branch
