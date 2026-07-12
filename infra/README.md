# Production Demo Deployment

## Requirements

- Ubuntu 22.04+ VPS (2 vCPU, 4GB RAM, 50GB SSD)
- Docker 24+ and Docker Compose v2
- A domain with DNS A record pointing to your VPS IP
- Ports 80 and 443 open in firewall

## Quick Start

```bash
# 1. Clone the repo on your server
git clone https://github.com/vaazhen/chaos-e2ee-messenger.git
cd chaos-e2ee-messenger

# 2. Set your domain in the Caddyfile
sed -i 's/DOMAIN_PLACEHOLDER/your-domain.com/g' infra/Caddyfile

# 3. Create .env with secrets
cat > .env << 'EOF'
POSTGRES_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -hex 32)
CORS_ORIGINS=https://your-domain.com
GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 32)
EOF

# 4. Start everything
docker compose up -d

# 5. Verify
docker compose ps
curl -f https://your-domain.com/actuator/health
```

## Services

| Service | URL |
|---------|-----|
| App | https://your-domain.com |
| Grafana | https://your-domain.com:3000 (admin / $GRAFANA_ADMIN_PASSWORD) |
| Prometheus | internal (http://prometheus:9090) |
| Loki | internal (http://loki:3100) |

## Logs

- All container logs → Promtail → Loki → Grafana Explore (Loki datasource)
- Backend JSON logs include: correlationId, userId, deviceId, chatId in MDC
- Grafana dashboard "Chaos Messenger - Overview" shows metrics + logs

## Known Issues

- CORS is configured for the domain, local dev may break
- Prometheus auth is disabled (public-prometheus-enabled=true) — acceptable for demo
- No automated backups — use pg_dump manually
