# Contributing

## Prerequisites

- Java 17+
- PostgreSQL 15+
- Redis 7+
- Kafka 3.5+ (only for horizontal WebSocket mode)
- Node.js 18+ (for frontend)

## Local Development

### 1. Start dependencies

```bash
docker run -d --name postgres -p 5432:5432 -e POSTGRES_DB=chaos -e POSTGRES_USER=chaos -e POSTGRES_PASSWORD=chaos postgres:15
docker run -d --name redis -p 6379:6379 redis:7
```

### 2. Build

```bash
cd backend
./mvnw clean compile -Dcheckstyle.skip=true
```

### 3. Run

```bash
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/chaos
export SPRING_DATASOURCE_USERNAME=chaos
export SPRING_DATASOURCE_PASSWORD=chaos
export JWT_SECRET=$(openssl rand -hex 32)
./mvnw spring-boot:run -Dcheckstyle.skip=true
```

Kafka is disabled by default (`chaos.kafka.enabled=false`). Events fan out directly via `SimpMessagingTemplate`.

### 4. Enable Kafka (for horizontal scaling testing)

```bash
export KAFKA_BOOTSTRAP_SERVERS=localhost:9092
./mvnw spring-boot:run -Dcheckstyle.skip=true -Dchaos.kafka.enabled=true
```

## Code Style

- Java 17, no `var` in public API signatures
- Lombok `@RequiredArgsConstructor` for DI, avoid field injection
- No comments in business logic (intention-revealing method names instead)
- `@Transactional` on service methods that modify data
- Controllers must not depend on Repositories (enforced by ArchUnit tests)
- Facade services must only delegate; all logic goes in sub-services

## Testing

```bash
# Unit + integration tests
./mvnw test -Dcheckstyle.skip=true

# ArchUnit layer tests
./mvnw test -Dtest=ArchitectureTest -Dcheckstyle.skip=true
```

### Test conventions
- Use Testcontainers for PostgreSQL in integration tests
- Mock `SimpMessagingTemplate` for WebSocket fanout tests
- Do NOT test generated DTOs (records) or Lombok `@Data` entities

## Database Migrations

- Flyway in `src/main/resources/db/migration/V{version}__{name}.sql`
- Naming: `V36__outbox_events.sql`
- All migrations must be reversible (include `DROP` in comments if needed)
- Never modify an existing migration — create a new one

## Adding a New Domain Event to the Outbox

1. Write the event in a `@Transactional` service method via `OutboxService.write(aggregateType, aggregateId, eventType, payload)`
2. Add the event type constant to `WebSocketEventConsumer`'s type lists
3. Add a handler method in `WebSocketEventConsumer` that sends to the right STOMP topic
4. Test locally with `chaos.kafka.enabled=false` (direct path), then `=true` (outbox path)

## Architecture Decisions

See [docs/adr](adr/) for all Architecture Decision Records:
- [ADR-001](adr/ADR-001-transactional-outbox.md) — Kafka + Transactional Outbox
- [ADR-002](adr/ADR-002-service-decomposition.md) — ChatService/MessageService split

## Deployment

- Production: `chaos.kafka.enabled=true`, requires a Kafka cluster
- Demo: `chaos.kafka.enabled=false`, single instance with VPS
- Docker build: `./mvnw package -DskipTests -Dcheckstyle.skip=true`
