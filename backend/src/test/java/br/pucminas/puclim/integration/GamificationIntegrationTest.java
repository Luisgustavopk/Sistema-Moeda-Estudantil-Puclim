package br.pucminas.puclim.integration;

import static org.junit.jupiter.api.Assertions.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.*;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import br.pucminas.puclim.config.GamificationPolicy;
import br.pucminas.puclim.repository.*;
import br.pucminas.puclim.service.GamificationEvents;
import br.pucminas.puclim.support.*;
import tools.jackson.databind.JsonNode;

@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:(mysql|mariadb):.*")
@Import(GamificationIntegrationTest.TimeConfiguration.class)
class GamificationIntegrationTest extends AbstractDatabaseTest {
    @TestConfiguration
    static class TimeConfiguration {
        @Bean
        @Primary
        public MutableClock testClock() {
            return new MutableClock();
        }

        @Bean
        public FailureProbe failureProbe() {
            return new FailureProbe();
        }
    }

    static class MutableClock extends Clock {
        volatile Instant value = Instant.now();

        @Override
        public ZoneId getZone() {
            return ZoneId.of("America/Sao_Paulo");
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return Clock.fixed(value, zone);
        }

        @Override
        public Instant instant() {
            return value;
        }
    }

    static class FailureProbe {
        final AtomicReference<String> failFor = new AtomicReference<>();

        @EventListener
        public void receive(GamificationEvents.CoinsReceived e) {
            if (e.studentId().equals(failFor.get()))
                throw new IllegalStateException("Intentional rollback probe");
        }
    }

    @Autowired
    MutableClock clock;
    @Autowired
    FailureProbe probe;
    @Autowired
    JdbcTemplate jdbc;
    @Autowired
    AccountRepository accounts;
    @Autowired
    LedgerEntryRepository ledger;
    @Autowired
    br.pucminas.puclim.service.MissionService missions;
    @Autowired
    br.pucminas.puclim.service.CommunityService community;

    @BeforeEach
    public void resetClock() {
        clock.value = Instant.now();
        probe.failFor.set(null);
    }

    @AfterEach
    public void restoreClock() {
        clock.value = Instant.now();
        probe.failFor.set(null);
    }

    private String semester() {
        return GamificationPolicy.semester(LocalDate.now(clock));
    }

    private Map<String, Object> mission(long reward, int capacity) {
        return Map.of("title", "Pesquisa aplicada", "description", "Entregue um relatório de pesquisa.", "reward",
                reward, "capacity", capacity, "deadline", clock.instant().plus(Duration.ofDays(30)).toString());
    }

    private String createMission(TestAccount teacher, long reward, int capacity) throws Exception {
        return teacher.client().result(teacher.client().call("POST", "/gamificacao/missoes", mission(reward, capacity),
                UUID.randomUUID().toString()), 200).path("id").asString();
    }

    private void questions(TestAccount teacher) throws Exception {
        for (int i = 0; i < 5; i++)
            teacher.client().ok("POST", "/gamificacao/perguntas", Map.of("prompt", "Pergunta " + i, "area",
                    "Engenharia", "options", List.of("Correta", "Incorreta"), "correctIndex", 0, "active", true));
    }

    private JsonNode complete(TestAccount student) throws Exception {
        var q = student.client().ok("POST", "/gamificacao/quizzes/hoje", null);
        return student.client().ok("POST", "/gamificacao/quizzes/" + q.path("id").asString() + "/respostas",
                Map.of("answers", List.of(0, 0, 0, 0, 0)));
    }

