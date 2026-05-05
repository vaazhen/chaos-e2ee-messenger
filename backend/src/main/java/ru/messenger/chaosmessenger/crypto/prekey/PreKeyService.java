package ru.messenger.chaosmessenger.crypto.prekey;


import ru.messenger.chaosmessenger.user.service.UserIdentityService;
import ru.messenger.chaosmessenger.common.exception.*;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.messenger.chaosmessenger.chat.repository.ChatParticipantRepository;
import ru.messenger.chaosmessenger.crypto.device.CurrentDeviceService;
import ru.messenger.chaosmessenger.crypto.device.UserDevice;
import ru.messenger.chaosmessenger.crypto.device.UserDeviceRepository;
import ru.messenger.chaosmessenger.crypto.dto.*;
import ru.messenger.chaosmessenger.user.domain.User;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PreKeyService {

    private final UserIdentityService userIdentityService;
    private final UserDeviceRepository userDeviceRepository;
    private final SignedPreKeyRepository signedPreKeyRepository;
    private final OneTimePreKeyRepository oneTimePreKeyRepository;
    private final ChatParticipantRepository chatParticipantRepository;
    private final CurrentDeviceService currentDeviceService;

    @Transactional(readOnly = true)
    public PreKeyBundleResponse getBundleByUsername(String username) {
        List<UserDevice> devices = userDeviceRepository.findActiveByUsernameWithUser(username);
        ReadOnlyPreKeys preKeys = loadReadOnlyPreKeys(devices);
        return new PreKeyBundleResponse(
                username,
                devices.stream().map(device -> toDeviceBundleReadOnly(device, preKeys)).toList()
        );
    }

    @Transactional
    public ResolvedChatDevicesResponse resolveChatDevices(String username, Long chatId) {
        User currentUser = userIdentityService.require(username);

        UserDevice currentDevice = currentDeviceService.requireCurrentDevice();

        if (!chatParticipantRepository.existsByChatIdAndUserId(chatId, currentUser.getId())) {
            throw new ChatException("You are not a participant of this chat");
        }

        List<Long> participantUserIds = chatParticipantRepository.findUserIdsByChatId(chatId).stream()
                .distinct()
                .toList();

        List<DeviceBundleDto> targets = new ArrayList<>();
        Set<String> seenDeviceIds = new HashSet<>();
        List<UserDevice> participantDevices = participantUserIds.isEmpty()
                ? List.of()
                : userDeviceRepository.findActiveByUserIdsWithUser(participantUserIds);

        Map<Long, SignedPreKey> signedByDeviceId = latestSignedPreKeys(participantDevices);
        ReadOnlyPreKeys readOnlyPreKeys = loadReadOnlyPreKeys(List.of(currentDevice));

        for (UserDevice device : participantDevices) {
            if (!seenDeviceIds.add(device.getDeviceId())) {
                // Device IDs must be globally unique across all participants for WebSocket topic routing.
                // Skip duplicates to avoid broadcasting the same envelope twice.
                continue;
            }
            if (Objects.equals(device.getId(), currentDevice.getId())) {
                // Include the sender's own device so that sent messages remain
                // decryptable in the timeline after a page reload.
                targets.add(toDeviceBundleReadOnly(device, readOnlyPreKeys));
                continue;
            }
            targets.add(toDeviceBundleWithReservedPreKey(device, signedByDeviceId.get(device.getId())));
        }

        return new ResolvedChatDevicesResponse(chatId, username, currentDevice.getDeviceId(), targets);
    }

    private ReadOnlyPreKeys loadReadOnlyPreKeys(Collection<UserDevice> devices) {
        if (devices == null || devices.isEmpty()) {
            return new ReadOnlyPreKeys(Map.of(), Map.of());
        }

        List<Long> deviceDbIds = devices.stream()
                .map(UserDevice::getId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        if (deviceDbIds.isEmpty()) {
            return new ReadOnlyPreKeys(Map.of(), Map.of());
        }

        Map<Long, SignedPreKey> signedByDeviceId = signedPreKeyRepository.findLatestByDeviceIds(deviceDbIds)
                .stream()
                .collect(Collectors.toMap(
                        key -> key.getDevice().getId(),
                        Function.identity(),
                        (left, right) -> left
                ));

        Map<Long, OneTimePreKey> oneTimeByDeviceId = oneTimePreKeyRepository.findFirstAvailableReadOnlyByDeviceIds(deviceDbIds)
                .stream()
                .collect(Collectors.toMap(
                        key -> key.getDevice().getId(),
                        Function.identity(),
                        (left, right) -> left
                ));

        return new ReadOnlyPreKeys(signedByDeviceId, oneTimeByDeviceId);
    }

    private Map<Long, SignedPreKey> latestSignedPreKeys(Collection<UserDevice> devices) {
        if (devices == null || devices.isEmpty()) {
            return Map.of();
        }

        List<Long> deviceDbIds = devices.stream()
                .map(UserDevice::getId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        if (deviceDbIds.isEmpty()) {
            return Map.of();
        }

        return signedPreKeyRepository.findLatestByDeviceIds(deviceDbIds)
                .stream()
                .collect(Collectors.toMap(
                        key -> key.getDevice().getId(),
                        Function.identity(),
                        (left, right) -> left
                ));
    }

    private DeviceBundleDto toDeviceBundleReadOnly(UserDevice device, ReadOnlyPreKeys preKeys) {
        return buildDto(
                device,
                preKeys.signedByDeviceId().get(device.getId()),
                preKeys.oneTimeByDeviceId().get(device.getId())
        );
    }

    private DeviceBundleDto toDeviceBundleWithReservedPreKey(UserDevice device, SignedPreKey signedPreKey) {
        OneTimePreKey oneTimePreKey =
                oneTimePreKeyRepository.findAvailableForUpdate(device.getId()).stream().findFirst().orElse(null);

        if (oneTimePreKey != null && oneTimePreKey.getUsedAt() == null) {
            oneTimePreKey.setUsedAt(LocalDateTime.now());
            oneTimePreKeyRepository.save(oneTimePreKey);
        }

        return buildDto(device, signedPreKey, oneTimePreKey);
    }

    private DeviceBundleDto buildDto(UserDevice device, SignedPreKey signedPreKey, OneTimePreKey oneTimePreKey) {
        SignedPreKeyDto signedDto = null;
        if (signedPreKey != null) {
            signedDto = new SignedPreKeyDto(
                    signedPreKey.getPreKeyId(),
                    signedPreKey.getPublicKey(),
                    signedPreKey.getSignature()
            );
        }

        OneTimePreKeyDto oneTimeDto = null;
        if (oneTimePreKey != null) {
            oneTimeDto = new OneTimePreKeyDto(oneTimePreKey.getPreKeyId(), oneTimePreKey.getPublicKey());
        }

        return new DeviceBundleDto(
                device.getUser().getId(),
                device.getId(),
                device.getDeviceId(),
                device.getRegistrationId(),
                device.getDeviceName(),
                device.getIdentityPublicKey(),
                signedDto,
                oneTimeDto
        );
    }

    private record ReadOnlyPreKeys(
            Map<Long, SignedPreKey> signedByDeviceId,
            Map<Long, OneTimePreKey> oneTimeByDeviceId
    ) {}
}
