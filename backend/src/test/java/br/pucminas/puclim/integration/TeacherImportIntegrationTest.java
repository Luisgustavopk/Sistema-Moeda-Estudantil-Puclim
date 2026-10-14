package br.pucminas.puclim.integration;

import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import br.pucminas.puclim.support.AbstractDatabaseTest;
import br.pucminas.puclim.support.TestDocuments;
import br.pucminas.puclim.support.TestPayloads;

@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:(mysql|mariadb):.*")
class TeacherImportIntegrationTest extends AbstractDatabaseTest {

    @Test
    void csvPreviewAndImportProduceAnIndividualReportWithoutDuplicateTeachers() throws Exception {
        var institution = data.partner("ENSINO");
        String cpf = TestDocuments.cpf(), login = TestPayloads.unique("professor");
        String csv = "nome;cpf;departamento;email;login\nProfessor;" + cpf + ";Computacao;" + login + "@example.test;"
                + login
                + "\nRepetido;" + cpf + ";Computacao;" + TestPayloads.unique("repetido") + "@example.test;"
                + TestPayloads.unique("repetido")
                + "\nInvalido;11111111111;Computacao;invalid@example.test;invalid\n";
        var preview = institution.client().result(institution.client().upload("/instituicao/professores/preview",
                "professores.csv", csv.getBytes(StandardCharsets.UTF_8), "text/csv"), 200);
        assertEquals(3, preview.size());
        assertFalse(preview.get(1).path("error").isNull());
        var result = institution.client().ok("POST", "/instituicao/professores/importar", Map.of("rows", preview));
        assertEquals(1, result.path("created").asInt());
        assertEquals(2, result.path("errors").size());
        assertTrue(result.path("access").get(0).path("temporaryPassword").asString().length() >= 24);
        var repeated = institution.client().ok("POST", "/instituicao/professores/importar", Map.of("rows", preview));
        assertEquals(0, repeated.path("created").asInt());
        assertEquals(1, institution.client().ok("GET", "/instituicao/professores", null).size());
    }

    @Test
    void firstAccessRequiresPasswordChangeAndOnlyPublicStudentFieldsAreReturned() throws Exception {
        var institution = data.partner("ENSINO");
        data.student(institution);
        var teacher = data.teacherFirstAccess(institution);
        var first = teacher.client().ok("GET", "/auth/session", null);
        assertTrue(first.path("mustChangePassword").asBoolean());
        assertEquals(1000, first.path("balance").asLong());
        teacher.client().expect("GET", "/alunos/selecionaveis", null, 403);
        teacher.client().ok("PATCH", "/conta/senha",
                Map.of("currentPassword", teacher.password(), "password", TestPayloads.PASSWORD));
        String students = teacher.client().ok("GET", "/alunos/selecionaveis", null).toString();
        assertFalse(students.contains("\"cpf\""));
        assertFalse(students.contains("\"rg\""));
        assertFalse(students.contains("\"address\""));
        data.anonymous().expect("POST", "/auth/login", Map.of("login", teacher.login(), "password", teacher.password()),
                401);
    }

}
