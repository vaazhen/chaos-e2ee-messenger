package ru.messenger.chaosmessenger.infra.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AllowedOriginParserTest {

    @Test
    void parsesAndDeduplicatesExplicitOrigins() {
        assertThat(AllowedOriginParser.parse("https://app.example.com, https://*.example.net,https://app.example.com"))
                .containsExactly("https://app.example.com", "https://*.example.net");
    }

    @Test
    void rejectsEmptyConfigurationAndGlobalWildcard() {
        assertThatThrownBy(() -> AllowedOriginParser.parse("  "))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> AllowedOriginParser.parse("*"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("wildcard");
    }
}
