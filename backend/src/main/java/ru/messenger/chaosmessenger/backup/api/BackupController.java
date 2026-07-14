package ru.messenger.chaosmessenger.backup.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.messenger.chaosmessenger.backup.dto.BackupExportResponse;
import ru.messenger.chaosmessenger.backup.dto.BackupImportRequest;
import ru.messenger.chaosmessenger.backup.dto.BackupInfoResponse;
import ru.messenger.chaosmessenger.backup.service.BackupService;
import ru.messenger.chaosmessenger.user.domain.User;
import ru.messenger.chaosmessenger.user.service.UserIdentityService;

@Tag(name = "E2EE Backup", description = "Encrypted key backup export/import")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/backup")
@RequiredArgsConstructor
public class BackupController {

    private final BackupService backupService;
    private final UserIdentityService userIdentityService;

    @Operation(summary = "Get backup info")
    @GetMapping("/info")
    public BackupInfoResponse getBackupInfo(Authentication auth) {
        User user = userIdentityService.require(auth.getName());
        return backupService.getBackupInfo(user.getId());
    }

    @Operation(summary = "Export latest encrypted backup")
    @GetMapping("/export")
    public BackupExportResponse exportBackup(Authentication auth) {
        User user = userIdentityService.require(auth.getName());
        return backupService.exportBackup(user.getId());
    }

    @Operation(summary = "Import/upload encrypted backup")
    @PostMapping("/import")
    public void importBackup(
            Authentication auth,
            @Valid @RequestBody BackupImportRequest request
    ) {
        User user = userIdentityService.require(auth.getName());
        backupService.importBackup(user.getId(), request);
    }
}
