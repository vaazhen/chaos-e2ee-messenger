package ru.messenger.chaosmessenger.user;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.messenger.chaosmessenger.TestFixtures;
import ru.messenger.chaosmessenger.user.domain.User;
import ru.messenger.chaosmessenger.chat.repository.ChatParticipantRepository;
import ru.messenger.chaosmessenger.infra.security.JwtService;
import ru.messenger.chaosmessenger.outbox.OutboxService;
import ru.messenger.chaosmessenger.user.dto.UpdateProfileRequest;
import ru.messenger.chaosmessenger.user.repository.UserRepository;
import ru.messenger.chaosmessenger.user.service.UserIdentityService;
import ru.messenger.chaosmessenger.user.service.UserService;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock UserRepository userRepository;
    @Mock UserIdentityService userIdentityService;
    @Mock JwtService jwtService;
    @Mock ChatParticipantRepository participantRepository;
    @Mock OutboxService outboxService;

    @InjectMocks UserService userService;

    private User alice;

    @BeforeEach
    void setUp() {
        alice = TestFixtures.user(1L, "alice");
        alice.setEmail("alice@test.com");
        alice.setFirstName("Alice");
        alice.setLastName("Smith");
        alice.setAvatarUrl("avatar.png");
        alice.setPublicKey("legacy-public-key");
        lenient().when(participantRepository.findDistinctUsernamesSharingChatsWithUserId(anyLong())).thenReturn(List.of());
    }

    @Test
    void findByUsernameReturnsSummary() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));

        var response = userService.findByUsername("alice");

        assertThat(response.id()).isEqualTo(1L);
        assertThat(response.username()).isEqualTo("alice");
    }

    @Test
    void findByUsernameThrowsWhenMissing() {
        when(userRepository.findByUsername("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.findByUsername("missing"))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessageContaining("User not found: missing");
    }

    @Test
    void getCurrentUserMapsAllFields() {
        when(userIdentityService.require("alice")).thenReturn(alice);

        var response = userService.getCurrentUser("alice");

        assertThat(response.id()).isEqualTo(1L);
        assertThat(response.username()).isEqualTo("alice");
        assertThat(response.email()).isEqualTo("alice@test.com");
        assertThat(response.firstName()).isEqualTo("Alice");
        assertThat(response.lastName()).isEqualTo("Smith");
        assertThat(response.avatarUrl()).isEqualTo("avatar.png");
        assertThat(response.publicKey()).isEqualTo("legacy-public-key");
    }

    @Test
    void getProfileMapsPublicProfileFields() {
        when(userIdentityService.require("alice")).thenReturn(alice);

        var response = userService.getProfile("alice");

        assertThat(response.id()).isEqualTo(1L);
        assertThat(response.username()).isEqualTo("alice");
        assertThat(response.email()).isEqualTo("alice@test.com");
        assertThat(response.firstName()).isEqualTo("Alice");
        assertThat(response.lastName()).isEqualTo("Smith");
        assertThat(response.avatarUrl()).isEqualTo("avatar.png");
    }

    @Test
    void updateProfileTrimsNamesAvatarAndLowercasesUsername() {
        UpdateProfileRequest request = new UpdateProfileRequest("  John  ", "  Doe  ", null, "  data:image/jpeg;base64,abc  ", "  New_Name  ");

        when(userIdentityService.require("alice")).thenReturn(alice);
        when(userRepository.existsByUsername("new_name")).thenReturn(false);
        when(userRepository.save(alice)).thenReturn(alice);
        when(jwtService.generateToken("new_name")).thenReturn("jwt-new-name");
        when(participantRepository.findDistinctUsernamesSharingChatsWithUserId(1L)).thenReturn(List.of());

        var response = userService.updateProfile("alice", request);

        assertThat(alice.getFirstName()).isEqualTo("John");
        assertThat(alice.getLastName()).isEqualTo("Doe");
        assertThat(alice.getAvatarUrl()).isEqualTo("data:image/jpeg;base64,abc");
        assertThat(alice.getUsername()).isEqualTo("new_name");

        assertThat(response.username()).isEqualTo("new_name");
        assertThat(response.firstName()).isEqualTo("John");
        assertThat(response.lastName()).isEqualTo("Doe");

        verify(userRepository).save(alice);
        verify(outboxService).write(
                eq("user"),
                eq("1"),
                eq("PROFILE_UPDATED"),
                org.mockito.ArgumentMatchers.argThat(payload -> payload instanceof java.util.Map
                        && ((java.util.Map<?, ?>) payload).get("participantUsernames").equals(List.of())),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.startsWith("user:1:PROFILE_UPDATED:")
        );
    }

    @Test
    void updateProfileClearsAvatarWhenBlankValueIsSubmitted() {
        UpdateProfileRequest request = new UpdateProfileRequest(null, null, null, "   ", null);

        when(userIdentityService.require("alice")).thenReturn(alice);
        when(userRepository.save(alice)).thenReturn(alice);
        when(jwtService.generateToken("alice")).thenReturn("jwt-alice");

        var response = userService.updateProfile("alice", request);

        assertThat(alice.getAvatarUrl()).isNull();
        assertThat(response.avatarUrl()).isNull();
    }

    @Test
    void updateProfileDoesNotCheckAvailabilityWhenUsernameIsSameIgnoringCase() {
        UpdateProfileRequest request = new UpdateProfileRequest(null, null, null, null, "ALICE");

        when(userIdentityService.require("alice")).thenReturn(alice);
        when(userRepository.save(alice)).thenReturn(alice);
        when(jwtService.generateToken("alice")).thenReturn("jwt-alice");

        var response = userService.updateProfile("alice", request);

        assertThat(response.username()).isEqualTo("alice");
        verify(userRepository, never()).existsByUsername("alice");
    }

    @Test
    void updateProfileIgnoresBlankUsername() {
        UpdateProfileRequest request = new UpdateProfileRequest(null, null, null, null, "   ");

        when(userIdentityService.require("alice")).thenReturn(alice);
        when(userRepository.save(alice)).thenReturn(alice);
        when(jwtService.generateToken("alice")).thenReturn("jwt-alice");

        var response = userService.updateProfile("alice", request);

        assertThat(response.username()).isEqualTo("alice");
        verify(userRepository, never()).existsByUsername(org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void updateProfileRejectsInvalidUsername() {
        UpdateProfileRequest request = new UpdateProfileRequest(null, null, null, null, "bad-name!");

        when(userIdentityService.require("alice")).thenReturn(alice);

        assertThatThrownBy(() -> userService.updateProfile("alice", request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Username must be 3-32 chars");

        verify(userRepository, never()).save(alice);
        verify(outboxService, never()).write(any(), any(), any(), any(), any(), any());
    }

    @Test
    void updateProfileRejectsTakenUsername() {
        UpdateProfileRequest request = new UpdateProfileRequest(null, null, null, null, "bob");

        when(userIdentityService.require("alice")).thenReturn(alice);
        when(userRepository.existsByUsername("bob")).thenReturn(true);

        assertThatThrownBy(() -> userService.updateProfile("alice", request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Username \"bob\" is already taken");

        verify(userRepository, never()).save(alice);
        verify(outboxService, never()).write(any(), any(), any(), any(), any(), any());
    }
}

