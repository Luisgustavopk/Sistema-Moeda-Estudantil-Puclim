package br.pucminas.puclim.integration;

import java.io.StringReader;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashSet;
import java.util.Map;

import org.apache.commons.csv.CSVFormat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import br.pucminas.puclim.support.AbstractDatabaseTest;
import br.pucminas.puclim.support.TestDataFactory.AcademicFixture;

@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:(mysql|mariadb):.*")
class HistoryIntegrationTest extends AbstractDatabaseTest {
    @Autowired
    JdbcTemplate jdbc;

    @Test
    void statementsUseBoundedPagesGlobalFilteredTotalsAndStableOrderWithinTheAuthenticatedAccount() throws Exception {
        var fixture = data.academic();
        for (int i = 0; i < 15; i++)
            data.transfer(fixture, 1, i == 7 ? "Apoio 50%_! técnica" : "Atividade " + i);
        var other = data.student(fixture.institution());
        data.transfer(new AcademicFixture(fixture.institution(), fixture.teacher(), other), 50, "Apoio 50%_! técnica");
        jdbc.update("UPDATE ledger_entries SET date=? WHERE account_id=?",
                Timestamp.from(Instant.parse("2026-11-01T12:00:00Z")), fixture.student().id());
        var first = fixture.student().client().ok("GET", "/conta/extrato?accountId=" + other.id(), null);
        var second = fixture.student().client().ok("GET", "/conta/extrato?page=1", null);
        assertEquals(12, first.path("items").size());
        assertEquals(3, second.path("items").size());
        assertEquals(15, first.path("total").asLong());
        assertEquals(2, first.path("pages").asInt());
        assertEquals(15, second.path("summary").path("incoming").asLong());
        var ids = new java.util.ArrayList<String>();
        first.path("items").forEach(row -> ids.add(row.path("id").asString()));
        second.path("items").forEach(row -> ids.add(row.path("id").asString()));
        assertEquals(15, new HashSet<>(ids).size());
        assertEquals(ids.stream().sorted(java.util.Comparator.reverseOrder()).toList(), ids);
        var literal = fixture.student().client().ok("GET", "/conta/extrato?q=" + encoded("%_!"), null);
        assertEquals(1, literal.path("total").asLong());
        assertEquals(1, literal.path("summary").path("incoming").asLong());
        var teacher = fixture.teacher().client().ok("GET", "/conta/extrato?kind=ENVIO&size=2", null);
        assertEquals(16, teacher.path("total").asLong());
        assertEquals(65, teacher.path("summary").path("outgoing").asLong());
        assertEquals(2, teacher.path("summary").path("recognizedStudents").asLong());
        assertEquals(15, fixture.student().client().ok("GET", "/conta/extrato?kind=in", null).path("total").asLong());
        assertEquals(0, fixture.student().client().ok("GET", "/conta/extrato?kind=out", null).path("total").asLong());
    }

    @Test
    void dateFiltersIncludeTheWholeLocalDayAndExcludeTheNextMidnight() throws Exception {
        var fixture = data.academic();
        String[] dates = { "2026-11-01T02:59:59Z", "2026-11-01T03:00:00Z", "2026-11-02T03:00:00Z" };
        for (int i = 0; i < dates.length; i++) {
            data.transfer(fixture, (i + 1) * 10, "Fronteira " + i);
            jdbc.update("UPDATE ledger_entries SET date=? WHERE account_id=? AND reason=?",
                    dates[i].replace("T", " ").replace("Z", ""), fixture.student().id(), "Fronteira " + i);
        }
        var result = fixture.student().client().ok("GET",
                "/conta/extrato?from=2026-11-01&to=2026-11-01&zone=America%2FSao_Paulo", null);
        assertEquals(1, result.path("total").asLong());
        assertEquals(20, result.path("summary").path("incoming").asLong());
        assertEquals("Fronteira 1", result.path("items").get(0).path("reason").asString());
    }

