package br.pucminas.puclim.integration;

import java.util.HashMap;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import br.pucminas.puclim.support.AbstractDatabaseTest;
import br.pucminas.puclim.support.TestPayloads;

@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:(mysql|mariadb):.*")
class RegistrationIntegrationTest extends AbstractDatabaseTest {

    @Test
    void studentsStartAtZeroAndRejectDuplicateCpfEmailAndInvalidInstitution() throws Exception {
        var institution = data.partner("ENSINO");
        var student = data.student(institution);
        assertEquals(0, student.client().ok("GET", "/auth/session", null).path("balance").asLong());
        var duplicateCpf = new HashMap<>(TestPayloads.student(institution.id()));
        duplicateCpf.put("cpf", student.registration().get("cpf"));
        data.anonymous().expect("POST", "/alunos", duplicateCpf, 409);
        var duplicateEmail = new HashMap<>(TestPayloads.student(institution.id()));
        duplicateEmail.put("email", student.email());
        data.anonymous().expect("POST", "/alunos", duplicateEmail, 409);
        data.anonymous().expect("POST", "/alunos", TestPayloads.student("missing"), 400);
        var invalidCpf = new HashMap<>(TestPayloads.student(institution.id()));
        invalidCpf.put("cpf", "11111111111");
        data.anonymous().expect("POST", "/alunos", invalidCpf, 400);
    }

    @Test
    void partnerRegistrationSupportsEveryKindAndRejectsDuplicateCnpjAndEmail() throws Exception {
        for (String kind : new String[] { "EMPRESA", "ENSINO", "BENEFICIARIA" }) {
            var partner = data.partner(kind);
            assertEquals(kind, partner.client().ok("GET", "/auth/session", null).path("partnerKind").asString());
            var duplicateCnpj = new HashMap<>(TestPayloads.partner(kind));
            duplicateCnpj.put("cnpj", partner.registration().get("cnpj"));
            data.anonymous().expect("POST", "/empresas", duplicateCnpj, 409);
            var duplicateEmail = new HashMap<>(TestPayloads.partner(kind));
            duplicateEmail.put("email", partner.email());
            data.anonymous().expect("POST", "/empresas", duplicateEmail, 409);
        }
    }

    @Test
    void institutionListExcludesInactivePartnersAndDeletionProtectsMembership() throws Exception {
        var institution = data.partner("ENSINO");
        var unused = data.partner("ENSINO");
        data.student(institution);
        institution.client().expect("DELETE", "/conta", null, 409);
        unused.client().expect("DELETE", "/conta", null, 204);
        String institutions = data.anonymous().ok("GET", "/instituicoes", null).toString();
        assertTrue(institutions.contains(institution.id()));
        assertFalse(institutions.contains(unused.id()));
    }

}
