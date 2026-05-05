package ru.messenger.chaosmessenger.chat.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import ru.messenger.chaosmessenger.user.domain.User;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_participants",
        uniqueConstraints = @UniqueConstraint(columnNames = {"chat_id", "user_id"}))
@Getter
@Setter
public class ChatParticipant {

    public ChatParticipant() {
    }

    public ChatParticipant(Long chatId, Long userId) {
        this.chatId = chatId;
        this.userId = userId;
        this.role = "MEMBER";
    }

    public ChatParticipant(Long chatId, Long userId, GroupRole role) {
        this.chatId = chatId;
        this.userId = userId;
        this.role = role == null ? "MEMBER" : role.name();
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "chat_id", nullable = false)
    private Long chatId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /**
     * Participant's role in the chat. For DIRECT chats this stays {@code MEMBER}
     * (UI ignores it). For GROUP chats one of {@code OWNER/ADMIN/MODERATOR/MEMBER}.
     */
    @Column(name = "role", length = 16, nullable = false)
    private String role = "MEMBER";

    public GroupRole groupRole() {
        return GroupRole.fromString(role);
    }

    public void setGroupRole(GroupRole role) {
        this.role = role == null ? "MEMBER" : role.name();
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_id", insertable = false, updatable = false)
    private Chat chat;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    @Column(name = "muted_until")
    private LocalDateTime mutedUntil;

    @Column(name = "banned_at")
    private LocalDateTime bannedAt;

    @Column(name = "banned_by")
    private Long bannedBy;

    @Column(name = "ban_reason", length = 255)
    private String banReason;

    public boolean isMutedNow() {
        return mutedUntil != null && mutedUntil.isAfter(LocalDateTime.now());
    }

    public boolean isBanned() {
        return bannedAt != null;
    }
}
