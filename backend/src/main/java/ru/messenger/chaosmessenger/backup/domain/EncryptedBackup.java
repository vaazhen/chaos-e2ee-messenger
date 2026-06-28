package ru.messenger.chaosmessenger.backup.domain;

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
@Table(name = "encrypted_backups")
@Getter
@Setter
public class EncryptedBackup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "version", nullable = false)
    private Integer version;

    @Column(name = "encrypted_payload", nullable = false, columnDefinition = "TEXT")
    private String encryptedPayload;

    @Column(name = "salt", nullable = false, length = 64)
    private String salt;

    @Column(name = "iv", nullable = false, length = 64)
    private String iv;

    @Column(name = "backup_type", nullable = false, length = 20)
    private String backupType;

    @Column(name = "file_size")
    private Integer fileSize;

    @Column(name = "checksum", length = 64)
    private String checksum;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
