package ru.messenger.chaosmessenger.push.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.messenger.chaosmessenger.push.domain.PushSubscription;

import java.util.List;
import java.util.Optional;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {

    List<PushSubscription> findByUserId(Long userId);

    Optional<PushSubscription> findByUserIdAndDeviceId(Long userId, String deviceId);

    void deleteByUserIdAndDeviceId(Long userId, String deviceId);
}
