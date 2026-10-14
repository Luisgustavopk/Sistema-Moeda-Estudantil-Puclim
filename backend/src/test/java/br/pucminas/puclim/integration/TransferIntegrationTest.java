package br.pucminas.puclim.integration;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;

import br.pucminas.puclim.repository.AccountRepository;
import br.pucminas.puclim.repository.LedgerEntryRepository;
import br.pucminas.puclim.support.AbstractDatabaseTest;
import br.pucminas.puclim.support.ConcurrentTestActions;

@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:(mysql|mariadb):.*")
class TransferIntegrationTest extends AbstractDatabaseTest {

    @Autowired
    AccountRepository accounts;
    @Autowired
    LedgerEntryRepository ledger;

    @Test
    void transferValidatesAmountReasonAndBalanceAndReplaysOnlyIdenticalRequests() throws Exception {
        var fixture = data.academic();
        var teacher = fixture.teacher().client();
        for (Object amount : new Object[] { 0L, -1L, 1.5, 2000L }) {
            teacher.result(teacher.call("POST", "/transferencias", Map.of("studentId", fixture.student().id(),
                    "amount", amount, "reason", "Participacao"), UUID.randomUUID().toString()),
                    amount.equals(2000L) ? 409 : 400);
        }
        teacher.result(teacher.call("POST", "/transferencias", Map.of("studentId", fixture.student().id(),
                "amount", 10, "reason", " "), UUID.randomUUID().toString()), 400);
        String key = UUID.randomUUID().toString();
        var payload = Map.of("studentId", fixture.student().id(), "amount", 200, "reason", "Excelente participacao");
        var first = teacher.result(teacher.call("POST", "/transferencias", payload, key), 200);
        assertEquals(first.path("id"),
                teacher.result(teacher.call("POST", "/transferencias", payload, key), 200).path("id"));
        teacher.result(teacher.call("POST", "/transferencias", Map.of("studentId", fixture.student().id(),
                "amount", 201, "reason", "Excelente participacao"), key), 409);
        assertEquals(200, fixture.student().client().ok("GET", "/auth/session", null).path("balance").asLong());
        assertEquals(800, teacher.ok("GET", "/auth/session", null).path("balance").asLong());
        assertTrue(fixture.student().client().ok("GET", "/conta/extrato", null).toString()
                .contains("Excelente participacao"));
        assertTrue(teacher.ok("GET", "/conta/extrato", null).toString().contains(fixture.student().name()));
    }

    @Test
    void concurrentTransfersCannotSpendTheSameBalance() throws Exception {
        var fixture = data.academic();
        var second = data.authenticated(fixture.teacher());
        var payload = Map.of("studentId", fixture.student().id(), "amount", 600, "reason",
                "Reconhecimento concorrente");
        var responses = ConcurrentTestActions.together(
                () -> fixture.teacher().client().call("POST", "/transferencias", payload, UUID.randomUUID().toString())
                        .statusCode(),
                () -> second.call("POST", "/transferencias", payload, UUID.randomUUID().toString()).statusCode());
        assertEquals(List.of(200, 409), responses.stream().sorted().toList());
        assertEquals(400, accounts.findById(fixture.teacher().id()).orElseThrow().balance);
        assertEquals(600, accounts.findById(fixture.student().id()).orElseThrow().balance);
        assertEquals(ledger.sum(fixture.teacher().id()),
                accounts.findById(fixture.teacher().id()).orElseThrow().balance);
        assertEquals(ledger.sum(fixture.student().id()),
                accounts.findById(fixture.student().id()).orElseThrow().balance);
    }

}
