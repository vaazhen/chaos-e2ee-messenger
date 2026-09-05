package ru.messenger.chaosmessenger.demo;

import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DemoDisabledInProductionTest {

    @Test
    void refusesToStartWhenDemoIsEnabledOnProd() {
        Environment environment = mock(Environment.class);
        when(environment.matchesProfiles("prod")).thenReturn(true);
        DemoDisabledInProduction guard = new DemoDisabledInProduction(environment, true);

        assertThatThrownBy(() -> guard.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("chaos.demo.enabled");
    }

    @Test
    void allowsDemoOutsideProd() {
        Environment environment = mock(Environment.class);
        when(environment.matchesProfiles("prod")).thenReturn(false);
        DemoDisabledInProduction guard = new DemoDisabledInProduction(environment, true);

        assertThatCode(() -> guard.run(null)).doesNotThrowAnyException();
    }
}
