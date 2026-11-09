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
}
