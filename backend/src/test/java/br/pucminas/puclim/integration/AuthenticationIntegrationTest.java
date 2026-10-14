package br.pucminas.puclim.integration;

import java.net.http.HttpRequest;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;

import br.pucminas.puclim.support.AbstractDatabaseTest;
import br.pucminas.puclim.support.TestSessionRegistry;

@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:(mysql|mariadb):.*")
class AuthenticationIntegrationTest extends AbstractDatabaseTest {

    @Autowired
    TestSessionRegistry sessions;

    @Test
    void loginUsesRealCredentialsAndGenericErrors() throws Exception {
        var account = data.partner("EMPRESA");
        var anonymous = data.anonymous();
        anonymous.expect("GET", "/conta/extrato", null, 401);
        var missing = anonymous.expect("POST", "/auth/login", Map.of("login", "inexistente", "password", "invalida"),
                401);
        var wrongPassword = anonymous.expect("POST", "/auth/login",
                Map.of("login", account.login(), "password", "invalida"), 401);
        assertEquals(missing.path("message"), wrongPassword.path("message"));
        assertEquals("Login ou senha inválidos.", missing.path("message").asString());
        assertEquals(account.id(), anonymous.login(account.email(), account.password()).path("id").asString());
    }

    @Test
    void csrfAndRoleAuthorizationAreEnforcedByServer() throws Exception {
        var institution = data.partner("ENSINO");
        var student = data.student(institution);
        student.client().expect("GET", "/instituicao/professores", null, 403);
        student.client().expect("GET", "/alunos/selecionaveis", null, 403);
        var response = student.client().send(HttpRequest.newBuilder(student.client().uri("/conta/perfil"))
                .header("Content-Type", "application/json")
                .method("PATCH", HttpRequest.BodyPublishers.ofString("{}")).build());
        assertEquals(403, response.statusCode());
    }

    @Test
    void logoutInvalidatesTheSession() throws Exception {
        var account = data.partner("EMPRESA");
        account.client().expect("POST", "/auth/logout", null, 204);
        account.client().expect("GET", "/auth/session", null, 401);
    }

    @Test
    void inactivityExpiresOnlyTheTargetSession() throws Exception {
        var account = data.partner("EMPRESA");
        var other = data.authenticated(account);
        sessions.expireAfter(account.client().sessionId(), 1);
        Thread.sleep(1300);
        account.client().expect("GET", "/auth/session", null, 401);
        assertEquals(account.id(), other.ok("GET", "/auth/session", null).path("id").asString());
    }

    @Test
    void changingPasswordRevokesOtherSessionsAndSupportsLongPasswords() throws Exception {
        var account = data.partner("EMPRESA");
        var previous = data.authenticated(account);
        String password = "LongaSenhaSegura".repeat(8);
        account.client().ok("PATCH", "/conta/senha",
                Map.of("currentPassword", account.password(), "password", password));
        previous.expect("GET", "/auth/session", null, 401);
        assertEquals(account.id(), data.anonymous().login(account.login(), password).path("id").asString());
    }

}
