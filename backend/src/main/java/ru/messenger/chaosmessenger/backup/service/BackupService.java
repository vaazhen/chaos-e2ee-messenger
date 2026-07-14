package ru.messenger.chaosmessenger.backup.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.messenger.chaosmessenger.backup.domain.EncryptedBackup;
import ru.messenger.chaosmessenger.backup.dto.BackupExportResponse;
import ru.messenger.chaosmessenger.backup.dto.BackupImportRequest;
import ru.messenger.chaosmessenger.backup.dto.BackupInfoResponse;
import ru.messenger.chaosmessenger.backup.repository.EncryptedBackupRepository;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;

@Slf4j
@Service
@RequiredArgsConstructor
public class BackupService {

    private final EncryptedBackupRepository backupRepository;

    @Transactional
    public BackupExportResponse exportBackup(Long userId, String passphrase) {
        EncryptedBackup backup = backupRepository.findTopByUserIdOrderByVersionDesc(userId)
                .orElseThrow(() -> new IllegalStateException("No backup found for user " + userId));

        return new BackupExportResponse(
                backup.getVersion(),
                backup.getEncryptedPayload(),
                backup.getSalt(),
                backup.getIv(),
                backup.getBackupType(),
                backup.getCreatedAt().toString()
        );
    }

    @Transactional
    public void importBackup(Long userId, BackupImportRequest request) {
        int newVersion = backupRepository.findTopByUserIdOrderByVersionDesc(userId)
                .map(b -> b.getVersion() + 1)
                .orElse(1);

        EncryptedBackup backup = new EncryptedBackup();
        backup.setUserId(userId);
        backup.setVersion(newVersion);
        backup.setEncryptedPayload(request.encryptedPayload());
        backup.setSalt(request.salt());
        backup.setIv(request.iv());
        backup.setBackupType(request.backupType() != null ? request.backupType() : "FULL");
        backup.setCreatedAt(LocalDateTime.now());

        if (request.checksum() != null) {
            backup.setChecksum(request.checksum());
        }

        backupRepository.save(backup);

        log.info("Backup v{} saved for userId={}", newVersion, userId);
    }

    @Transactional(readOnly = true)
    public BackupInfoResponse getBackupInfo(Long userId) {
        var latest = backupRepository.findTopByUserIdOrderByVersionDesc(userId);

        return new BackupInfoResponse(
                latest.isPresent(),
                latest.map(EncryptedBackup::getVersion).orElse(null),
                backupRepository.countByUserId(userId),
                latest.map(b -> b.getCreatedAt().toString()).orElse(null)
        );
    }

    public static String computeSha256(String data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data.getBytes());
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}
