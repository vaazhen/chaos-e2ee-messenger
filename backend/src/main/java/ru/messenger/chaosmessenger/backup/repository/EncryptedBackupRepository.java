package ru.messenger.chaosmessenger.backup.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.messenger.chaosmessenger.backup.domain.EncryptedBackup;

import java.util.Optional;

public interface EncryptedBackupRepository extends JpaRepository<EncryptedBackup, Long> {

    Optional<EncryptedBackup> findByUserIdAndVersion(Long userId, Integer version);

    Optional<EncryptedBackup> findTopByUserIdOrderByVersionDesc(Long userId);

    void deleteByUserIdAndVersion(Long userId, Integer version);

    int countByUserId(Long userId);
}
