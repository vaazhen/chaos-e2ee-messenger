ALTER TABLE encrypted_attachments
    ADD COLUMN IF NOT EXISTS storage_backend VARCHAR(16) NOT NULL DEFAULT 'LOCAL',
    ADD COLUMN IF NOT EXISTS object_key VARCHAR(512),
    ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'READY',
    ADD COLUMN IF NOT EXISTS checksum_sha256 VARCHAR(128),
    ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

UPDATE encrypted_attachments
SET object_key = attachment_id,
    ready_at = COALESCE(ready_at, created_at)
WHERE object_key IS NULL;

ALTER TABLE encrypted_attachments
    ALTER COLUMN object_key SET NOT NULL;

ALTER TABLE encrypted_attachments
    ADD CONSTRAINT chk_encrypted_attachment_status
        CHECK (status IN ('PENDING', 'READY', 'DELETING'));

ALTER TABLE encrypted_attachments
    ADD CONSTRAINT chk_encrypted_attachment_backend
        CHECK (storage_backend IN ('LOCAL', 'S3'));

CREATE INDEX idx_attachments_unbound_cleanup
    ON encrypted_attachments(status, created_at)
    WHERE message_id IS NULL;
