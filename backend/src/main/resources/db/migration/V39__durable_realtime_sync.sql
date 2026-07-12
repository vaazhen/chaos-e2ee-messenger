CREATE TABLE realtime_device_events (
    sequence       BIGSERIAL PRIMARY KEY,
    device_id      VARCHAR(100) NOT NULL,
    event_id       VARCHAR(100) NOT NULL,
    destination    VARCHAR(255) NOT NULL,
    payload        JSONB NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_realtime_device_event UNIQUE (device_id, event_id, destination)
);

CREATE INDEX idx_realtime_device_events_sync
    ON realtime_device_events(device_id, sequence);

CREATE INDEX idx_realtime_device_events_created_at
    ON realtime_device_events(created_at);
