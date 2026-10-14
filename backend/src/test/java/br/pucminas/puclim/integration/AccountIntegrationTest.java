package br.pucminas.puclim.integration;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import br.pucminas.puclim.support.AbstractDatabaseTest;
import br.pucminas.puclim.support.TestPayloads;

@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:(mysql|mariadb):.*")
class AccountIntegrationTest extends AbstractDatabaseTest {

    @Test
    void studentCanUpdateOwnProfileAndDeactivateAccount() throws Exception {
        var student = data.student(data.partner("ENSINO"));
        String email = TestPayloads.unique("atualizado") + "@example.test";
        student.client().ok("PATCH", "/conta/perfil", Map.of("name", "Aluno Atualizado", "email", email,
                "address", "Rua atualizada, 456", "course", "Computacao"));
        var profile = student.client().ok("GET", "/conta/perfil", null);
        assertEquals(student.id(), profile.path("id").asString());
        assertEquals("Computacao", profile.path("course").asString());
        assertEquals(email, profile.path("email").asString());
        student.client().expect("DELETE", "/conta", null, 204);
        student.client().expect("GET", "/auth/session", null, 401);
    }

    @Test
    void partnersCanUpdateContactAndCannotReadAnotherAccountThroughProfile() throws Exception {
        var own = data.partner("EMPRESA");
        var other = data.partner("EMPRESA");
        String email = TestPayloads.unique("contato") + "@example.test";
        own.client().ok("PATCH", "/conta/perfil", Map.of("name", "Empresa Atualizada", "email", email,
                "phone", "31988888888", "description", "Novo contato"));
        assertEquals(email, own.client().ok("GET", "/conta/perfil", null).path("email").asString());
        assertEquals(other.id(), other.client().ok("GET", "/conta/perfil", null).path("id").asString());
        own.client().expect("DELETE", "/conta", null, 204);
        data.anonymous().expect("POST", "/auth/login", Map.of("login", own.login(), "password", own.password()), 401);
    }

}
