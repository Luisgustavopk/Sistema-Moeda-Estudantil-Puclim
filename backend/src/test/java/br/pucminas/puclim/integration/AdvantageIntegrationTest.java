package br.pucminas.puclim.integration;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import br.pucminas.puclim.support.AbstractDatabaseTest;

@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:(mysql|mariadb):.*")
class AdvantageIntegrationTest extends AbstractDatabaseTest {

    @Test
    void imageUploadAndAdvantageManagementEnforceOwnershipAndAvailability() throws Exception {
        var company = data.partner("EMPRESA");
        var other = data.partner("EMPRESA");
        var student = data.student(data.partner("ENSINO"));
        company.client().result(company.client().upload("/uploads/imagens", "fake.png",
                "<script>fake</script>".getBytes(StandardCharsets.UTF_8), "image/png"), 400);
        var advantage = data.advantage(company, 600);
        student.client().expect("POST", "/vantagens", advantage.input(), 403);
        other.client().expect("PUT", "/vantagens/" + advantage.id(), advantage.input(), 403);
        assertTrue(student.client().ok("GET", "/vantagens", null).toString().contains(advantage.id()));
        var edited = new HashMap<>(advantage.input());
        edited.put("cost", 300);
        assertEquals(300, company.client().ok("PUT", "/vantagens/" + advantage.id(), edited).path("cost").asLong());
        company.client().expect("DELETE", "/vantagens/" + advantage.id(), null, 204);
        assertFalse(student.client().ok("GET", "/vantagens", null).toString().contains(advantage.id()));
        assertFalse(company.client().ok("GET", "/vantagens?minhas=true", null).get(0).path("active").asBoolean());
    }

}
