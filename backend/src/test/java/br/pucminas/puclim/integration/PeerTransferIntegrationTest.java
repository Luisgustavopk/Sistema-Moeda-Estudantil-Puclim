package br.pucminas.puclim.integration;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;

import br.pucminas.puclim.repository.AccountRepository;
import br.pucminas.puclim.repository.LedgerEntryRepository;
import br.pucminas.puclim.service.ProgressionService;
import br.pucminas.puclim.support.AbstractDatabaseTest;
import br.pucminas.puclim.support.ConcurrentTestActions;
import br.pucminas.puclim.support.TestAccount;
import br.pucminas.puclim.support.TestDataFactory.AcademicFixture;
import tools.jackson.databind.JsonNode;

@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:(mysql|mariadb):.*")
class PeerTransferIntegrationTest extends AbstractDatabaseTest {
    private static final String BASE = "/transferencias-alunos";
    private static final String CRITERIA = "Reconhecer colaboração na atividade em grupo, com justificativa.";
    @Autowired
    AccountRepository accounts;
    @Autowired
    LedgerEntryRepository ledger;
    @Autowired
    ProgressionService progression;

    private record Setup(AcademicFixture academic, TestAccount recipient) {
    }

    private Setup setup() throws Exception {
        var fixture = data.academic();
        var recipient = data.student(fixture.institution());
        data.transfer(fixture, 100, "Reconhecimento original");
        for (var student : List.of(fixture.student(), recipient))
            fixture.teacher().client().expect("PUT", BASE + "/vinculos/" + student.id(), null, 204);
        fixture.teacher().client().expect("PUT", BASE + "/criterios", Map.of("criteria", CRITERIA), 204);
        return new Setup(fixture, recipient);
    }

    private Map<String, Object> payload(Setup setup, long amount) {
        return Map.of("teacherId", setup.academic.teacher().id(), "recipientId", setup.recipient.id(),
                "amount", amount, "reason", "Colaboração na atividade", "criteria", CRITERIA);
    }

    private JsonNode request(Setup setup, long amount) throws Exception {
        var client = setup.academic.student().client();
        return client.result(client.call("POST", BASE, payload(setup, amount), UUID.randomUUID().toString()), 200);
    }

    private Map<String, Object> decision(boolean approve) {
        return Map.of("approve", approve, "feedback",
                approve ? "Atende aos critérios publicados." : "Não atende aos critérios.");
    }

    private String reviewPath(JsonNode request) {
        return BASE + "/" + request.path("id").asString() + "/analise";
    }

    private void balances(Setup setup, long sender, long recipient) {
        assertEquals(sender, accounts.findById(setup.academic.student().id()).orElseThrow().balance);
        assertEquals(recipient, accounts.findById(setup.recipient.id()).orElseThrow().balance);
        assertEquals(sender, ledger.sum(setup.academic.student().id()));
        assertEquals(recipient, ledger.sum(setup.recipient.id()));
    }

    @Test
    void approvalMovesOnlyStudentBalancesOnceAndPreservesCriteriaAndMerit() throws Exception {
        var setup = setup();
        var request = request(setup, 40);
        assertEquals("PENDENTE", request.path("status").asString());
        balances(setup, 100, 0);
        // Later policy edits never rewrite the criteria attached to an existing
        // request.
        var teacher = setup.academic.teacher().client();
        teacher.expect("PUT", BASE + "/criterios", Map.of("criteria", "Novos critérios para próximos pedidos"), 204);
        var response = teacher.ok("POST", reviewPath(request), decision(true));
        assertEquals("APROVADA", response.path("status").asString());
        assertEquals(CRITERIA, response.path("criteria").asString());
        assertFalse(response.path("reviewedAt").isNull());
        teacher.ok("POST", reviewPath(request), decision(true));
        teacher.expect("POST", reviewPath(request), decision(false), 409);
        balances(setup, 60, 40);
        assertEquals(900, accounts.findById(setup.academic.teacher().id()).orElseThrow().balance);
        assertEquals(100, progression.total(setup.academic.student().id()));
        assertEquals(0, progression.total(setup.recipient.id()));
        var sent = ledger.findByAccountIdOrderByDateDesc(setup.academic.student().id()).stream()
                .filter(e -> e.kind.equals("TRANSF_ENVIO")).toList();
        var received = ledger.findByAccountIdOrderByDateDesc(setup.recipient.id());
        assertEquals(1, sent.size());
        assertEquals(1, received.size());
        assertEquals(request.path("id").asString(), sent.get(0).operationId);
        assertEquals(sent.get(0).operationId, received.get(0).operationId);
        assertEquals("TRANSF_ENTRADA", received.get(0).kind);
        assertTrue(setup.recipient.client().ok("GET", "/gamificacao/notificacoes", null).toString()
                .contains("Transferência aprovada"));
    }

