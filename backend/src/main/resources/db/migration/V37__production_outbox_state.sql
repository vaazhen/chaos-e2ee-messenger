ALTER TABLE outbox_events
    ADD COLUMN IF NOT EXISTS event_id VARCHAR(36),
    ADD COLUMN IF NOT EXISTS event_version INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS schema_version INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 10,
    ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS locked_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS last_error TEXT,
    ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(150),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

UPDATE outbox_events
SET event_id = md5(random()::text || clock_timestamp()::text)
WHERE event_id IS NULL;

UPDATE outbox_events
SET idempotency_key = md5(random()::text || clock_timestamp()::text)
WHERE idempotency_key IS NULL;

UPDATE outbox_events
SET status = 'PUBLISHED'
WHERE published_at IS NOT NULL;

ALTER TABLE outbox_events
    ALTER COLUMN event_id SET NOT NULL,
    ALTER COLUMN idempotency_key SET NOT NULL;

ALTER TABLE outbox_events
    DROP CONSTRAINT IF EXISTS chk_outbox_events_status;

ALTER TABLE outbox_events
    ADD CONSTRAINT chk_outbox_events_status
    CHECK (status IN ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED', 'DEAD'));

CREATE UNIQUE INDEX IF NOT EXISTS ux_outbox_events_event_id ON outbox_events(event_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_outbox_events_idempotency_key ON outbox_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_outbox_events_status_next_attempt ON outbox_events(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_outbox_events_type ON outbox_events(event_type);
CREATE INDEX IF NOT EXISTS idx_outbox_events_occurred_at ON outbox_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_outbox_events_processing_lock ON outbox_events(status, locked_at);
