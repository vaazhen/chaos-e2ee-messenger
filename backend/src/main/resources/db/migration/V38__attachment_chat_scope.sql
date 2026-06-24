ALTER TABLE encrypted_attachments
    ADD COLUMN IF NOT EXISTS chat_id BIGINT REFERENCES chats(id),
    ADD COLUMN IF NOT EXISTS message_id BIGINT REFERENCES messages(id);

CREATE INDEX IF NOT EXISTS idx_attachments_chat_id ON encrypted_attachments(chat_id);
CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON encrypted_attachments(message_id);
