-- Hot-path indexes for chat fanout, timeline pagination and bulk read/delivered receipts.
-- These are intentionally non-unique because old dev databases may already contain duplicate rows.

CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_user
    ON chat_participants(chat_id, user_id);

CREATE INDEX IF NOT EXISTS idx_chat_participants_user_chat
    ON chat_participants(user_id, chat_id);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id_id_desc
    ON messages(chat_id, id DESC);

CREATE INDEX IF NOT EXISTS idx_messages_chat_sender_status_deleted
    ON messages(chat_id, sender_id, status, deleted_at);

CREATE INDEX IF NOT EXISTS idx_messages_chat_created_id
    ON messages(chat_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_message_receipts_message_user_read
    ON message_receipts(message_id, user_id, read_at);

CREATE INDEX IF NOT EXISTS idx_message_receipts_message_delivered
    ON message_receipts(message_id, delivered_at);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_active
    ON user_devices(user_id)
    WHERE is_active = true;
