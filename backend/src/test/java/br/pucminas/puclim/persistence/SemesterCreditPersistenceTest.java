package br.pucminas.puclim.persistence;

import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import br.pucminas.puclim.config.ScheduledJobs;
import br.pucminas.puclim.repository.AccountRepository;
import br.pucminas.puclim.repository.LedgerEntryRepository;
import br.pucminas.puclim.service.FinancialService;
import br.pucminas.puclim.support.AbstractDatabaseTest;
import br.pucminas.puclim.support.ConcurrentTestActions;

@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:(mysql|mariadb):.*")
class SemesterCreditPersistenceTest extends AbstractDatabaseTest {

    @Autowired
    FinancialService finance;
    @Autowired
    AccountRepository accounts;
    @Autowired
    LedgerEntryRepository ledger;
    @Autowired
    ScheduledJobs jobs;
    @Autowired
    JdbcTemplate jdbc;

    @Test
    void initialQuotaIsRecordedAndTheSameSemesterCannotBeCreditedTwice() throws Exception {
        var teacher = data.teacher(data.partner("ENSINO"));
        assertEquals(1000, accounts.findById(teacher.id()).orElseThrow().balance);
        assertFalse(finance.creditSemester(teacher.id(), jobs.currentSemester()));
        assertEquals(1,
                jdbc.queryForObject("SELECT COUNT(*) FROM semester_credits WHERE teacher_id = ? AND semester = ?",
                        Long.class, teacher.id(), jobs.currentSemester()));
        assertEquals(1, ledger.findByAccountIdOrderByDateDesc(teacher.id()).size());
        assertEquals("COTA", ledger.findByAccountIdOrderByDateDesc(teacher.id()).get(0).kind);
    }

    @Test
    void concurrentSemesterCreditOccursOnceAndAccumulatedBalanceDoesNotExpire() throws Exception {
        var teacher = data.teacher(data.partner("ENSINO"));
        var results = ConcurrentTestActions.together(() -> finance.creditSemester(teacher.id(), "2099-1"),
                () -> finance.creditSemester(teacher.id(), "2099-1"));
        assertEquals(Set.of(true, false), new HashSet<>(results));
        assertEquals(2000, accounts.findById(teacher.id()).orElseThrow().balance);
        assertEquals(2000, ledger.sum(teacher.id()));
        assertEquals(1,
                jdbc.queryForObject("SELECT COUNT(*) FROM semester_credits WHERE teacher_id = ? AND semester = ?",
                        Long.class, teacher.id(), "2099-1"));
    }

}
