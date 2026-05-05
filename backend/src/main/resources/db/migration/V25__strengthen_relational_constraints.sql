-- Strengthen relational integrity for hot paths without breaking old dirty dev data.
-- NOT VALID foreign keys still protect all new writes and can be validated later after cleanup.

DELETE FROM chat_participants cp
USING chat_participants duplicate
WHERE cp.chat_id = duplicate.chat_id
  AND cp.user_id = duplicate.user_id
  AND cp.id > duplicate.id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_participants_chat_user
    ON chat_participants(chat_id, user_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_chat_participants_chat'
    ) THEN
        ALTER TABLE chat_participants
            ADD CONSTRAINT fk_chat_participants_chat
            FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_chat_participants_user'
    ) THEN
        ALTER TABLE chat_participants
            ADD CONSTRAINT fk_chat_participants_user
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_messages_chat'
    ) THEN
        ALTER TABLE messages
            ADD CONSTRAINT fk_messages_chat
            FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_messages_sender'
    ) THEN
        ALTER TABLE messages
            ADD CONSTRAINT fk_messages_sender
            FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_messages_sender_device'
    ) THEN
        ALTER TABLE messages
            ADD CONSTRAINT fk_messages_sender_device
            FOREIGN KEY (sender_device_id) REFERENCES user_devices(device_id) NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_message_envelopes_chat'
    ) THEN
        ALTER TABLE message_envelopes
            ADD CONSTRAINT fk_message_envelopes_chat
            FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_message_events_message'
    ) THEN
        ALTER TABLE message_events
            ADD CONSTRAINT fk_message_events_message
            FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_message_events_chat'
    ) THEN
        ALTER TABLE message_events
            ADD CONSTRAINT fk_message_events_chat
            FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_message_events_actor_user'
    ) THEN
        ALTER TABLE message_events
            ADD CONSTRAINT fk_message_events_actor_user
            FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_messages_version_positive'
    ) THEN
        ALTER TABLE messages
            ADD CONSTRAINT chk_messages_version_positive
            CHECK (version >= 1) NOT VALID;
    END IF;
END $$;