    @Test
    void couponPagesFilterStatusAndSearchWithoutExposingAnotherStudentOrCompany() throws Exception {
        var fixture = data.academic();
        data.transfer(fixture, 100, "Crédito para resgates");
        var company = data.partner("EMPRESA");
        var otherCompany = data.partner("EMPRESA");
        var advantage = data.advantage(company, 1);
        String used = null, donated = null;
        for (int i = 0; i < 14; i++) {
            var coupon = data.redeem(fixture.student(), advantage);
            if (i == 0)
                used = coupon.path("code").asString();
            if (i == 1)
                donated = coupon.path("code").asString();
        }
        data.redeem(fixture.student(), data.advantage(otherCompany, 1));
        company.client().ok("POST", "/cupons/" + used + "/utilizar", Map.of());
        var beneficiary = data.partner("BENEFICIARIA");
        fixture.student().client().ok("POST", "/gamificacao/cupons/" + donated + "/doar",
                Map.of("beneficiaryId", beneficiary.id()));
        var own = fixture.student().client().ok("GET", "/cupons", null);
        assertEquals(12, own.path("items").size());
        assertEquals(15, own.path("total").asLong());
        assertEquals(13, own.path("summary").path("available").asLong());
        assertEquals(1, own.path("summary").path("used").asLong());
        assertEquals(1, own.path("summary").path("donated").asLong());
        var usedOnly = fixture.student().client().ok("GET", "/cupons?status=UTILIZADO&q=" + used.toLowerCase(), null);
        assertEquals(1, usedOnly.path("total").asLong());
        assertEquals(used, usedOnly.path("items").get(0).path("code").asString());
        assertEquals(0, otherCompany.client().ok("GET", "/cupons?q=" + used, null).path("total").asLong());
        assertEquals(0, data.student(fixture.institution()).client().ok("GET", "/cupons?q=" + used, null).path("total")
                .asLong());
        var companyPage = company.client().ok("GET", "/cupons?size=2&q=" + encoded(fixture.student().name()), null);
        assertEquals(14, companyPage.path("total").asLong());
        assertEquals(2, companyPage.path("items").size());
        assertEquals(1, companyPage.path("summary").path("used").asLong());
        fixture.teacher().client().expect("GET", "/cupons", null, 403);
        fixture.institution().client().expect("GET", "/cupons", null, 403);
        beneficiary.client().expect("GET", "/cupons", null, 403);
        company.client().expect("GET", "/conta/extrato", null, 403);
        company.client().expect("GET", "/conta/extrato/exportar", null, 403);
    }

    @Test
    void invalidPagingAndFiltersAreRejectedInsteadOfLoadingUnboundedHistory() throws Exception {
        var fixture = data.academic();
        for (String path : new String[] { "/conta/extrato", "/cupons" }) {
            for (String query : new String[] { "page=-1", "size=0", "size=101", "page=2147483647&size=100", "page=oops",
                    "q=" + "x".repeat(201) })
                fixture.student().client().expect("GET", path + "?" + query, null, 400);
        }
        for (String query : new String[] { "kind=unknown", "from=2026-02-30", "from=2026-11-02&to=2026-11-01",
                "zone=NotAZone" }) {
            fixture.student().client().expect("GET", "/conta/extrato?" + query, null, 400);
            fixture.student().client().expect("GET", "/conta/extrato/exportar?" + query, null, 400);
        }
        fixture.student().client().expect("GET", "/cupons?status=INVALIDO", null, 400);
        data.anonymous().expect("GET", "/conta/extrato/exportar", null, 401);
    }

    @Test
    void emptyAndOutOfRangePagesKeepAccurateMetadataAndZeroSummaries() throws Exception {
        var fixture = data.academic();
        for (String path : new String[] { "/conta/extrato?page=5&size=2", "/cupons?page=5&size=2" }) {
            var empty = fixture.student().client().ok("GET", path, null);
            assertEquals(0, empty.path("total").asLong());
            assertEquals(0, empty.path("pages").asInt());
            assertEquals(5, empty.path("page").asInt());
            assertEquals(0, empty.path("items").size());
        }
        data.transfer(fixture, 10, "Um registro");
        var beyond = fixture.student().client().ok("GET", "/conta/extrato?page=5&size=2", null);
        assertEquals(1, beyond.path("total").asLong());
        assertEquals(10, beyond.path("summary").path("incoming").asLong());
        assertEquals(0, beyond.path("items").size());
    }

    @Test
    void csvExportsEveryFilteredRowAcrossBatchesWithStableTiesAndSafeMultilineCells() throws Exception {
        var fixture = data.academic();
        for (int i = 0; i < 101; i++)
            data.transfer(fixture, 1, i == 0 ? " =SUM(1;2)\nCSV lote" : "CSV lote " + i);
        data.transfer(fixture, 5, "Fora do filtro");
        jdbc.update("UPDATE ledger_entries SET date=? WHERE account_id=?",
                Timestamp.from(Instant.parse("2026-11-01T12:00:00Z")), fixture.student().id());
        var response = fixture.student().client().call("GET",
                "/conta/extrato/exportar?q=CSV&kind=RECEBIMENTO&from=2026-11-01&to=2026-11-01", null, null);
        assertEquals(200, response.statusCode());
        assertTrue(response.headers().firstValue("Content-Type").orElseThrow().contains("text/csv"));
        assertTrue(response.headers().firstValue("Content-Disposition").orElseThrow().contains("attachment"));
        var format = CSVFormat.DEFAULT.builder().setDelimiter(';').setHeader().setSkipHeaderRecord(true).get();
        try (var parser = format.parse(new StringReader(response.body().replace("\uFEFF", "")))) {
            var rows = parser.getRecords();
            assertEquals(101, rows.size());
            assertEquals(101, new HashSet<>(rows.stream().map(row -> row.get("Motivo")).toList()).size());
            assertEquals(101, rows.stream().mapToLong(row -> Long.parseLong(row.get("Pucoins"))).sum());
            assertTrue(rows.stream().anyMatch(row -> row.get("Motivo").startsWith("'=SUM(1;2)\n")));
        }
    }

    private String encoded(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
