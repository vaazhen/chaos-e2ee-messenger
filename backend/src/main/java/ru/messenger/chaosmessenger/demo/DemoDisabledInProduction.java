package ru.messenger.chaosmessenger.demo;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public class DemoDisabledInProduction implements ApplicationRunner {

    private final Environment environment;
    private final boolean demoEnabled;

    public DemoDisabledInProduction(
            Environment environment,
            @Value("${chaos.demo.enabled:false}") boolean demoEnabled
    ) {
        this.environment = environment;
        this.demoEnabled = demoEnabled;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (demoEnabled && environment.matchesProfiles("prod")) {
            throw new IllegalStateException("chaos.demo.enabled must stay false when the prod profile is active");
        }
    }
}
