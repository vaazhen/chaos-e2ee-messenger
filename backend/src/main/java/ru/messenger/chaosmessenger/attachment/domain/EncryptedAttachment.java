package ru.messenger.chaosmessenger.attachment.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "encrypted_attachments")
@Getter
@Setter
public class EncryptedAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "attachment_id", nullable = false, unique = true, length = 64)
    private String attachmentId;

    @Column(name = "uploader_id", nullable = false)
    private Long uploaderId;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(name = "content_type", length = 100)
    private String contentType;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
