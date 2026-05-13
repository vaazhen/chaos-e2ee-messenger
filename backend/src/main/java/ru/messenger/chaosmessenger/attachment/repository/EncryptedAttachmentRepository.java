package ru.messenger.chaosmessenger.attachment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.messenger.chaosmessenger.attachment.domain.EncryptedAttachment;

import java.util.Optional;

public interface EncryptedAttachmentRepository extends JpaRepository<EncryptedAttachment, Long> {
    Optional<EncryptedAttachment> findByAttachmentId(String attachmentId);
}
