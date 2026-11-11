package br.pucminas.puclim.unit;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;

import br.pucminas.puclim.config.PasswordResetPolicy;
import br.pucminas.puclim.dto.request.PasswordRecoveryRequest;
import br.pucminas.puclim.dto.request.PasswordResetInput;

class PasswordResetPolicyTest {
    private PasswordResetPolicy policy(String url) {
        return new PasswordResetPolicy(Duration.ofMinutes(30), Duration.ofSeconds(60), Duration.ofMinutes(15), 20, url);
    }

    @Test
    void trustedConfiguredOriginProducesFragmentLinkAndSupportsAppSubpath() {
        assertEquals("https://app.example/campus/redefinir-senha#token=abc",
                policy("https://app.example/campus/").link("abc"));
        for (String url : java.util.List.of("javascript:alert(1)", "//example.com", "https://u:p@example.com",
                "https://app.example?redirect=x", "https://app.example/#x"))
            assertThrows(IllegalArgumentException.class, () -> policy(url));
    }

    @Test
    void dtoStringsProtectEmailPasswordAndToken() {
        assertFalse(new PasswordRecoveryRequest("private@example.com").toString().contains("private@example.com"));
        assertEquals("PasswordResetInput[dados protegidos]",
                new PasswordResetInput("secret-token", "secret-password").toString());
    }

    @Test
    void resendWaitUsesConfiguredCooldownRoundedUpToWholeSeconds() {
        assertEquals(60L, policy("https://app.example").resendAfterSeconds());
        assertEquals(120L, policy(Duration.ofSeconds(120)).resendAfterSeconds());
        assertEquals(121L, policy(Duration.ofMillis(120001)).resendAfterSeconds());
        assertEquals(1L, policy(Duration.ofNanos(1)).resendAfterSeconds());
    }

    private PasswordResetPolicy policy(Duration cooldown) {
        return new PasswordResetPolicy(Duration.ofMinutes(30), cooldown, Duration.ofMinutes(15), 20,
                "https://app.example");
    }
}