    @Test
    void rejectionNeedsFeedbackAndDoesNotMoveCoins() throws Exception {
        var setup = setup();
        var request = request(setup, 70);
        var teacher = setup.academic.teacher().client();
        teacher.expect("POST", reviewPath(request), Map.of("approve", false, "feedback", "  "), 400);
        teacher.expect("POST", reviewPath(request), Map.of("feedback", "Sem decisão"), 400);
        assertEquals("REJEITADA", teacher.ok("POST", reviewPath(request), decision(false)).path("status").asString());
        teacher.ok("POST", reviewPath(request), decision(false));
        teacher.expect("POST", reviewPath(request), decision(true), 409);
        balances(setup, 100, 0);
    }

    @Test
    void onlyLinkedStudentsAndResponsibleTeacherHaveAccessWithoutPrivateData() throws Exception {
        var setup = setup();
        var fixture = setup.academic;
        var unlinked = data.student(fixture.institution());
        var anotherTeacher = data.teacher(fixture.institution());
        var otherInstitution = data.academic();
        fixture.teacher().client().expect("PUT", BASE + "/vinculos/" + otherInstitution.student().id(), null, 400);
        fixture.teacher().client().expect("PUT", BASE + "/vinculos/" + fixture.student().id(), null, 204);
        var studentBoard = fixture.student().client().ok("GET", BASE, null);
        assertEquals(2, studentBoard.path("groups").get(0).path("students").size());
        assertFalse(studentBoard.toString().contains(unlinked.id()));
        for (String field : List.of("cpf", "email", "address", "password", "login"))
            assertFalse(studentBoard.toString().contains("\"" + field + "\""));
        var invalid = Map.of("teacherId", fixture.teacher().id(), "recipientId", unlinked.id(),
                "amount", 10, "reason", "Teste", "criteria", CRITERIA);
        fixture.student().client()
                .result(fixture.student().client().call("POST", BASE, invalid, UUID.randomUUID().toString()), 400);
        var self = Map.of("teacherId", fixture.teacher().id(), "recipientId", fixture.student().id(),
                "amount", 10, "reason", "Teste", "criteria", CRITERIA);
        fixture.student().client()
                .result(fixture.student().client().call("POST", BASE, self, UUID.randomUUID().toString()), 400);
        var request = request(setup, 10);
        anotherTeacher.client().expect("POST", reviewPath(request), decision(true), 403);
        fixture.student().client().expect("POST", reviewPath(request), decision(true), 403);
        fixture.student().client().expect("PUT", BASE + "/criterios", Map.of("criteria", "Tentativa"), 403);
        fixture.student().client().expect("PUT", BASE + "/vinculos/" + unlinked.id(), null, 403);
        fixture.teacher().client().result(
                fixture.teacher().client().call("POST", BASE, payload(setup, 10), UUID.randomUUID().toString()), 403);
        fixture.institution().client().expect("GET", BASE, null, 403);
        data.anonymous().expect("GET", BASE, null, 401);
        assertEquals(0, unlinked.client().ok("GET", BASE, null).path("requests").size());
        assertEquals(0, anotherTeacher.client().ok("GET", BASE, null).path("requests").size());
        assertEquals(1, setup.recipient.client().ok("GET", BASE, null).path("requests").size());
        balances(setup, 100, 0);
    }

    @Test
    void criteriaAmountsAndIdempotencyAreValidatedAndStaleCriteriaAreRejected() throws Exception {
        var setup = setup();
        var client = setup.academic.student().client();
        client.expect("POST", BASE, payload(setup, 20), 400);
        for (Object amount : List.of(0, -1, 1.5, 101, 9007199254740992L)) {
            var invalid = Map.of("teacherId", setup.academic.teacher().id(), "recipientId", setup.recipient.id(),
                    "amount", amount, "reason", "Teste", "criteria", CRITERIA);
            client.result(client.call("POST", BASE, invalid, UUID.randomUUID().toString()),
                    amount.equals(101) ? 409 : 400);
        }
        String key = UUID.randomUUID().toString();
        var first = client.result(client.call("POST", BASE, payload(setup, 30), key), 200);
        assertEquals(first.path("id"),
                client.result(client.call("POST", BASE, payload(setup, 30), key), 200).path("id"));
        client.result(client.call("POST", BASE, payload(setup, 31), key), 409);
        setup.academic.teacher().client().expect("PUT", BASE + "/criterios",
                Map.of("criteria", "Critérios atualizados"), 204);
        client.result(client.call("POST", BASE, payload(setup, 30), UUID.randomUUID().toString()), 409);
        // A replay still returns its original request after a criteria change.
        assertEquals(first.path("id"),
                client.result(client.call("POST", BASE, payload(setup, 30), key), 200).path("id"));
        balances(setup, 100, 0);
    }

