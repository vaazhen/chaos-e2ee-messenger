ALTER TABLE message_envelopes ADD COLUMN ratchet_public_key text;
ALTER TABLE message_envelopes ADD COLUMN previous_chain_length integer;
