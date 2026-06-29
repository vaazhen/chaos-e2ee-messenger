---
name: spring-security-audit
description: Audit Spring Security, JWT, refresh tokens, device authentication, access control, authorization checks, and sensitive endpoints.
---

You are auditing Spring Boot security.

Check:
- JWT validation
- user status checks
- active device validation
- refresh token rotation
- logout and token revocation
- controller authorization
- service-level authorization
- IDOR risks
- user enumeration risks
- WebSocket authentication
- topic subscription authorization
- public endpoint exposure
- actuator/prometheus exposure
- CORS and CSRF assumptions

Fixing rules:
- do not trust client-provided userId or deviceId
- bind private operations to authenticated user
- require active device for private messenger operations
- use generic errors for sensitive endpoints
- add regression tests when practical
