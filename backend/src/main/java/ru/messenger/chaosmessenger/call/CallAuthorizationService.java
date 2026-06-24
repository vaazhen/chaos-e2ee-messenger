package ru.messenger.chaosmessenger.call;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ru.messenger.chaosmessenger.chat.repository.ChatParticipantRepository;
import ru.messenger.chaosmessenger.user.service.UserIdentityService;

@Slf4j
@Service
@RequiredArgsConstructor
public class CallAuthorizationService {

    private final UserIdentityService userIdentityService;
    private final ChatParticipantRepository chatParticipantRepository;

    public boolean isCallAllowed(String callerUsername, String targetUsername) {
        if (callerUsername == null || targetUsername == null || callerUsername.equals(targetUsername)) {
            log.warn("Call signaling denied: invalid caller/target {} -> {}", callerUsername, targetUsername);
            return false;
        }

        var caller = userIdentityService.resolve(callerUsername).orElse(null);
        var target = userIdentityService.resolve(targetUsername).orElse(null);

        if (caller == null || target == null) {
            log.warn("Call signaling denied: unknown user {} -> {}", callerUsername, targetUsername);
            return false;
        }

        if (!chatParticipantRepository.shareAnyChat(caller.getId(), target.getId())) {
            log.warn("Call signaling denied: no shared chat {} -> {}", callerUsername, targetUsername);
            return false;
        }

        return true;
    }
}
