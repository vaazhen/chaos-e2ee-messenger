package ru.messenger.chaosmessenger.infra.security;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.StaticHeadersWriter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Value("${chaos.security.content-security-policy:default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' ws: wss:; font-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; manifest-src 'self'; worker-src 'self' blob:; upgrade-insecure-requests}")
    private String contentSecurityPolicy;

    @Value("${chaos.security.public-docs-enabled:false}")
    private boolean publicDocsEnabled;

    @Value("${chaos.security.public-prometheus-enabled:false}")
    private boolean publicPrometheusEnabled;

    @Value("${chaos.demo.enabled:false}")
    private boolean demoEnabled;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .headers(headers -> headers
                        .contentSecurityPolicy(csp -> csp.policyDirectives(contentSecurityPolicy))
                        .httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31536000))
                        .referrerPolicy(referrer -> referrer.policy(org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER))
                        .addHeaderWriter(new StaticHeadersWriter("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()"))
                        .addHeaderWriter(new StaticHeadersWriter("Cross-Origin-Opener-Policy", "same-origin"))
                        .addHeaderWriter(new StaticHeadersWriter("Cross-Origin-Resource-Policy", "same-origin"))
                )
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(publicEndpoints()).permitAll()
                        .requestMatchers(publicDocsEnabled ? docsEndpoints() : new String[0]).permitAll()
                        .requestMatchers(publicPrometheusEnabled ? prometheusEndpoint() : new String[0]).permitAll()
                        .requestMatchers(demoEnabled ? "/api/demo/**" : "/nothing-match-404").permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private String[] publicEndpoints() {
        return new String[] {
                "/",
                "/index.html",
                "/error",
                "/favicon.ico",
                "/ws/**",
                "/api/auth/**",
                "/api/crypto/devices/register",
                "/api/v1/i18n/**",
                "/actuator/health",
                "/actuator/info",
                "/static/**",
                "/css/**",
                "/js/**",
                "/images/**",
                "/webjars/**"
        };
    }

    private String[] docsEndpoints() {
        return new String[] {
                "/swagger-ui.html",
                "/swagger-ui/**",
                "/api-docs",
                "/api-docs/**"
        };
    }

    private String[] prometheusEndpoint() {
        return new String[] { "/actuator/prometheus" };
    }
}
