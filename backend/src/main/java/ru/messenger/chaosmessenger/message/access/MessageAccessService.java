package ru.messenger.chaosmessenger.message.access;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ru.messenger.chaosmessenger.chat.repository.ChatParticipantRepository;
import ru.messenger.chaosmessenger.common.exception.ChatException;
import ru.messenger.chaosmessenger.crypto.device.CurrentDeviceService;
import ru.messenger.chaosmessenger.crypto.device.UserDevice;
import ru.messenger.chaosmessenger.user.domain.User;
import ru.messenger.chaosmessenger.user.service.UserIdentityService;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MessageAccessService {

    private final UserIdentityService userIdentityService;
    private final CurrentDeviceService currentDeviceService;
    private final ChatParticipantRepository participantRepository;

    public User requireUser(String username) {
        return userIdentityService.require(username);
    }

    public UserDevice requireCurrentDevice() {
        return currentDeviceService.requireCurrentDevice();
    }

    public void requireParticipant(Long chatId, Long userId) {
        if (!participantRepository.existsByChatIdAndUserId(chatId, userId)) {
            throw new ChatException("You are not a participant of this chat");
        }
    }

    public List<Long> participantIds(Long chatId) {
        return participantRepository.findUserIdsByChatId(chatId)
                .stream()
                .distinct()
                .toList();
    }

    public String deviceIdOrFallback(UserDevice currentDevice) {
        return currentDevice == null ? "unknown-device" : currentDevice.getDeviceId();
    }
}