    @Test
    void publicProfileHidesPersonalDataAndBadgesAreGrantedOnlyOnce() throws Exception {
        var f = data.academic();
        data.transfer(f, 100, "Mérito");
        for (int i = 0; i < 2; i++) {
            var profile = f.teacher().client().ok("GET", "/gamificacao/perfis/" + f.student().id(), null);
            assertEquals(2, profile.path("level").asInt());
            assertEquals(100, profile.path("stats").path("totalReceived").asLong());
            for (String key : List.of("cpf", "rg", "address", "email", "login", "passwordHash", "balance"))
                assertFalse(profile.has(key), key);
        }
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM badge_awards WHERE student_id=?", Long.class,
                f.student().id()));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM level_history WHERE student_id=?", Long.class,
                f.student().id()));
        assertEquals(f.student().name(), data.teacher(data.partner("ENSINO")).client()
                .ok("GET", "/gamificacao/perfis/" + f.student().id(), null).path("name").asString());
        f.institution().client().expect("GET", "/gamificacao/perfis/" + f.student().id(), null, 403);
    }

    @Test
    void rankingUsesReceiptsNotAvailableBalanceAndBreaksTiesByStreakThenFirstCoin() throws Exception {
        var f = data.academic();
        var second = data.student(f.institution());
        data.transfer(f, 100, "Primeiro");
        f.teacher().client().result(f.teacher().client().call("POST", "/transferencias",
                Map.of("studentId", second.id(), "amount", 100, "reason", "Segundo"), UUID.randomUUID().toString()),
                200);
        var company = data.partner("EMPRESA");
        data.redeem(f.student(), data.advantage(company, 90));
        var ranking = f.student().client().ok("GET", "/gamificacao/ranking?size=1", null);
        assertEquals(f.student().id(), ranking.path("content").get(0).path("studentId").asString());
        assertEquals(100, ranking.path("content").get(0).path("received").asLong());
        assertEquals(2, ranking.path("total").asInt());
        assertEquals(2, second.client().ok("GET", "/gamificacao/ranking", null).path("own").path("position").asInt());
        questions(f.teacher());
        complete(second);
        assertEquals(second.id(), f.student().client().ok("GET", "/gamificacao/ranking", null).path("content").get(0)
                .path("studentId").asString());
    }

    @Test
    void questionOwnershipSnapshotAndServerGradingAreEnforced() throws Exception {
        var f = data.academic();
        questions(f.teacher());
        var q = f.student().client().ok("POST", "/gamificacao/quizzes/hoje", null);
        String id = q.path("id").asString();
        assertTrue(q.path("items").get(0).path("correctIndex").isNull());
        var own = f.teacher().client().ok("GET", "/gamificacao/perguntas", null).get(0);
        var input = Map.of("prompt", "Alterada", "area", "Engenharia", "options", List.of("Errada", "Certa"),
                "correctIndex", 1, "active", false);
        var another = data.teacher(f.institution());
        another.client().expect("PUT", "/gamificacao/perguntas/" + own.path("id").asString(), input, 403);
        f.teacher().client().ok("PUT", "/gamificacao/perguntas/" + own.path("id").asString(), input);
        var answers = Map.of("answers", List.of(0, 0, 0, 0, 0));
        var result = f.student().client().ok("POST", "/gamificacao/quizzes/" + id + "/respostas", answers);
        assertEquals(5, result.path("correctCount").asInt());
        assertEquals(10, result.path("grade").asDouble());
        assertEquals(result, f.student().client().ok("POST", "/gamificacao/quizzes/" + id + "/respostas", answers));
        f.student().client().expect("POST", "/gamificacao/quizzes/" + id + "/respostas",
                Map.of("answers", List.of(1, 1, 1, 1, 1)), 409);
        assertEquals(id, f.student().client().ok("POST", "/gamificacao/quizzes/hoje", null).path("id").asString());
        data.student(f.institution()).client().expect("POST", "/gamificacao/quizzes/" + id + "/respostas", answers,
                403);
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM quiz_attempts WHERE student_id=?", Long.class,
                f.student().id()));
    }

    @Test
    void concurrentQuizSubmissionsProduceOneCompletion() throws Exception {
        var f = data.academic();
        questions(f.teacher());
        String id = f.student().client().ok("POST", "/gamificacao/quizzes/hoje", null).path("id").asString();
        var other = data.authenticated(f.student());
        var payload = Map.of("answers", List.of(0, 0, 0, 0, 0));
        var results = ConcurrentTestActions.together(
                () -> f.student().client().call("POST", "/gamificacao/quizzes/" + id + "/respostas", payload, null)
                        .statusCode(),
                () -> other.call("POST", "/gamificacao/quizzes/" + id + "/respostas", payload, null).statusCode());
        assertEquals(List.of(200, 200), results);
        assertEquals(1, f.student().client().ok("GET", "/gamificacao/quizzes", null).path("streak").asInt());
    }

    @Test
    void streakCyclesPayWeeklyOnceAndResetAfterMissingDay() throws Exception {
        var f = data.academic();
        questions(f.teacher());
        // Stay within one semester while advancing the server's test clock.
        clock.value = LocalDate.now().withMonth(8).withDayOfMonth(1).plusYears(1).atTime(12, 0).atZone(clock.getZone())
                .toInstant();
        f.institution().client().ok("POST", "/gamificacao/fundo/" + semester() + "/dotacao",
                Map.of("amount", 100, "origin", "Orçamento autorizado para testes"));
        for (int day = 0; day < 14; day++) {
            complete(f.student());
            if (day < 13)
                clock.value = clock.value.plus(Duration.ofDays(1));
        }
        assertEquals(40, accounts.findById(f.student().id()).orElseThrow().balance);
        assertEquals(2,
                jdbc.queryForObject("SELECT COUNT(*) FROM reward_payments WHERE student_id=? AND kind='RECOMPENSA'",
                        Long.class, f.student().id()));
        complete(f.student());
        assertEquals(40, accounts.findById(f.student().id()).orElseThrow().balance);
        clock.value = clock.value.plus(Duration.ofDays(2));
        assertEquals(0, f.student().client().ok("GET", "/gamificacao/quizzes", null).path("streak").asInt());
        complete(f.student());
        var status = f.student().client().ok("GET", "/gamificacao/quizzes", null);
        assertEquals(1, status.path("streak").asInt());
        assertEquals(14, status.path("bestStreak").asInt());
    }

    @Test
    void insufficientFundRecordsPendingAndLaterAllocationPaysExactlyOnce() throws Exception {
        var f = data.academic();
        questions(f.teacher());
        complete(f.student());
        data.transfer(f, 100, "Com bônus");
        assertEquals(100, accounts.findById(f.student().id()).orElseThrow().balance);
        assertEquals("PENDENTE",
                f.student().client().ok("GET", "/gamificacao/recompensas", null).get(0).path("status").asString());
        f.institution().client().ok("POST", "/gamificacao/fundo/" + semester() + "/dotacao",
                Map.of("amount", 10, "origin", "Dotação aprovada"));
        for (int i = 0; i < 2; i++)
            f.institution().client().expect("POST", "/gamificacao/fundo/" + semester() + "/reprocessar", null, 204);
        assertEquals(110, accounts.findById(f.student().id()).orElseThrow().balance);
        assertEquals(0,
                f.institution().client().ok("GET", "/gamificacao/fundo/" + semester(), null).path("balance").asLong());
        assertEquals(ledger.sum(f.student().id()), accounts.findById(f.student().id()).orElseThrow().balance);
    }

    @Test
    void missionReservesAvailableBalanceAndConcurrentLastSeatCannotBeOverfilled() throws Exception {
        var f = data.academic();
        String id = createMission(f.teacher(), 100, 1);
        var second = data.student(f.institution());
        assertEquals(900, accounts.findById(f.teacher().id()).orElseThrow().balance);
        var results = ConcurrentTestActions.together(
                () -> f.student().client().call("POST", "/gamificacao/missoes/" + id + "/aceitar", null, null)
                        .statusCode(),
                () -> second.client().call("POST", "/gamificacao/missoes/" + id + "/aceitar", null, null).statusCode());
        assertEquals(List.of(200, 409), results.stream().sorted().toList());
        assertEquals(1, jdbc.queryForObject("SELECT occupied FROM missions WHERE id=?", Integer.class, id));
        f.teacher().client()
                .result(f.teacher().client().call("POST", "/transferencias",
                        Map.of("studentId", f.student().id(), "amount", 950, "reason", "Tentativa de consumir reserva"),
                        UUID.randomUUID().toString()), 409);
        assertEquals(ledger.sum(f.teacher().id()), accounts.findById(f.teacher().id()).orElseThrow().balance);
    }

    @Test
    void missionApprovalIsIdempotentAndClosedMissionPreservesSubmittedObligations() throws Exception {
        var f = data.academic();
        String id = createMission(f.teacher(), 100, 3);
        var accepted = f.student().client().ok("POST", "/gamificacao/missoes/" + id + "/aceitar", null);
        String p = accepted.path("participants").get(0).path("id").asString();
        f.student().client().ok("POST", "/gamificacao/participacoes/" + p + "/entregar",
                Map.of("text", "Relatório completo"));
        f.teacher().client().ok("POST", "/gamificacao/missoes/" + id + "/encerrar", null);
        assertEquals(900, accounts.findById(f.teacher().id()).orElseThrow().balance);
        assertEquals(100, jdbc.queryForObject("SELECT reserved FROM missions WHERE id=?", Long.class, id));
        f.teacher().client().ok("POST", "/gamificacao/participacoes/" + p + "/devolver",
                Map.of("text", "Inclua referências"));
        f.student().client().ok("POST", "/gamificacao/participacoes/" + p + "/entregar",
                Map.of("text", "Relatório com referências"));
        var second = data.authenticated(f.teacher());
        var responses = ConcurrentTestActions
                .together(
                        () -> f.teacher().client()
                                .call("POST", "/gamificacao/participacoes/" + p + "/aprovar",
                                        Map.of("text", "Aprovado"), null)
                                .statusCode(),
                        () -> second.call("POST", "/gamificacao/participacoes/" + p + "/aprovar",
                                Map.of("text", "Aprovado"), null).statusCode());
        assertEquals(List.of(200, 200), responses);
        assertEquals(100, accounts.findById(f.student().id()).orElseThrow().balance);
        assertEquals(0, jdbc.queryForObject("SELECT reserved FROM missions WHERE id=?", Long.class, id));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM ledger_entries WHERE account_id=? AND kind='MISSAO'",
                Long.class, f.student().id()));
    }

    @Test
    void missionPublicationReplaysAndInsufficientBalanceRollsBackTheMission() throws Exception {
        var f = data.academic();
        String key = UUID.randomUUID().toString();
        var input = mission(100, 2);
        var first = f.teacher().client().result(f.teacher().client().call("POST", "/gamificacao/missoes", input, key),
                200);
        assertEquals(first.path("id"), f.teacher().client()
                .result(f.teacher().client().call("POST", "/gamificacao/missoes", input, key), 200).path("id"));
        f.teacher().client().result(f.teacher().client().call("POST", "/gamificacao/missoes", mission(900, 2),
                UUID.randomUUID().toString()), 409);
        assertEquals(1,
                jdbc.queryForObject("SELECT COUNT(*) FROM missions WHERE teacher_id=?", Long.class, f.teacher().id()));
        assertEquals(800, accounts.findById(f.teacher().id()).orElseThrow().balance);
    }

    @Test
    void couponDonationDoesNotSpendCoinsAndCannotBeUsedOrDonatedAgain() throws Exception {
        var f = data.academic();
        data.transfer(f, 100, "Reconhecimento");
        var company = data.partner("EMPRESA");
        var beneficiary = data.partner("BENEFICIARIA");
        var coupon = data.redeem(f.student(), data.advantage(company, 40));
        String code = coupon.path("code").asString();
        for (int i = 0; i < 2; i++)
            f.student().client().ok("POST", "/gamificacao/cupons/" + code + "/doar",
                    Map.of("beneficiaryId", beneficiary.id()));
        assertEquals(60, accounts.findById(f.student().id()).orElseThrow().balance);
        company.client().expect("POST", "/cupons/" + code + "/utilizar", null, 409);
        f.student().client().expect("POST", "/gamificacao/cupons/" + code + "/doar",
                Map.of("beneficiaryId", data.partner("BENEFICIARIA").id()), 409);
        assertEquals(1, beneficiary.client().ok("GET", "/gamificacao/doacoes", null).size());
        assertEquals("DOADO", f.student().client().ok("GET", "/cupons", null).get(0).path("status").asString());
        assertTrue(data.partner("BENEFICIARIA").client().ok("GET", "/gamificacao/doacoes", null).isEmpty());
    }

    @Test
    void institutionAllocationIsImmutableBoundedAndRestrictedToOwner() throws Exception {
        var f = data.academic();
        String path = "/gamificacao/fundo/" + semester();
        var input = Map.of("amount", 100, "origin", "Orçamento aprovado");
        f.teacher().client().expect("POST", path + "/dotacao", input, 403);
        f.student().client().expect("POST", path + "/dotacao", input, 403);
        data.partner("EMPRESA").client().expect("POST", path + "/dotacao", input, 403);
        for (int i = 0; i < 2; i++)
            f.institution().client().ok("POST", path + "/dotacao", input);
        f.institution().client().expect("POST", path + "/dotacao", Map.of("amount", 200, "origin", "Alterado"), 409);
        assertEquals(0, data.partner("ENSINO").client().ok("GET", path, null).path("balance").asLong());
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM institution_funds WHERE institution_id=?", Long.class,
                f.institution().id()));
    }

    @Test
    void semesterClosureFreezesWinnersAndRepeatedProcessingDoesNotPayTwice() throws Exception {
        var f = data.academic();
        data.transfer(f, 100, "Semestre anterior");
        clock.value = LocalDate.now(clock).plusMonths(6).atTime(12, 0).atZone(clock.getZone()).toInstant();
        String closed = GamificationPolicy.semester(LocalDate.now());
        for (int i = 0; i < 2; i++)
            f.institution().client().expect("POST", "/gamificacao/fundo/" + closed + "/encerrar", null, 204);
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM semester_winners WHERE student_id=?", Long.class,
                f.student().id()));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM reward_payments WHERE student_id=? AND kind='PREMIO'",
                Long.class, f.student().id()));
        assertEquals("PENDENTE",
                f.student().client().ok("GET", "/gamificacao/recompensas", null).get(0).path("status").asString());
    }

    @Test
    void domainListenerFailureRollsBackMoneyLedgerEmailsAndAchievements() throws Exception {
        var f = data.academic();
        probe.failFor.set(f.student().id());
        f.teacher().client()
                .result(f.teacher().client().call("POST", "/transferencias",
                        Map.of("studentId", f.student().id(), "amount", 100, "reason", "Rollback"),
                        UUID.randomUUID().toString()), 500);
        assertEquals(1000, accounts.findById(f.teacher().id()).orElseThrow().balance);
        assertEquals(0, accounts.findById(f.student().id()).orElseThrow().balance);
        for (String table : List.of("ledger_entries", "notifications", "inbox_notifications"))
            assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE account_id=?", Long.class,
                    f.student().id()));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM badge_awards WHERE student_id=?", Long.class,
                f.student().id()));
    }

    @Test
    void internalNotificationsArePrivateAndReadStateIsPersisted() throws Exception {
        var f = data.academic();
        data.transfer(f, 100, "Mérito");
        String id = f.student().client().ok("GET", "/gamificacao/notificacoes", null).get(0).path("id").asString();
        data.student(f.institution()).client().expect("POST", "/gamificacao/notificacoes/" + id + "/ler", null, 403);
        for (int i = 0; i < 2; i++)
            f.student().client().expect("POST", "/gamificacao/notificacoes/" + id + "/ler", null, 204);
        assertNotNull(jdbc.queryForObject("SELECT read_at FROM inbox_notifications WHERE id=?",
                java.sql.Timestamp.class, id));
    }

    @Test
    void sponsoredChallengeOwnershipBudgetAndFundingBlockAreEnforced() throws Exception {
        var company = data.partner("EMPRESA");
        var input = new HashMap<String, Object>(mission(100, 2));
        input.put("budget", 200);
        String id = company.client().ok("POST", "/gamificacao/desafios", input).path("id").asString();
        data.partner("EMPRESA").client().expect("PUT", "/gamificacao/desafios/" + id, input, 403);
        company.client().ok("POST", "/gamificacao/desafios/" + id + "/enviar", null);
        company.client().expect("POST", "/gamificacao/desafios/" + id + "/publicar", null, 409);
        company.client().ok("POST", "/gamificacao/desafios/" + id + "/cancelar", null);
        String closed = company.client().ok("POST", "/gamificacao/desafios", input).path("id").asString();
        assertEquals("ENCERRADO", company.client().ok("POST", "/gamificacao/desafios/" + closed + "/encerrar", null).path("status").asString());
        String expired = company.client().ok("POST", "/gamificacao/desafios", input).path("id").asString();
        clock.value = clock.value.plus(Duration.ofDays(31));
        community.expireChallenge(expired);
        assertEquals("ENCERRADO", jdbc.queryForObject("SELECT status FROM sponsored_challenges WHERE id=?", String.class, expired));
        input.put("budget", 100);
        company.client().expect("POST", "/gamificacao/desafios", input, 400);
        assertEquals(0, accounts.findById(company.id()).orElseThrow().balance);
    }

    @Test
    void concurrentBonusesCannotConsumeTheSameFundBalance() throws Exception {
        var f = data.academic();
        var other = data.student(f.institution());
        questions(f.teacher());
        complete(f.student());
        complete(other);
        f.institution().client().ok("POST", "/gamificacao/fundo/" + semester() + "/dotacao",
                Map.of("amount", 10, "origin", "Orçamento limitado"));
        var secondTeacher = data.teacher(f.institution());
        var responses = ConcurrentTestActions.together(
                () -> f.teacher().client()
                        .call("POST", "/transferencias",
                                Map.of("studentId", f.student().id(), "amount", 100, "reason", "Mérito"),
                                UUID.randomUUID().toString())
                        .statusCode(),
                () -> secondTeacher.client()
                        .call("POST", "/transferencias",
                                Map.of("studentId", other.id(), "amount", 100, "reason", "Mérito"),
                                UUID.randomUUID().toString())
                        .statusCode());
        assertEquals(List.of(200, 200), responses);
        assertEquals(210, accounts.findById(f.student().id()).orElseThrow().balance
                + accounts.findById(other.id()).orElseThrow().balance);
        assertEquals(1,
                jdbc.queryForObject("SELECT COUNT(*) FROM reward_payments WHERE institution_id=? AND status='PAGO'",
                        Long.class, f.institution().id()));
        assertEquals(1,
                jdbc.queryForObject("SELECT COUNT(*) FROM reward_payments WHERE institution_id=? AND status='PENDENTE'",
                        Long.class, f.institution().id()));
        assertEquals(0,
                f.institution().client().ok("GET", "/gamificacao/fundo/" + semester(), null).path("balance").asLong());
    }

    @Test
    void expiredMissionCancelsUndeliveredWorkAndReturnsReservationOnlyOnce() throws Exception {
        var f = data.academic();
        String id = createMission(f.teacher(), 100, 2);
        f.student().client().ok("POST", "/gamificacao/missoes/" + id + "/aceitar", null);
        clock.value = clock.value.plus(Duration.ofDays(31));
        missions.expire(id);
        missions.expire(id);
        assertEquals(1000, accounts.findById(f.teacher().id()).orElseThrow().balance);
        assertEquals("CANCELADA",
                jdbc.queryForObject("SELECT status FROM mission_participations WHERE mission_id=?", String.class, id));
        assertEquals(0, jdbc.queryForObject("SELECT reserved FROM missions WHERE id=?", Long.class, id));
        f.student().client().expect("POST", "/gamificacao/missoes/" + id + "/aceitar", null, 200); // replay never
                                                                                                   // creates another
                                                                                                   // participation
        assertEquals(1,
                jdbc.queryForObject("SELECT COUNT(*) FROM mission_participations WHERE mission_id=?", Long.class, id));
    }

    @Test
    void missionOwnershipAndInstitutionalEligibilityAreEnforced() throws Exception {
        var f = data.academic();
        String id = createMission(f.teacher(), 100, 2);
        var stranger = data.academic();
        stranger.student().client().expect("POST", "/gamificacao/missoes/" + id + "/aceitar", null, 403);
        stranger.teacher().client().expect("POST", "/gamificacao/missoes/" + id + "/encerrar", null, 403);
        var participation = f.student().client().ok("POST", "/gamificacao/missoes/" + id + "/aceitar", null)
                .path("participants").get(0).path("id").asString();
        stranger.student().client().expect("POST", "/gamificacao/participacoes/" + participation + "/entregar",
                Map.of("text", "Invasão"), 403);
        stranger.teacher().client().expect("POST", "/gamificacao/participacoes/" + participation + "/aprovar",
                Map.of("text", "Invasão"), 403);
    }

    @Test
    void paidSemesterPrizeAndTopThreeBadgeRemainUnique() throws Exception {
        var f = data.academic();
        String closed = semester();
        f.institution().client().ok("POST", "/gamificacao/fundo/" + closed + "/dotacao",
                Map.of("amount", 100, "origin", "Dotação de premiação"));
        data.transfer(f, 100, "Mérito do semestre");
        clock.value = GamificationPolicy.start(closed).plusMonths(6).atStartOfDay(clock.getZone()).toInstant();
        for (int i = 0; i < 2; i++)
            f.institution().client().expect("POST", "/gamificacao/fundo/" + closed + "/encerrar", null, 204);
        assertEquals(200, accounts.findById(f.student().id()).orElseThrow().balance);
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM badge_awards WHERE student_id=? AND badge_id='TOP_3'",
                Long.class, f.student().id()));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM ledger_entries WHERE account_id=? AND kind='PREMIO'",
                Long.class, f.student().id()));
        assertEquals(0,
                f.institution().client().ok("GET", "/gamificacao/fundo/" + closed, null).path("balance").asLong());
    }
}