    @Test
    void criteriaMustBePublishedAndLinksCannotBeRemovedWhilePending() throws Exception {
        var fixture = data.academic();
        var recipient = data.student(fixture.institution());
        var setup = new Setup(fixture, recipient);
        data.transfer(fixture, 100, "Reconhecimento");
        for (var student : List.of(fixture.student(), recipient))
            fixture.teacher().client().expect("PUT", BASE + "/vinculos/" + student.id(), null, 204);
        var client = fixture.student().client();
        client.result(client.call("POST", BASE, payload(setup, 10), UUID.randomUUID().toString()), 409);
        fixture.teacher().client().expect("PUT", BASE + "/criterios", Map.of("criteria", "  "), 400);
        fixture.teacher().client().expect("PUT", BASE + "/criterios", Map.of("criteria", CRITERIA), 204);
        var request = request(setup, 10);
        fixture.teacher().client().expect("DELETE", BASE + "/vinculos/" + recipient.id(), null, 409);
        fixture.teacher().client().ok("POST", reviewPath(request), decision(false));
        fixture.teacher().client().expect("DELETE", BASE + "/vinculos/" + recipient.id(), null, 204);
        client.result(client.call("POST", BASE, payload(setup, 10), UUID.randomUUID().toString()), 400);
        fixture.teacher().client().expect("PUT", BASE + "/vinculos/" + recipient.id(), null, 204);
        request(setup, 10);
    }

    @Test
    void spendingWhilePendingPreventsApprovalAndRollsBackAllFinancialWrites() throws Exception {
        var setup = setup();
        var request = request(setup, 50);
        var company = data.partner("EMPRESA");
        data.redeem(setup.academic.student(), data.advantage(company, 90));
        var teacher = setup.academic.teacher().client();
        teacher.expect("POST", reviewPath(request), decision(true), 409);
        balances(setup, 10, 0);
        assertEquals("PENDENTE", teacher.ok("GET", BASE, null).path("requests").get(0).path("status").asString());
        assertEquals(0, ledger.findByAccountIdOrderByDateDesc(setup.academic.student().id()).stream()
                .filter(e -> e.kind.equals("TRANSF_ENVIO")).count());
        teacher.ok("POST", reviewPath(request), decision(false));
    }

    @Test
    void deactivatedRecipientCannotReceiveButTeacherCanReject() throws Exception {
        var setup = setup();
        var request = request(setup, 25);
        setup.recipient.client().expect("DELETE", "/conta", null, 204);
        setup.academic.teacher().client().expect("POST", reviewPath(request), decision(true), 409);
        setup.academic.teacher().client().ok("POST", reviewPath(request), decision(false));
        balances(setup, 100, 0);
    }

    @Test
    void concurrentApprovalsCannotSpendTheSameCoins() throws Exception {
        var setup = setup();
        var first = request(setup, 60);
        var second = request(setup, 60);
        var teacher = setup.academic.teacher().client();
        var otherSession = data.authenticated(setup.academic.teacher());
        var statuses = ConcurrentTestActions.together(
                () -> teacher.call("POST", reviewPath(first), decision(true), null).statusCode(),
                () -> otherSession.call("POST", reviewPath(second), decision(true), null).statusCode());
        assertEquals(List.of(200, 409), statuses.stream().sorted().toList());
        balances(setup, 40, 60);
    }

    @Test
    void concurrentReplaysCreateOneRequestAndOnePairOfEntries() throws Exception {
        var setup = setup();
        var student = setup.academic.student().client();
        var otherStudentSession = data.authenticated(setup.academic.student());
        String key = UUID.randomUUID().toString();
        var ids = ConcurrentTestActions.together(
                () -> student.result(student.call("POST", BASE, payload(setup, 40), key), 200).path("id").asString(),
                () -> otherStudentSession.result(otherStudentSession.call("POST", BASE, payload(setup, 40), key), 200)
                        .path("id").asString());
        assertEquals(ids.get(0), ids.get(1));
        assertEquals(1, student.ok("GET", BASE, null).path("requests").size());
        var teacher = setup.academic.teacher().client();
        var otherTeacherSession = data.authenticated(setup.academic.teacher());
        String path = BASE + "/" + ids.get(0) + "/analise";
        assertEquals(List.of(200, 200), ConcurrentTestActions.together(
                () -> teacher.call("POST", path, decision(true), null).statusCode(),
                () -> otherTeacherSession.call("POST", path, decision(true), null).statusCode()));
        balances(setup, 60, 40);
        assertEquals(1, ledger.findByAccountIdOrderByDateDesc(setup.recipient.id()).size());
    }
}
