package ru.messenger.chaosmessenger.attachment.access;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ru.messenger.chaosmessenger.attachment.domain.EncryptedAttachment;
import ru.messenger.chaosmessenger.chat.repository.ChatParticipantRepository;

@Service
@RequiredArgsConstructor
public class AttachmentAccessService {

    private final ChatParticipantRepository chatParticipantRepository;

    public boolean canUpload(Long chatId, Long userId) {
        return chatId == null || chatParticipantRepository.existsByChatIdAndUserId(chatId, userId);
    }

    public boolean canDownload(EncryptedAttachment attachment, Long userId) {
        if (attachment.getUploaderId().equals(userId)) {
            return true;
        }
        Long chatId = attachment.getChatId();
        return chatId != null && chatParticipantRepository.existsByChatIdAndUserId(chatId, userId);
    }
}
