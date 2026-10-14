package br.pucminas.puclim.persistence;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import br.pucminas.puclim.repository.AccountRepository;
import br.pucminas.puclim.repository.StudentRepository;
import br.pucminas.puclim.support.AbstractDatabaseTest;

@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:(mysql|mariadb):.*")
class AccountPersistenceTest extends AbstractDatabaseTest {

    @Autowired
    AccountRepository accounts;
    @Autowired
    StudentRepository students;
    @Autowired
    JdbcTemplate jdbc;

    @Test
    void registrationPersistsHashedCredentialsAndInstitutionalMembership() throws Exception {
        var institution = data.partner("ENSINO");
        var student = data.student(institution);
        var stored = accounts.findById(student.id()).orElseThrow();
        assertNotEquals(student.password(), stored.passwordHash);
        assertTrue(stored.passwordHash.startsWith("{pbkdf2}"));
        assertEquals(0, stored.balance);
        assertTrue(stored.active);
        var profile = students.findById(student.id()).orElseThrow();
        assertEquals(student.registration().get("cpf"), profile.cpf);
        assertEquals(institution.id(), profile.institution.id);
        assertEquals(student.registration().get("address"), profile.address);
    }

    @Test
    void databaseRejectsDuplicateCpfEmailAndNegativeBalance() throws Exception {
        var institution = data.partner("ENSINO");
        var first = data.student(institution);
        var second = data.student(institution);
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("UPDATE students SET cpf = ? WHERE id = ?",
                        first.registration().get("cpf"), second.id()));
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("UPDATE accounts SET email = ? WHERE id = ?",
                        first.email(), second.id()));
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("UPDATE accounts SET balance = -1 WHERE id = ?", first.id()));
        assertEquals(second.registration().get("cpf"), students.findById(second.id()).orElseThrow().cpf);
        assertEquals(0, accounts.findById(first.id()).orElseThrow().balance);
    }

    @Test
    void foreignKeysProtectInstitutionAndProfileRecords() throws Exception {
        var institution = data.partner("ENSINO");
        var student = data.student(institution);
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("DELETE FROM partners WHERE id = ?", institution.id()));
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("DELETE FROM accounts WHERE id = ?", student.id()));
        assertTrue(students.existsById(student.id()));
    }

}
