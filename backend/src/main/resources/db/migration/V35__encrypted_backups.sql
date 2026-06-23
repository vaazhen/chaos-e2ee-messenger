CREATE TABLE encrypted_backups (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    version     INTEGER NOT NULL DEFAULT 1,
    encrypted_payload TEXT NOT NULL,
    salt        VARCHAR(64) NOT NULL,
    iv          VARCHAR(64) NOT NULL,
    backup_type VARCHAR(20) NOT NULL DEFAULT 'FULL',
    file_size   INTEGER,
    checksum    VARCHAR(64),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, version)
);

CREATE INDEX idx_encrypted_backups_user_id ON encrypted_backups(user_id);
