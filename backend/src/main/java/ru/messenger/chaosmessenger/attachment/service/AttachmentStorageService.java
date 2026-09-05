package ru.messenger.chaosmessenger.attachment.service;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.jdbc.core.JdbcTemplate;
import ru.messenger.chaosmessenger.attachment.domain.EncryptedAttachment;
import ru.messenger.chaosmessenger.attachment.repository.EncryptedAttachmentRepository;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class AttachmentStorageService {

    private static final Pattern ATTACHMENT_ID = Pattern.compile(
            "^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
            Pattern.CASE_INSENSITIVE
    );

    private final EncryptedAttachmentRepository attachmentRepository;
    private final JdbcTemplate jdbcTemplate;

    @Value("${chaos.attachments.storage-path:./attachments}")
    private String storagePath;

    @Value("${chaos.attachments.max-bytes:20971520}")
    private long maxBytes;

    private Path storageRoot;

    @PostConstruct
    void init() throws IOException {
        storageRoot = Path.of(storagePath).toAbsolutePath().normalize();
        Files.createDirectories(storageRoot);
        if (!Files.isDirectory(storageRoot) || !Files.isWritable(storageRoot)) {
            throw new IOException("Attachment storage is not a writable directory: " + storageRoot);
        }
        if (maxBytes <= 0) {
            throw new IllegalStateException("chaos.attachments.max-bytes must be positive");
        }
        log.info("Attachment ciphertext storage initialized at {}", storageRoot);
    }

    @Transactional
    public String upload(Long uploaderId, Long chatId, byte[] encryptedData, String contentType) throws IOException {
        if (encryptedData == null || encryptedData.length == 0) {
            throw new IllegalArgumentException("Encrypted attachment is empty");
        }
        return upload(uploaderId, chatId, new java.io.ByteArrayInputStream(encryptedData), contentType);
    }

    @Transactional
    public String upload(Long uploaderId, Long chatId, InputStream encryptedData, String contentType) throws IOException {
        if (uploaderId == null) {
            throw new IllegalArgumentException("Uploader is required");
        }
        if (encryptedData == null) {
            throw new IllegalArgumentException("Encrypted attachment is empty");
        }

        String attachmentId = UUID.randomUUID().toString();
        Path finalPath = resolveSafePath(attachmentId);
        Path tempPath = Files.createTempFile(storageRoot, ".upload-", ".tmp");
        boolean moved = false;
        try {
            long written = copyCapped(encryptedData, tempPath);
            if (written == 0) {
                throw new IllegalArgumentException("Encrypted attachment is empty");
            }
            moveAtomically(tempPath, finalPath);
            moved = true;

            jdbcTemplate.update(
                    """
                    INSERT INTO encrypted_attachments (
                        attachment_id, uploader_id, chat_id, file_size, content_type,
                        storage_backend, object_key, status, ready_at, version, created_at
                    ) VALUES (?, ?, ?, ?, ?, 'LOCAL', ?, 'READY', NOW(), 0, NOW())
                    """,
                    attachmentId,
                    uploaderId,
                    chatId,
                    written,
                    contentType,
                    attachmentId
            );

            deleteFileIfTransactionRollsBack(finalPath);
            log.debug("Stored encrypted attachment {} ({} bytes) for user {}",
                    attachmentId, written, uploaderId);
            return attachmentId;
        } catch (RuntimeException | IOException e) {
            if (moved) {
                Files.deleteIfExists(finalPath);
            }
            throw e;
        } finally {
            Files.deleteIfExists(tempPath);
        }
    }

    public Path payloadPath(String attachmentId) throws IOException {
        validateAttachmentId(attachmentId);
        attachmentRepository.findByAttachmentId(attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Attachment not found"));

        Path filePath = resolveSafePath(attachmentId);
        if (!Files.isRegularFile(filePath)) {
            throw new IllegalArgumentException("Attachment payload not found");
        }
        return filePath;
    }

    public byte[] download(String attachmentId) throws IOException {
        return Files.readAllBytes(payloadPath(attachmentId));
    }

    private long copyCapped(InputStream encryptedData, Path tempPath) throws IOException {
        long written = 0;
        try (OutputStream out = Files.newOutputStream(tempPath)) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = encryptedData.read(buffer)) >= 0) {
                written += read;
                if (written > maxBytes) {
                    throw new IllegalArgumentException("Encrypted attachment exceeds the configured limit");
                }
                out.write(buffer, 0, read);
            }
        }
        return written;
    }

    public EncryptedAttachment findByAttachmentId(String attachmentId) {
        validateAttachmentId(attachmentId);
        return attachmentRepository.findByAttachmentId(attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Attachment not found"));
    }

    private Path resolveSafePath(String attachmentId) {
        validateAttachmentId(attachmentId);
        Path resolved = storageRoot.resolve(attachmentId).normalize();
        if (!resolved.getParent().equals(storageRoot)) {
            throw new IllegalArgumentException("Invalid attachment id");
        }
        return resolved;
    }

    private void validateAttachmentId(String attachmentId) {
        if (attachmentId == null || !ATTACHMENT_ID.matcher(attachmentId).matches()) {
            throw new IllegalArgumentException("Invalid attachment id");
        }
    }

    private void moveAtomically(Path source, Path target) throws IOException {
        try {
            Files.move(source, target, StandardCopyOption.ATOMIC_MOVE);
        } catch (AtomicMoveNotSupportedException e) {
            Files.move(source, target);
        }
    }

    private void deleteFileIfTransactionRollsBack(Path path) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status == STATUS_ROLLED_BACK) {
                    try {
                        Files.deleteIfExists(path);
                    } catch (IOException e) {
                        log.error("Unable to remove attachment after transaction rollback: {}", path, e);
                    }
                }
            }
        });
    }
}
