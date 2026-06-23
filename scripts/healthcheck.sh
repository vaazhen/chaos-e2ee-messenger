#!/usr/bin/env bash
# === Chaos Messenger — Deploy Validation Script ===
# Checks that all services are healthy
# Usage: bash scripts/healthcheck.sh [BASE_URL]
#   BASE_URL defaults to http://localhost

set -euo pipefail

BASE="${1:-http://localhost}"
PASS=0
FAIL=0
WARN=0

pass() { PASS=$((PASS+1)); echo "  ✓ $1"; }
warn() { WARN=$((WARN+1)); echo "  ⚠ $1"; }
fail() { FAIL=$((FAIL+1)); echo "  ✗ $1"; }

echo ""
echo "═══ Chaos Messenger — Deploy Validation ═══"
echo ""

# ── 1. Backend health ───────────────────────────────────────
echo "── 1. Backend API ──"
HEALTH=$(curl -sf "$BASE/actuator/health" || true)
if echo "$HEALTH" | grep -q '"status":"UP"'; then
  pass "Health endpoint: UP"
else
  fail "Health endpoint: $HEALTH"
fi

LIVENESS=$(curl -sf "$BASE/actuator/health/liveness" || true)
if echo "$LIVENESS" | grep -q '"status":"UP"'; then
  pass "Liveness probe: UP"
else
  fail "Liveness probe: $LIVENESS"
fi

READINESS=$(curl -sf "$BASE/actuator/health/readiness" || true)
if echo "$READINESS" | grep -q '"status":"UP"'; then
  pass "Readiness probe: UP"
else
  fail "Readiness probe: $READINESS"
fi

# ── 2. Database ─────────────────────────────────────────────
echo "── 2. Database ──"
DB=$(echo "$HEALTH" | grep -o '"postgres":"[^"]*"' || echo "")
if echo "$DB" | grep -q '"postgres":"UP"'; then
  pass "PostgreSQL: UP"
elif [ -z "$DB" ]; then
  warn "PostgreSQL health not exposed (add spring-boot-actuator dependency)"
else
  fail "PostgreSQL: not healthy"
fi

# ── 3. Redis ────────────────────────────────────────────────
echo "── 3. Redis ──"
REDIS=$(echo "$HEALTH" | grep -o '"redis":"[^"]*"' || echo "")
if echo "$REDIS" | grep -q '"redis":"UP"'; then
  pass "Redis: UP"
elif [ -z "$REDIS" ]; then
  warn "Redis health not exposed (add Redis health indicator)"
else
  fail "Redis: not healthy"
fi

# ── 4. Metrics (Prometheus scrape) ──────────────────────────
echo "── 4. Prometheus Metrics ──"
METRICS=$(curl -sf "$BASE/actuator/prometheus" | head -5 || true)
if echo "$METRICS" | grep -q "jvm_memory"; then
  pass "Prometheus metrics: UP"
else
  warn "Prometheus metrics not available"
fi

# ── 5. Swagger (disabled in prod) ──────────────────────────
echo "── 5. Swagger ──"
SWAGGER=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/swagger-ui/index.html" || echo "000")
if [ "$SWAGGER" = "404" ] || [ "$SWAGGER" = "000" ]; then
  pass "Swagger correctly disabled in prod"
elif [ "$SWAGGER" = "200" ]; then
  warn "Swagger is enabled (expected in dev, check prod config)"
else
  warn "Swagger returned HTTP $SWAGGER"
fi

# ── 6. Frontend ─────────────────────────────────────────────
echo "── 6. Frontend ──"
INDEX=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/" || echo "000")
if [ "$INDEX" = "200" ]; then
  pass "Frontend serves index.html"
elif [ "$INDEX" = "302" ] || [ "$INDEX" = "301" ]; then
  REDIRECT=$(curl -s -o /dev/null -w "%{redirect_url}" "$BASE/")
  pass "Frontend redirects to HTTPS ($REDIRECT)"
else
  warn "Frontend returned HTTP $INDEX (expected if behind reverse proxy)"
fi

# ── 7. SSL (if HTTPS) ──────────────────────────────────────
echo "── 7. SSL/TLS ──"
if echo "$BASE" | grep -q "^https"; then
  SSL_INFO=$(curl -sfI "$BASE/" 2>&1 || true)
  if echo "$SSL_INFO" | grep -qi "strict-transport-security"; then
    pass "HSTS header present"
  else
    warn "HSTS header missing"
  fi
  if echo "$SSL_INFO" | grep -qi "Let.s Encrypt"; then
    pass "SSL certificate: Let's Encrypt"
  else
    warn "SSL issuer unknown"
  fi
fi

# ── Summary ─────────────────────────────────────────────────
echo ""
echo "═══ Results: $PASS passed, $WARN warnings, $FAIL failed ═══"
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
