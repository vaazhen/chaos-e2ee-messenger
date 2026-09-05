package ru.messenger.chaosmessenger.backup;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.messenger.chaosmessenger.backup.domain.EncryptedBackup;
import ru.messenger.chaosmessenger.backup.dto.BackupExportResponse;
import ru.messenger.chaosmessenger.backup.dto.BackupImportRequest;
import ru.messenger.chaosmessenger.backup.dto.BackupInfoResponse;
import ru.messenger.chaosmessenger.backup.repository.EncryptedBackupRepository;
import ru.messenger.chaosmessenger.backup.service.BackupService;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BackupServiceTest {

    @Mock
    private EncryptedBackupRepository backupRepository;

    private BackupService backupService;

    @BeforeEach
    void setUp() {
        backupService = new BackupService(backupRepository);
    }

    @Test
    void exportBackup_returnsBackupData() {
        EncryptedBackup backup = new EncryptedBackup();
        backup.setVersion(1);
        backup.setEncryptedPayload("encrypted-data");
        backup.setSalt("salt-value");
        backup.setIv("iv-value");
        backup.setBackupType("FULL");
        backup.setCreatedAt(LocalDateTime.of(2026, 6, 23, 12, 0));

        when(backupRepository.findTopByUserIdOrderByVersionDesc(1L))
                .thenReturn(Optional.of(backup));

        BackupExportResponse response = backupService.exportBackup(1L);

        assertEquals(1, response.version());
        assertEquals("encrypted-data", response.encryptedPayload());
        assertEquals("salt-value", response.salt());
        assertEquals("iv-value", response.iv());
    }

    @Test
    void exportBackup_throwsWhenNoBackup() {
        when(backupRepository.findTopByUserIdOrderByVersionDesc(1L))
                .thenReturn(Optional.empty());

        assertThrows(IllegalStateException.class, () ->
                backupService.exportBackup(1L));
    }

    @Test
    void importBackup_savesNewBackup() {
        when(backupRepository.findTopByUserIdOrderByVersionDesc(1L))
                .thenReturn(Optional.empty());

        BackupImportRequest request = new BackupImportRequest(
                "encrypted-payload", "salt", "iv", "FULL", null
        );

        backupService.importBackup(1L, request);

        verify(backupRepository).save(argThat(backup ->
                backup.getUserId() == 1L &&
                backup.getVersion() == 1 &&
                backup.getEncryptedPayload().equals("encrypted-payload") &&
                backup.getSalt().equals("salt") &&
                backup.getIv().equals("iv")
        ));
    }

    @Test
    void importBackup_incrementsVersion() {
        EncryptedBackup existing = new EncryptedBackup();
        existing.setVersion(1);

        when(backupRepository.findTopByUserIdOrderByVersionDesc(1L))
                .thenReturn(Optional.of(existing));

        BackupImportRequest request = new BackupImportRequest(
                "payload", "salt", "iv", "FULL", "checksum123"
        );

        backupService.importBackup(1L, request);

        verify(backupRepository).save(argThat(backup ->
                backup.getVersion() == 2 &&
                backup.getChecksum().equals("checksum123")
        ));
    }

    @Test
    void getBackupInfo_returnsInfoWhenBackupExists() {
        EncryptedBackup backup = new EncryptedBackup();
        backup.setVersion(3);
        backup.setCreatedAt(LocalDateTime.of(2026, 6, 23, 12, 0));

        when(backupRepository.findTopByUserIdOrderByVersionDesc(1L))
                .thenReturn(Optional.of(backup));
        when(backupRepository.countByUserId(1L)).thenReturn(5);

        BackupInfoResponse info = backupService.getBackupInfo(1L);

        assertTrue(info.hasBackup());
        assertEquals(3, info.latestVersion());
        assertEquals(5, info.backupCount());
        assertNotNull(info.createdAt());
    }

    @Test
    void getBackupInfo_returnsNoBackupWhenNoneExists() {
        when(backupRepository.findTopByUserIdOrderByVersionDesc(1L))
                .thenReturn(Optional.empty());

        BackupInfoResponse info = backupService.getBackupInfo(1L);

        assertFalse(info.hasBackup());
        assertNull(info.latestVersion());
    }

    @Test
    void computeSha256_returnsCorrectHash() {
        String hash = BackupService.computeSha256("test-data");
        assertNotNull(hash);
        assertEquals(64, hash.length());
    }

    @Test
    void computeSha256_isConsistent() {
        String hash1 = BackupService.computeSha256("hello");
        String hash2 = BackupService.computeSha256("hello");
        assertEquals(hash1, hash2);
    }

    @Test
    void computeSha256_differsForDifferentInputs() {
        String hash1 = BackupService.computeSha256("hello");
        String hash2 = BackupService.computeSha256("world");
        assertNotEquals(hash1, hash2);
    }
}
