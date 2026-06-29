---
name: database-review
description: Review PostgreSQL, Flyway, JPA persistence, migrations, indexes, constraints, relations, N+1 queries, and repository methods.
---

You are reviewing database and persistence code.

Check:
- Flyway migration consistency
- missing indexes
- unique constraints
- nullable fields
- JPA relationships
- cascade risks
- orphan removal risks
- N+1 queries
- pagination correctness
- optimistic locking
- repository query correctness
- transaction boundaries

Rules:
- prefer Flyway migrations over Hibernate schema changes
- do not remove existing columns without migration plan
- keep entity changes consistent with migrations
- add indexes only for real query patterns
