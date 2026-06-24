package ru.messenger.chaosmessenger.demo;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.messenger.chaosmessenger.auth.domain.VerificationCode;
import ru.messenger.chaosmessenger.auth.repository.VerificationCodeRepository;
import ru.messenger.chaosmessenger.user.domain.User;
import ru.messenger.chaosmessenger.user.domain.UserStatus;
import ru.messenger.chaosmessenger.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class DemoService {

    private final UserRepository userRepository;
    private final VerificationCodeRepository codeRepository;
    private final PasswordEncoder passwordEncoder;

    private record DemoAccount(String phone, String code, String username, String firstName, String lastName) {}

    @Transactional
    public Map<String, Object> seed() {
        var accounts = List.of(
                new DemoAccount("+19999999998", "111111", "alice_demo", "Alice", "Demo"),
                new DemoAccount("+19999999999", "000000", "bob_demo", "Bob", "Demo")
        );

        Map<String, Object> result = new LinkedHashMap<>();

        for (var acc : accounts) {
            String key = acc.username();

            if (userRepository.existsByPhone(acc.phone())) {
                result.put(key, Map.of(
                        "message", "already exists",
                        "phone", acc.phone(),
                        "code", acc.code(),
                        "username", acc.username()
                ));
                continue;
            }

            User user = new User();
            user.setPhone(acc.phone());
            user.setUsername(acc.username());
            user.setEmail(acc.username() + "@chaos.local");
            user.setPasswordHash("DEMO_" + acc.username());
            user.setStatus(UserStatus.ACTIVE);
            user.setFirstName(acc.firstName());
            user.setLastName(acc.lastName());
            user.setCreatedAt(LocalDateTime.now());
            userRepository.save(user);

            VerificationCode vc = new VerificationCode();
            vc.setPhone(acc.phone());
            vc.setCode(passwordEncoder.encode(acc.code()));
            vc.setExpiresAt(LocalDateTime.now().plusDays(30));
            vc.setVia("DEMO");
            vc.setAttempts(0);
            vc.setCreatedAt(LocalDateTime.now());
            codeRepository.save(vc);

            log.info("Demo user created: phone={}, code={}, username={}", acc.phone(), acc.code(), acc.username());

            result.put(key, Map.of(
                    "message", "created",
                    "phone", acc.phone(),
                    "code", acc.code(),
                    "username", acc.username(),
                    "firstName", acc.firstName(),
                    "lastName", acc.lastName()
            ));
        }

        return result;
    }
}
