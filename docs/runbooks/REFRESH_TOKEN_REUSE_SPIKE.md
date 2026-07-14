# Refresh Token Reuse Spike Runbook

## Symptoms
- Alert `RefreshReuseSpike` fires (multiple reuse detections within short window)
- Users report being logged out unexpectedly
- Multiple `RefreshTokenService` log entries: "Refresh token reuse detected — family revoked"

## Probable causes
1. Token theft — attacker stole a refresh token from a user
2. Network retry — legitimate client retries refresh, first request consumed token, second sees it as "used"
3. Client bug — multiple instances/tabs competing for refresh

## Safe actions
1. Identify affected user(s): check Redis for `refresh:family:revoked:*` keys
2. Check auth logs for IP/user-agent patterns around reuse events
3. If legitimate retry storm: skip — resolves after client gets new tokens
4. If theft pattern (different IPs): revoke ALL token families for affected user(s)

## What NOT to do
- Do NOT disable reuse detection — this is the primary theft detection mechanism
- Do NOT clear all revoked families — destroys audit trail

## Recovery procedure
1. Query: `redis-cli KEYS "refresh:family:revoked:*" | wc -l`
2. For theft cases: block the attacker's IP, force password reset for affected users
3. For retry storms: investigate client timeout/retry configuration
4. Monitor `auth_refresh_reuse_total` counter for normalization

## Post-recovery verification
- Alert `RefreshReuseSpike` resolves
- Affected users can log in with fresh credentials
- No new theft patterns detected
