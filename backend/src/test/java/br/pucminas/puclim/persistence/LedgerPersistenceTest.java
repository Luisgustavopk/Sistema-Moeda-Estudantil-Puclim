package br.pucminas.puclim.persistence;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;

import br.pucminas.puclim.repository.AccountRepository;
import br.pucminas.puclim.repository.LedgerEntryRepository;
import br.pucminas.puclim.support.AbstractDatabaseTest;

@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:(mysql|mariadb):.*")
class LedgerPersistenceTest extends AbstractDatabaseTest {

    @Autowired
    AccountRepository accounts;
    @Autowired
    LedgerEntryRepository ledger;

    @Test
    void transferPersistsBalancedEntriesWithOneOperationAndPreservesReason() throws Exception {
        var fixture = data.academic();
        data.transfer(fixture, 120, "Trabalho colaborativo");
        var sent = ledger.findByAccountIdOrderByDateDesc(fixture.teacher().id()).stream()
                .filter(entry -> entry.kind.equals("ENVIO")).findFirst().orElseThrow();
        var received = ledger.findByAccountIdOrderByDateDesc(fixture.student().id()).get(0);
        assertEquals(sent.operationId, received.operationId);
        assertEquals(0, sent.amount + received.amount);
        assertEquals("Trabalho colaborativo", received.reason);
        assertEquals(fixture.teacher().name(), received.counterpart);
        assertEquals(880, accounts.findById(fixture.teacher().id()).orElseThrow().balance);
        assertEquals(120, accounts.findById(fixture.student().id()).orElseThrow().balance);
        assertEquals(ledger.sum(fixture.teacher().id()),
                accounts.findById(fixture.teacher().id()).orElseThrow().balance);
        assertEquals(ledger.sum(fixture.student().id()),
                accounts.findById(fixture.student().id()).orElseThrow().balance);
    }

    @Test
    void deactivationRetainsTheFinancialHistoryAndPreventsAuthentication() throws Exception {
        var fixture = data.academic();
        data.transfer(fixture, 120, "Reconhecimento");
        long balance = ledger.sum(fixture.student().id());
        int entries = ledger.findByAccountIdOrderByDateDesc(fixture.student().id()).size();
        fixture.student().client().expect("DELETE", "/conta", null, 204);
        assertFalse(accounts.findById(fixture.student().id()).orElseThrow().active);
        assertEquals(balance, ledger.sum(fixture.student().id()));
        assertEquals(entries, ledger.findByAccountIdOrderByDateDesc(fixture.student().id()).size());
        fixture.student().client().expect("GET", "/auth/session", null, 401);
    }

}
