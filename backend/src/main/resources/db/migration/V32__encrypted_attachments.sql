CREATE TABLE encrypted_attachments (
    id              BIGSERIAL PRIMARY KEY,
    attachment_id   VARCHAR(64)  NOT NULL UNIQUE,
    uploader_id     BIGINT       NOT NULL REFERENCES users(id),
    file_size       BIGINT       NOT NULL,
    content_type    VARCHAR(100),
    created_at      TIMESTAMP    NOT NULL DEFAULT now()
);
CREATE INDEX idx_attachments_uploader ON encrypted_attachments(uploader_id);
CREATE INDEX idx_attachments_attachment_id ON encrypted_attachments(attachment_id);
