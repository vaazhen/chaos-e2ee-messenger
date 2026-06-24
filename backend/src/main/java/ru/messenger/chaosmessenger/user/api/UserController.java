package ru.messenger.chaosmessenger.user.api;

import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ru.messenger.chaosmessenger.user.dto.CurrentUserResponse;
import ru.messenger.chaosmessenger.user.dto.UpdateProfileRequest;
import ru.messenger.chaosmessenger.user.dto.UpdateProfileResponse;
import ru.messenger.chaosmessenger.user.dto.UserProfileResponse;
import ru.messenger.chaosmessenger.user.dto.UserSearchResponse;
import ru.messenger.chaosmessenger.user.service.UserService;

import java.util.List;

@Tag(name = "Users", description = "User profile and search")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @Operation(summary = "Search users by username", description = "Case-insensitive partial match. Limited to 20 records.")
    @GetMapping("/search")
    public List<UserSearchResponse> search(@RequestParam String q) {
        return userService.searchUsers(q);
    }

    @Operation(summary = "Current user data")
    @GetMapping("/me")
    public CurrentUserResponse me(Authentication authentication) {
        return userService.getCurrentUser(authentication.getName());
    }

    @Operation(summary = "Current user profile")
    @GetMapping("/profile")
    public UserProfileResponse profile(Authentication authentication) {
        return userService.getProfile(authentication.getName());
    }

    @Operation(summary = "Update profile", description = "Returns the updated profile and a new JWT if the username changed.")
    @PutMapping("/profile")
    public UpdateProfileResponse updateProfile(Authentication authentication, @Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateProfile(authentication.getName(), request);
    }
}
