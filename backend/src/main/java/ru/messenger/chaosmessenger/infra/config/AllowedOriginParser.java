package ru.messenger.chaosmessenger.infra.config;

import java.util.Arrays;

public final class AllowedOriginParser {

    private AllowedOriginParser() {
    }

    public static String[] parse(String configuredOrigins) {
        String[] origins = Arrays.stream(configuredOrigins == null ? new String[0] : configuredOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .distinct()
                .toArray(String[]::new);

        if (origins.length == 0) {
            throw new IllegalStateException("At least one CORS/WebSocket origin must be configured");
        }
        if (Arrays.stream(origins).anyMatch("*"::equals)) {
            throw new IllegalStateException("A global wildcard origin is forbidden when credentials are enabled");
        }
        return origins;
    }
}
