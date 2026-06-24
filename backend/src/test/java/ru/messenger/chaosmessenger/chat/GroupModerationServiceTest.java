package ru.messenger.chaosmessenger.chat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.messenger.chaosmessenger.TestFixtures;
import ru.messenger.chaosmessenger.chat.access.ChatAccessService;
import ru.messenger.chaosmessenger.chat.access.ChatQueryService;
import ru.messenger.chaosmessenger.chat.domain.Chat;
import ru.messenger.chaosmessenger.chat.domain.ChatParticipant;
import ru.messenger.chaosmessenger.chat.domain.GroupRole;
import ru.messenger.chaosmessenger.chat.dto.ChatResponse;
import ru.messenger.chaosmessenger.chat.dto.UpdateGroupParticipantsRequest;
import ru.messenger.chaosmessenger.chat.dto.UpdateGroupRoleRequest;
import ru.messenger.chaosmessenger.chat.repository.ChatParticipantRepository;
import ru.messenger.chaosmessenger.chat.repository.ChatRepository;
import ru.messenger.chaosmessenger.chat.service.GroupModerationService;
import ru.messenger.chaosmessenger.common.exception.ChatException;
import ru.messenger.chaosmessenger.user.domain.User;
import ru.messenger.chaosmessenger.user.repository.UserRepository;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("GroupModerationService")
class GroupModerationServiceTest {

    @Mock UserRepository userRepository;
    @Mock ChatRepository chatRepository;
    @Mock ChatParticipantRepository participantRepository;
    @Mock ChatAccessService chatAccessService;
    @Mock ChatQueryService chatQueryService;

    @InjectMocks GroupModerationService groupModerationService;

    User alice;
    User bob;

    @BeforeEach
    void setUp() {
        alice = TestFixtures.user(1L, "alice");
        bob = TestFixtures.user(2L, "bob");
    }

    @Nested
    @DisplayName("createGroupChat")
    class CreateGroupChat {

