package ru.messenger.chaosmessenger.chat.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

/**
 * A chat — the container for a conversation between two or more users.
 *
 * <p>Two chat types are supported:
 * <ul>
 *   <li>{@code DIRECT} — a private conversation between exactly two users.
 *       Created once and reused on subsequent requests.</li>
 *   <li>{@code GROUP} — a group chat with an arbitrary number of participants.
 *       Requires the {@link #name} field.</li>
 * </ul>
 *
 * <p>Messages are stored in {@link Message}; participants in {@link ChatParticipant}.
 * The chat itself stores only metadata, never encrypted content.
 */
@Entity
@Table(name = "chats")
@Getter
@Setter
public class Chat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Chat type: {@code "DIRECT"} or {@code "GROUP"}.
     */
    @Column(nullable = false)
    private String type;

    /**
     * Direct chat lifecycle:
     * - PENDING: created as a request (recipient must accept)
     * - ACCEPTED: normal direct chat
     * - DECLINED: recipient declined the request (treated as non-visible)
     *
     * Null for non-DIRECT chats.
     */
    @Column(name = "direct_status", length = 16)
    private String directStatus;

    /** Who initiated the direct request (user_id). Null for non-DIRECT chats. */
    @Column(name = "direct_requested_by")
    private Long directRequestedBy;

    /** Normalized user pair for DIRECT chats (low user id). */
    @Column(name = "direct_user_low_id")
    private Long directUserLowId;

    /** Normalized user pair for DIRECT chats (high user id). */
    @Column(name = "direct_user_high_id")
    private Long directUserHighId;

    /**
     * Display name — set only for {@code GROUP} chats.
     * Always {@code null} for {@code DIRECT} chats; the name comes from the other user's profile.
     */
    @Column(name = "name", length = 100)
    private String name;

    /** Optional group avatar URL. {@code null} for DIRECT chats. */
    @Column(name = "avatar_url", columnDefinition = "text")
    private String avatarUrl;

    /** Optional group description / bio. {@code null} for DIRECT chats. */
    @Column(name = "bio", length = 280)
    private String bio;

    /**
     * Group write policy: who is allowed to send messages.
     * One of {@code ALL}, {@code MODERATORS}, {@code ADMINS}, {@code OWNER}.
     */
    @Column(name = "who_can_write", length = 16, nullable = false)
    private String whoCanWrite = "ALL";

    /**
     * Group info edit policy: who can edit name/avatar/bio.
     * One of {@code ANYONE}, {@code MODERATORS}, {@code ADMINS}, {@code OWNER}.
     */
    @Column(name = "who_can_edit_info", length = 16, nullable = false)
    private String whoCanEditInfo = "ADMINS";

    /**
     * Group invite policy: who is allowed to add new participants.
     * One of {@code ANYONE}, {@code MODERATORS}, {@code ADMINS}, {@code OWNER}.
     */
    @Column(name = "who_can_invite", length = 16, nullable = false)
    private String whoCanInvite = "ADMINS";

    /** Soft-delete marker. {@code null} for active chats. */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    /** Chat creation timestamp. */
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /**
     * Lazily loaded participant list. Do not use directly in services —
     * prefer a separate query via {@code ChatParticipantRepository}
     * for batch-loading participants across multiple chats at once.
     */
    @OneToMany(mappedBy = "chat", fetch = FetchType.LAZY)
    private List<ChatParticipant> participants;
}
