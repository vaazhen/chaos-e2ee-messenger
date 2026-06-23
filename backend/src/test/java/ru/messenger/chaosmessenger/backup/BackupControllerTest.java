package ru.messenger.chaosmessenger.backup;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import ru.messenger.chaosmessenger.infra.security.JwtService;
import ru.messenger.chaosmessenger.backup.api.BackupController;
import ru.messenger.chaosmessenger.backup.dto.BackupExportResponse;
import ru.messenger.chaosmessenger.backup.dto.BackupImportRequest;
import ru.messenger.chaosmessenger.backup.dto.BackupInfoResponse;
import ru.messenger.chaosmessenger.backup.service.BackupService;
import ru.messenger.chaosmessenger.user.domain.User;
import ru.messenger.chaosmessenger.user.service.UserIdentityService;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(
    value = BackupController.class,
    properties = {
        "jwt.secret=test-secret-key-must-be-32-chars-long!!",
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.testcontainers.service-connection.auto-detection=false",
        "chaos.cors.allowed-origin-patterns=http://localhost:5173"
    },
    excludeAutoConfiguration = {
        SecurityAutoConfiguration.class,
        UserDetailsServiceAutoConfiguration.class
    }
)
@Import(JwtService.class)
class BackupControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtService jwtService;

    @MockitoBean
    private BackupService backupService;

    @MockitoBean
    private UserIdentityService userIdentityService;

    private String token;

    @BeforeEach
    void setUp() {
        token = jwtService.generateToken("testuser");
    }

    @Test
    void getBackupInfo_returnsStatus() throws Exception {
        when(userIdentityService.require("testuser")).thenReturn(createUser());
        when(backupService.getBackupInfo(1L)).thenReturn(
                new BackupInfoResponse(true, 2, 3, "2026-06-23T12:00:00")
        );

        mockMvc.perform(get("/api/backup/info")
                        .header("Authorization", "Bearer " + token))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hasBackup").value(true))
                .andExpect(jsonPath("$.latestVersion").value(2))
                .andExpect(jsonPath("$.backupCount").value(3));
    }

    @Test
    void exportBackup_returnsData() throws Exception {
        when(userIdentityService.require("testuser")).thenReturn(createUser());
        when(backupService.exportBackup(1L, "test-pass")).thenReturn(
                new BackupExportResponse(1, "encrypted", "salt", "iv", "FULL", "2026-06-23T12:00:00")
        );

        mockMvc.perform(get("/api/backup/export")
                        .header("Authorization", "Bearer " + token)
                        .header("X-Backup-Passphrase", "test-pass"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.encryptedPayload").value("encrypted"));
    }

    @Test
    void exportBackup_requiresPassphrase() throws Exception {
        when(userIdentityService.require("testuser")).thenReturn(createUser());

        mockMvc.perform(get("/api/backup/export")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    @Test
    void importBackup_savesData() throws Exception {
        when(userIdentityService.require("testuser")).thenReturn(createUser());

        BackupImportRequest request = new BackupImportRequest(
                "encrypted-payload", "salt-value", "iv-value", "FULL", "checksum"
        );

        mockMvc.perform(post("/api/backup/import")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andDo(print())
                .andExpect(status().isOk());

        verify(backupService).importBackup(eq(1L), any(BackupImportRequest.class));
    }

    @Test
    void importBackup_validatesRequiredFields() throws Exception {
        when(userIdentityService.require("testuser")).thenReturn(createUser());

        String invalidJson = "{\"salt\":\"salt\",\"iv\":\"iv\"}";

        mockMvc.perform(post("/api/backup/import")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest());
    }

    private User createUser() {
        User user = new User();
        user.setId(1L);
        user.setUsername("testuser");
        return user;
    }
}
