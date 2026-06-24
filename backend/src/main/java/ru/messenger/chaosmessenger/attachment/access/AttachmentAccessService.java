package ru.messenger.chaosmessenger.attachment.access;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ru.messenger.chaosmessenger.attachment.domain.EncryptedAttachment;
import ru.messenger.chaosmessenger.chat.repository.ChatParticipantRepository;

@Service
@RequiredArgsConstructor
public class AttachmentAccessService {

    private final ChatParticipantRepository chatParticipantRepository;

    public boolean canDownload(EncryptedAttachment attachment, Long userId) {
        if (attachment.getUploaderId().equals(userId)) {
            return true;
        }
        return chatParticipantRepository.shareAnyChat(attachment.getUploaderId(), userId);
    }
}
