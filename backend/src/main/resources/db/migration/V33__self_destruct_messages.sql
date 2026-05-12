ALTER TABLE messages ADD COLUMN expires_at TIMESTAMP;
CREATE INDEX idx_messages_expires_at ON messages(expires_at) WHERE expires_at IS NOT NULL AND deleted_at IS NULL;
