package ru.messenger.chaosmessenger.user;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import ru.messenger.chaosmessenger.TestFixtures;
import ru.messenger.chaosmessenger.chat.repository.ChatParticipantRepository;
import ru.messenger.chaosmessenger.infra.security.JwtService;
import ru.messenger.chaosmessenger.user.api.UserController;
import ru.messenger.chaosmessenger.user.domain.User;
import ru.messenger.chaosmessenger.user.dto.CurrentUserResponse;
import ru.messenger.chaosmessenger.user.dto.UpdateProfileRequest;
import ru.messenger.chaosmessenger.user.dto.UpdateProfileResponse;
import ru.messenger.chaosmessenger.user.dto.UserProfileResponse;
import ru.messenger.chaosmessenger.user.dto.UserSearchResponse;
import ru.messenger.chaosmessenger.user.repository.UserRepository;
import ru.messenger.chaosmessenger.user.service.UserService;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock UserService userService;
    @Mock UserRepository userRepository;
    @Mock JwtService jwtService;
    @Mock ChatParticipantRepository participantRepository;
    @Mock SimpMessagingTemplate messagingTemplate;
    @Mock Authentication authentication;

    @InjectMocks UserController userController;

    private User alice;
    private User bob;

    @BeforeEach
    void setUp() {
        alice = TestFixtures.user(1L, "alice");
        alice.setFirstName("Alice");
        alice.setLastName("Smith");
        alice.setAvatarUrl("alice.png");

        bob = TestFixtures.user(2L, "bob");
        bob.setFirstName("Bob");
        bob.setLastName("Brown");
        bob.setAvatarUrl("bob.png");
    }

    @Test
    void searchReturnsPublicUserMaps() {
        when(userService.searchUsers("ali"))
                .thenReturn(List.of(new UserSearchResponse(
                        alice.getId(),
                        alice.getUsername(),
                        alice.getFirstName(),
                        alice.getLastName(),
                        alice.getAvatarUrl()
                )));

        List<UserSearchResponse> response = userController.search("ali");

        assertThat(response).hasSize(1);
        assertThat(response.get(0).id()).isEqualTo(1L);
        assertThat(response.get(0).username()).isEqualTo("alice");
        assertThat(response.get(0).firstName()).isEqualTo("Alice");
        assertThat(response.get(0).lastName()).isEqualTo("Smith");
        assertThat(response.get(0).avatarUrl()).isEqualTo("alice.png");
    }

    @Test
    void meDelegatesToUserService() {
        CurrentUserResponse expected = new CurrentUserResponse(
                1L,
                "alice",
                "alice@test.com",
                "Alice",
                "Smith",
                null,
                "alice.png",
                "legacy-key"
        );

        when(authentication.getName()).thenReturn("alice");
        when(userService.getCurrentUser("alice")).thenReturn(expected);

        assertThat(userController.me(authentication)).isSameAs(expected);
    }

    @Test
    void profileDelegatesToUserService() {
        UserProfileResponse expected = new UserProfileResponse(
                1L,
                "alice",
                "alice@test.com",
                "Alice",
                "Smith",
                null,
                "alice.png"
        );

        when(authentication.getName()).thenReturn("alice");
        when(userService.getProfile("alice")).thenReturn(expected);

        assertThat(userController.profile(authentication)).isSameAs(expected);
    }

    @Test
    void updateProfileReturnsNewTokenAndNotifiesSharedChats() {
        UpdateProfileRequest request = new UpdateProfileRequest(null, null, null, null, "alice_new");

        UpdateProfileResponse updated = new UpdateProfileResponse(
                1L,
                "alice_new",
                "alice@test.com",
                "Alice",
                "Smith",
                null,
                "new-avatar.png",
                "jwt-new"
        );

        when(authentication.getName()).thenReturn("alice");
        when(userService.updateProfile("alice", request)).thenReturn(updated);

        UpdateProfileResponse response = userController.updateProfile(authentication, request);

        assertThat(response).isSameAs(updated);
        assertThat(response.token()).isEqualTo("jwt-new");
    }
}
