package ru.messenger.chaosmessenger.chat.api;
import jakarta.validation.Valid;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import ru.messenger.chaosmessenger.chat.dto.ChatIdResponse;
import ru.messenger.chaosmessenger.chat.dto.ChatResponse;
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
        return new ChatIdResponse(chatService.createGroupChat(auth.getName(), body.getName(), body.getMemberIds()));
    }

    @Data
    static class CreateGroupRequest {
        private String name;
        private List<Long> memberIds;
    }
}
