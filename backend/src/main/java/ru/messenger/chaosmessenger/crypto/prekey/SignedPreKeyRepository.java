package ru.messenger.chaosmessenger.crypto.prekey;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SignedPreKeyRepository extends JpaRepository<SignedPreKey, Long> {

    Optional<SignedPreKey> findTopByDeviceIdOrderByCreatedAtDesc(Long deviceId);

    @org.springframework.data.jpa.repository.Query(value = """
            select distinct on (device_db_id) *
            from signed_prekeys
            where device_db_id in (:deviceIds)
            order by device_db_id, created_at desc, id desc
            """, nativeQuery = true)
    List<SignedPreKey> findLatestByDeviceIds(
            @org.springframework.data.repository.query.Param("deviceIds") Collection<Long> deviceIds
    );

    Optional<SignedPreKey> findByDeviceIdAndPreKeyId(Long deviceId, Integer preKeyId);

    void deleteByDeviceId(Long deviceId);

    void flush();
}