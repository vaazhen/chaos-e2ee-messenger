package ru.messenger.chaosmessenger.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.messenger.chaosmessenger.chat.dto.ChatListUpdateEvent;
import ru.messenger.chaosmessenger.chat.repository.ChatParticipantRepository;
import ru.messenger.chaosmessenger.common.TransactionUtils;
import ru.messenger.chaosmessenger.infra.security.JwtService;
import ru.messenger.chaosmessenger.user.domain.User;
import ru.messenger.chaosmessenger.user.dto.CurrentUserResponse;
import ru.messenger.chaosmessenger.user.dto.UpdateProfileRequest;
import ru.messenger.chaosmessenger.user.dto.UpdateProfileResponse;
import ru.messenger.chaosmessenger.user.dto.UserProfileResponse;
import ru.messenger.chaosmessenger.user.dto.UserSearchResponse;
import ru.messenger.chaosmessenger.user.dto.UserSummaryResponse;
import ru.messenger.chaosmessenger.user.repository.UserRepository;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserIdentityService userIdentityService;
    private final JwtService jwtService;
    private final ChatParticipantRepository participantRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public UserSummaryResponse findByUsername(String username) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NoSuchElementException("User not found: " + username));
        return new UserSummaryResponse(user.getId(), user.getUsername());
    }


    public List<UserSearchResponse> searchUsers(String q) {
        String query = q == null ? "" : q.trim();
        if (query.length() < 2) {
            return List.of();
        }

        return userRepository.findByUsernameContainingIgnoreCase(query, PageRequest.of(0, 20))
                .stream()
                .map(u -> new UserSearchResponse(
                        u.getId(),
                        u.getUsername(),
                        u.getFirstName(),
                        u.getLastName(),
                        u.getAvatarUrl()
                ))
                .toList();
    }

    public CurrentUserResponse getCurrentUser(String identity) {
        var user = userIdentityService.require(identity);
        return new CurrentUserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getAvatarUrl(),
                user.getPublicKey()
        );
    }

    public UserProfileResponse getProfile(String identity) {
        var user = userIdentityService.require(identity);
        return toProfileResponse(user);
    }

    @Transactional
    public UpdateProfileResponse updateProfile(String currentIdentity, UpdateProfileRequest request) {
        var user = userIdentityService.require(currentIdentity);

        if (request.firstName() != null) {
            user.setFirstName(request.firstName().trim());
        }

        if (request.lastName() != null) {
            user.setLastName(request.lastName().trim());
        }

        if (request.avatarUrl() != null) {
            user.setAvatarUrl(trimToNull(request.avatarUrl()));
        }

        if (request.username() != null && !request.username().isBlank()) {
            String newUsername = request.username().trim().toLowerCase();

            if (!newUsername.matches("^[a-z0-9_]{3,32}$")) {
                throw new IllegalArgumentException("Username must be 3-32 chars: a-z, 0-9, underscore");
            }

            if (!newUsername.equalsIgnoreCase(user.getUsername())) {
                boolean taken = userRepository.existsByUsername(newUsername);
                if (taken) {
                    throw new IllegalArgumentException("Username \"" + newUsername + "\" is already taken");
                }

                user.setUsername(newUsername);
            }
        }

        user = userRepository.save(user);
        UserProfileResponse updated = toProfileResponse(user);
        String token = jwtService.generateToken(updated.username());

        Long updatedUserId = updated.id();
        TransactionUtils.afterCommit(() -> notifySharedChatsAboutProfileUpdate(updatedUserId));

        return new UpdateProfileResponse(
                updated.id(),
                updated.username(),
                updated.email(),
                updated.firstName(),
                updated.lastName(),
                updated.avatarUrl(),
                token
        );
    }

    private UserProfileResponse toProfileResponse(User user) {
        return new UserProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getAvatarUrl()
        );
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void notifySharedChatsAboutProfileUpdate(Long updatedUserId) {
        ChatListUpdateEvent payload = ChatListUpdateEvent.profileUpdated(updatedUserId);

        participantRepository.findDistinctUsernamesSharingChatsWithUserId(updatedUserId)
                .forEach(username -> messagingTemplate.convertAndSend(
                        "/topic/users/" + username + "/chats",
                        payload
                ));
    }
}