        @Test
        @DisplayName("creates a group chat with several participants")
        void createsGroup() {
            User charlie = TestFixtures.user(3L, "charlie");
            when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
            when(userRepository.findAllById(List.of(2L, 3L))).thenReturn(List.of(bob, charlie));

            Chat saved = TestFixtures.groupChat(20L, "Team");
            when(chatRepository.save(any())).thenReturn(saved);
            when(participantRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

            Long chatId = groupModerationService.createGroupChat("alice", "Team", List.of(2L, 3L));

            assertThat(chatId).isEqualTo(20L);
            verify(participantRepository).saveAll(argThat((Iterable<ChatParticipant> participants) -> {
                int count = 0;
                for (ChatParticipant ignored : participants) count++;
                return count == 3;
            }));
            verify(participantRepository, never()).save(any());
        }

        @Test
        @DisplayName("deduplicates members and ignores creator id")
        void deduplicatesMembersAndIgnoresCreatorId() {
            when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
            when(userRepository.findAllById(List.of(2L))).thenReturn(List.of(bob));

            Chat saved = TestFixtures.groupChat(20L, "Team");
            when(chatRepository.save(any())).thenReturn(saved);
            when(participantRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

            Long chatId = groupModerationService.createGroupChat("alice", "Team", List.of(1L, 2L, 2L));

            assertThat(chatId).isEqualTo(20L);
            verify(userRepository).findAllById(List.of(2L));
            verify(participantRepository).saveAll(argThat((Iterable<ChatParticipant> participants) -> {
                List<Long> userIds = new java.util.ArrayList<>();
                for (ChatParticipant p : participants) userIds.add(p.getUserId());
                return userIds.equals(List.of(1L, 2L));
            }));
        }

        @Test
        @DisplayName("rejects a group where creator is the only member")
        void rejectsCreatorOnlyGroup() {
            when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
            assertThatThrownBy(() -> groupModerationService.createGroupChat("alice", "Group", List.of(1L, 1L)))
                    .isInstanceOf(ChatException.class)
                    .hasMessageContaining("other member");
            verify(userRepository, never()).findAllById(anyList());
            verify(chatRepository, never()).save(any());
        }

        @Test
        @DisplayName("rejects creating a group without a name")
        void rejectsBlankName() {
            assertThatThrownBy(() -> groupModerationService.createGroupChat("alice", "  ", List.of(2L)))
                    .isInstanceOf(ChatException.class)
                    .hasMessageContaining("name");
        }

        @Test
        @DisplayName("rejects creating a group without members")
        void rejectsEmptyMembers() {
            assertThatThrownBy(() -> groupModerationService.createGroupChat("alice", "Group", List.of()))
                    .isInstanceOf(ChatException.class)
                    .hasMessageContaining("member");
        }
    }

    @Nested
    @DisplayName("inviteGroupParticipants")
    class InviteGroupParticipants {

        @Test
        @DisplayName("invites new users when actor has permission")
        void invitesUsers() {
            User charlie = TestFixtures.user(3L, "charlie");
            Chat group = TestFixtures.groupChat(20L, "Team");
            group.setWhoCanInvite("ADMINS");

            when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
            when(chatAccessService.requireActiveGroup(20L)).thenReturn(group);
            when(chatAccessService.requireParticipantEntity(20L, 1L))
                    .thenReturn(new ChatParticipant(20L, 1L, GroupRole.OWNER));
            when(participantRepository.findByChatId(20L)).thenReturn(List.of(
                    new ChatParticipant(20L, 1L, GroupRole.OWNER),
                    new ChatParticipant(20L, 2L, GroupRole.MEMBER)
            ));
            when(userRepository.findAllById(List.of(3L))).thenReturn(List.of(charlie));
            when(participantRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
            when(participantRepository.findDistinctUsernamesByChatId(20L)).thenReturn(List.of("alice", "bob", "charlie"));
            when(chatQueryService.getChatForUser("alice", 20L)).thenReturn(mock(ChatResponse.class));

            ChatResponse response = groupModerationService.inviteGroupParticipants(
                    "alice", 20L, new UpdateGroupParticipantsRequest(List.of(3L))
            );
            assertThat(response).isNotNull();
            verify(participantRepository).saveAll(anyList());
        }
    }

    @Nested
    @DisplayName("RBAC matrix")
    class RbacMatrix {

        @Test
        void adminCannotAssignAdminRole() {
            Chat group = TestFixtures.groupChat(20L, "Team");
            when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
            when(chatAccessService.requireActiveGroup(20L)).thenReturn(group);
            when(chatAccessService.requireParticipantEntity(20L, 1L))
                    .thenReturn(new ChatParticipant(20L, 1L, GroupRole.ADMIN));
            when(chatAccessService.requireParticipantEntity(20L, 2L))
                    .thenReturn(new ChatParticipant(20L, 2L, GroupRole.MEMBER));

            assertThatThrownBy(() -> groupModerationService.updateGroupParticipantRole(
                    "alice", 20L, 2L, new UpdateGroupRoleRequest("ADMIN")))
                    .isInstanceOf(ChatException.class)
                    .hasMessageContaining("cannot assign admin role");
        }

        @Test
        void moderatorCannotChangeRoles() {
            Chat group = TestFixtures.groupChat(20L, "Team");
            when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
            when(chatAccessService.requireActiveGroup(20L)).thenReturn(group);
            when(chatAccessService.requireParticipantEntity(20L, 1L))
                    .thenReturn(new ChatParticipant(20L, 1L, GroupRole.MODERATOR));

            assertThatThrownBy(() -> groupModerationService.updateGroupParticipantRole(
                    "alice", 20L, 2L, new UpdateGroupRoleRequest("MEMBER")))
                    .isInstanceOf(ChatException.class)
                    .hasMessageContaining("Moderators cannot change participant roles");
        }

        @Test
        void adminCannotMuteOwner() {
            Chat group = TestFixtures.groupChat(20L, "Team");
            when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
            when(chatAccessService.requireActiveGroup(20L)).thenReturn(group);
            when(chatAccessService.requireParticipantEntity(20L, 1L))
                    .thenReturn(new ChatParticipant(20L, 1L, GroupRole.ADMIN));
            when(chatAccessService.requireParticipantEntity(20L, 2L))
                    .thenReturn(new ChatParticipant(20L, 2L, GroupRole.OWNER));

            assertThatThrownBy(() -> groupModerationService.muteGroupParticipant("alice", 20L, 2L, 15))
                    .isInstanceOf(ChatException.class)
                    .hasMessageContaining("Owner cannot be targeted");
        }

        @Test
        void moderatorCannotModerateAdmin() {
            Chat group = TestFixtures.groupChat(20L, "Team");
            when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
            when(chatAccessService.requireActiveGroup(20L)).thenReturn(group);
            when(chatAccessService.requireParticipantEntity(20L, 1L))
                    .thenReturn(new ChatParticipant(20L, 1L, GroupRole.MODERATOR));
            when(chatAccessService.requireParticipantEntity(20L, 2L))
                    .thenReturn(new ChatParticipant(20L, 2L, GroupRole.ADMIN));

            assertThatThrownBy(() -> groupModerationService.banGroupParticipant("alice", 20L, 2L, "policy"))
                    .isInstanceOf(ChatException.class)
                    .hasMessageContaining("only moderate members");
        }
    }
}
