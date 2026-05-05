package ru.messenger.chaosmessenger.crypto.device;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserDeviceRepository extends JpaRepository<UserDevice, Long> {

    Optional<UserDevice> findByUserUsernameAndDeviceId(String username, String deviceId);

    Optional<UserDevice> findByDeviceId(String deviceId);

    Optional<UserDevice> findByUserUsernameAndDeviceIdAndActiveTrue(String username, String deviceId);

    List<UserDevice> findByUserUsernameAndActiveTrue(String username);

    @Query("select d from UserDevice d join fetch d.user where d.user.username = :username and d.active = true")
    List<UserDevice> findActiveByUsernameWithUser(@Param("username") String username);

    Optional<UserDevice> findByUserIdAndDeviceIdAndActiveTrue(Long userId, String deviceId);

    List<UserDevice> findByUserIdAndActiveTrue(Long userId);

    List<UserDevice> findByUserIdInAndActiveTrue(Collection<Long> userIds);

    @Query("select d from UserDevice d join fetch d.user where d.user.id in :userIds and d.active = true")
    List<UserDevice> findActiveByUserIdsWithUser(@Param("userIds") Collection<Long> userIds);

    List<UserDevice> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<UserDevice> findByUserIdOrderByActiveDescLastSeenDescCreatedAtDescIdDesc(Long userId);

    Optional<UserDevice> findByIdAndUserId(Long id, Long userId);

    long countByUserIdAndActiveTrue(Long userId);
}
