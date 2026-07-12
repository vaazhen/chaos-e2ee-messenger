package ru.messenger.chaosmessenger.attachment.service;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import ru.messenger.chaosmessenger.attachment.domain.EncryptedAttachment;
import ru.messenger.chaosmessenger.attachment.repository.EncryptedAttachmentRepository;

import java.io.IOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
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
        if (uploaderId == null) {
            throw new IllegalArgumentException("Uploader is required");
        }
        if (encryptedData == null || encryptedData.length == 0) {
            throw new IllegalArgumentException("Encrypted attachment is empty");
        }
        if (encryptedData.length > maxBytes) {
            throw new IllegalArgumentException("Encrypted attachment exceeds the configured limit");
        }

        String attachmentId = UUID.randomUUID().toString();
        Path finalPath = resolveSafePath(attachmentId);
        Path tempPath = Files.createTempFile(storageRoot, ".upload-", ".tmp");
        boolean moved = false;
        try {
            Files.write(tempPath, encryptedData);
            moveAtomically(tempPath, finalPath);
            moved = true;

            EncryptedAttachment attachment = new EncryptedAttachment();
            attachment.setAttachmentId(attachmentId);
            attachment.setUploaderId(uploaderId);
            attachment.setChatId(chatId);
            attachment.setFileSize((long) encryptedData.length);
            attachment.setContentType(contentType);
            attachment.setCreatedAt(LocalDateTime.now());
            attachmentRepository.save(attachment);

            deleteFileIfTransactionRollsBack(finalPath);
            log.debug("Stored encrypted attachment {} ({} bytes) for user {}",
                    attachmentId, encryptedData.length, uploaderId);
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

    public byte[] download(String attachmentId) throws IOException {
        validateAttachmentId(attachmentId);
        attachmentRepository.findByAttachmentId(attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Attachment not found"));

        Path filePath = resolveSafePath(attachmentId);
        if (!Files.isRegularFile(filePath)) {
            throw new IllegalArgumentException("Attachment payload not found");
        }
        return Files.readAllBytes(filePath);
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
