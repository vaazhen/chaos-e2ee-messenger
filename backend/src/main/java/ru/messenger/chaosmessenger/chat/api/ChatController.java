package ru.messenger.chaosmessenger.chat.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import ru.messenger.chaosmessenger.chat.dto.CreateGroupRequest;
import ru.messenger.chaosmessenger.chat.dto.ChatIdResponse;
import ru.messenger.chaosmessenger.chat.dto.ChatResponse;
import ru.messenger.chaosmessenger.chat.dto.UpdateGroupParticipantsRequest;
import ru.messenger.chaosmessenger.chat.dto.UpdateGroupPermissionsRequest;
import ru.messenger.chaosmessenger.chat.dto.UpdateGroupRoleRequest;
import ru.messenger.chaosmessenger.chat.dto.UpdateGroupSettingsRequest;
import ru.messenger.chaosmessenger.chat.service.ChatService;

import java.util.List;

@Tag(name = "Chats", description = "Create and retrieve direct and group chats")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/chats")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @Operation(summary = "Create or open a direct chat by userId")
    @PostMapping("/direct")
    public ChatIdResponse createChat(@RequestParam Long targetUserId, Authentication auth) {
        return new ChatIdResponse(chatService.createDirectChat(auth.getName(), targetUserId));
    }

    @Operation(summary = "Create or open saved messages chat")

    @PostMapping("/saved")
    public ChatIdResponse createSaved(Authentication auth) {
        return new ChatIdResponse(chatService.createOrGetSavedMessagesChat(auth.getName()));
    }
    @GetMapping("/my")
    public List<ChatResponse> getMyChats(
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(defaultValue = "100") int limit,
            Authentication auth
    ) {
        return chatService.getMyChats(auth.getName(), offset, limit);
    }

    @Operation(summary = "List pending direct chat requests for me")
    @GetMapping("/requests")
    public List<ChatResponse> getMyRequests(
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(defaultValue = "100") int limit,
            Authentication auth
    ) {
        return chatService.getMyDirectRequests(auth.getName(), offset, limit);
    }

    @Operation(summary = "Accept a direct chat request")
    @PostMapping("/{chatId}/requests/accept")
    public void acceptRequest(@PathVariable Long chatId, Authentication auth) {
        chatService.acceptDirectRequest(auth.getName(), chatId);
    }

    @Operation(summary = "Decline a direct chat request")
    @PostMapping("/{chatId}/requests/decline")
    public void declineRequest(@PathVariable Long chatId, Authentication auth) {
        chatService.declineDirectRequest(auth.getName(), chatId);
    }

    @Operation(summary = "Create or open a direct chat by username")
    @PostMapping("/direct/by-username")
    public ChatIdResponse createOrGetDirectByUsername(@RequestParam String username, Authentication auth) {
        return new ChatIdResponse(chatService.createOrGetDirectChatByUsername(auth.getName(), username));
    }

    @Operation(
        summary = "Create a group chat",
        description = "Creates a new group. The creator is added automatically. " +
                      "Request body: `{ \"name\": \"Team\", \"memberIds\": [2, 3, 4] }`"
    )
    @PostMapping("/group")
    public ChatIdResponse createGroupChat(@Valid @RequestBody CreateGroupRequest body, Authentication auth) {
        return new ChatIdResponse(chatService.createGroupChat(auth.getName(), body.name(), body.memberIds()));
    }

    @Operation(summary = "Invite participants to group")
    @PostMapping("/{chatId}/group/participants")
    public ChatResponse inviteParticipants(
            @PathVariable Long chatId,
            @Valid @RequestBody UpdateGroupParticipantsRequest body,
            Authentication auth
    ) {
        return chatService.inviteGroupParticipants(auth.getName(), chatId, body);
    }

    @Operation(summary = "Patch group settings")
    @PatchMapping("/{chatId}/group/settings")
    public ChatResponse patchGroupSettings(
            @PathVariable Long chatId,
            @Valid @RequestBody UpdateGroupSettingsRequest body,
            Authentication auth
    ) {
        return chatService.updateGroupSettings(auth.getName(), chatId, body);
    }

    @Operation(summary = "Patch group participant role")
    @PatchMapping("/{chatId}/group/participants/{participantUserId}/role")
    public ChatResponse patchParticipantRole(
            @PathVariable Long chatId,
            @PathVariable Long participantUserId,
            @Valid @RequestBody UpdateGroupRoleRequest body,
            Authentication auth
    ) {
        return chatService.updateGroupParticipantRole(auth.getName(), chatId, participantUserId, body);
    }

    @Operation(summary = "Patch group permissions")
    @PatchMapping("/{chatId}/group/permissions")
    public ChatResponse patchGroupPermissions(
            @PathVariable Long chatId,
            @RequestBody UpdateGroupPermissionsRequest body,
            Authentication auth
    ) {
        return chatService.updateGroupPermissions(auth.getName(), chatId, body);
    }

    @Operation(summary = "Remove participant from group")
    @DeleteMapping("/{chatId}/group/participants/{participantUserId}")
    public void deleteParticipant(
            @PathVariable Long chatId,
            @PathVariable Long participantUserId,
            Authentication auth
    ) {
        chatService.removeGroupParticipant(auth.getName(), chatId, participantUserId);
    }

    @Operation(summary = "Archive group chat")
    @DeleteMapping("/{chatId}/group")
    public void deleteGroup(@PathVariable Long chatId, Authentication auth) {
        chatService.archiveGroup(auth.getName(), chatId);
    }

    @Operation(summary = "Mute group participant")
    @PostMapping("/{chatId}/group/participants/{participantUserId}/mute")
    public ChatResponse muteParticipant(
            @PathVariable Long chatId,
            @PathVariable Long participantUserId,
            @RequestParam Integer minutes,
            Authentication auth
    ) {
        return chatService.muteGroupParticipant(auth.getName(), chatId, participantUserId, minutes);
    }

    @Operation(summary = "Unmute group participant")
    @DeleteMapping("/{chatId}/group/participants/{participantUserId}/mute")
    public ChatResponse unmuteParticipant(
            @PathVariable Long chatId,
            @PathVariable Long participantUserId,
            Authentication auth
    ) {
        return chatService.unmuteGroupParticipant(auth.getName(), chatId, participantUserId);
    }

    @Operation(summary = "Ban group participant")
    @PostMapping("/{chatId}/group/participants/{participantUserId}/ban")
    public ChatResponse banParticipant(
            @PathVariable Long chatId,
            @PathVariable Long participantUserId,
            @RequestParam(required = false) String reason,
            Authentication auth
    ) {
        return chatService.banGroupParticipant(auth.getName(), chatId, participantUserId, reason);
    }

    @Operation(summary = "Unban group participant")
    @DeleteMapping("/{chatId}/group/participants/{participantUserId}/ban")
    public ChatResponse unbanParticipant(
            @PathVariable Long chatId,
            @PathVariable Long participantUserId,
            Authentication auth
    ) {
        return chatService.unbanGroupParticipant(auth.getName(), chatId, participantUserId);
    }
}
