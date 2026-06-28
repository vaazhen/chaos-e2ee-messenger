package ru.messenger.chaosmessenger.attachment.service;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.messenger.chaosmessenger.attachment.domain.EncryptedAttachment;
import ru.messenger.chaosmessenger.attachment.repository.EncryptedAttachmentRepository;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AttachmentStorageService {

    private final EncryptedAttachmentRepository attachmentRepository;

    @Value("${chaos.attachments.storage-path:./attachments}")
    private String storagePath;

    @PostConstruct
    void init() throws IOException {
        Path dir = Path.of(storagePath);
        if (!Files.exists(dir)) {
            Files.createDirectories(dir);
            log.info("Created attachment storage directory: {}", dir.toAbsolutePath());
        }
    }

    @Transactional
    public String upload(Long uploaderId, Long chatId, byte[] encryptedData, String contentType) throws IOException {
        String attachmentId = UUID.randomUUID().toString();

        Path filePath = Path.of(storagePath, attachmentId);
        Files.write(filePath, encryptedData);

        EncryptedAttachment attachment = new EncryptedAttachment();
        attachment.setAttachmentId(attachmentId);
        attachment.setUploaderId(uploaderId);
        attachment.setChatId(chatId);
        attachment.setFileSize((long) encryptedData.length);
        attachment.setContentType(contentType);
        attachment.setCreatedAt(LocalDateTime.now());
        attachmentRepository.save(attachment);

        log.debug("Stored attachment {} ({} bytes) for user {}", attachmentId, encryptedData.length, uploaderId);
        return attachmentId;
    }

    public byte[] download(String attachmentId) throws IOException {
        attachmentRepository.findByAttachmentId(attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Attachment not found: " + attachmentId));

        Path filePath = Path.of(storagePath, attachmentId);
        return Files.readAllBytes(filePath);
    }

    public EncryptedAttachment findByAttachmentId(String attachmentId) {
        return attachmentRepository.findByAttachmentId(attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Attachment not found: " + attachmentId));
    }
}
