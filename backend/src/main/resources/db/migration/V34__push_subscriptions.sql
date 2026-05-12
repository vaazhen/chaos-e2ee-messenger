CREATE TABLE push_subscriptions (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES users(id),
    device_id   VARCHAR(100) NOT NULL,
    endpoint    TEXT         NOT NULL,
    p256dh      TEXT         NOT NULL,
    auth_key    TEXT         NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT now(),
    UNIQUE(user_id, device_id)
);
CREATE INDEX idx_push_subs_user ON push_subscriptions(user_id);
