CREATE UNIQUE INDEX IF NOT EXISTS uq_user_devices_device_id
    ON user_devices(device_id);

DROP INDEX IF EXISTS uq_messages_client_message_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_messages_sender_device_client_message
    ON messages(sender_id, sender_device_id, client_message_id);
