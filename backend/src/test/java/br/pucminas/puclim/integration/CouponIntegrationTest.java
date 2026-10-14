package br.pucminas.puclim.integration;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;

import br.pucminas.puclim.repository.AccountRepository;
import br.pucminas.puclim.support.AbstractDatabaseTest;
import br.pucminas.puclim.support.ConcurrentTestActions;

@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:(mysql|mariadb):.*")
class CouponIntegrationTest extends AbstractDatabaseTest {

    @Autowired
    AccountRepository accounts;

    @Test
    void concurrentRedemptionsGenerateOnlyOneCouponWhenBalanceIsInsufficientForBoth() throws Exception {
        var fixture = data.academic();
        data.transfer(fixture, 700, "Reconhecimento");
        var advantage = data.advantage(data.partner("EMPRESA"), 600);
        var second = data.authenticated(fixture.student());
        String path = "/vantagens/" + advantage.id() + "/resgates";
        var responses = ConcurrentTestActions.together(
                () -> fixture.student().client().call("POST", path, Map.of(), UUID.randomUUID().toString()),
                () -> second.call("POST", path, Map.of(), UUID.randomUUID().toString()));
        assertEquals(List.of(200, 409), responses.stream().map(response -> response.statusCode()).sorted().toList());
        assertEquals(100, accounts.findById(fixture.student().id()).orElseThrow().balance);
        assertEquals(1, fixture.student().client().ok("GET", "/cupons", null).size());
    }

    @Test
    void replayReturnsTheSameCouponAndDifferentRequestsGenerateUniqueCodes() throws Exception {
        var fixture = data.academic();
        data.transfer(fixture, 100, "Reconhecimento");
        var advantage = data.advantage(data.partner("EMPRESA"), 10);
        String key = UUID.randomUUID().toString(), path = "/vantagens/" + advantage.id() + "/resgates";
        var first = fixture.student().client().result(fixture.student().client().call("POST", path, Map.of(), key),
                200);
        var replay = fixture.student().client().result(fixture.student().client().call("POST", path, Map.of(), key),
                200);
        assertEquals(first.path("code"), replay.path("code"));
        assertNotEquals(first.path("code"), data.redeem(fixture.student(), advantage).path("code"));
        assertEquals(80, accounts.findById(fixture.student().id()).orElseThrow().balance);
    }

    @Test
    void couponOwnershipAndConcurrentUsePreventReuseAndExposeUpdatedStudentStatus() throws Exception {
        var fixture = data.academic();
        data.transfer(fixture, 100, "Reconhecimento");
        var company = data.partner("EMPRESA");
        var other = data.partner("EMPRESA");
        var coupon = data.redeem(fixture.student(), data.advantage(company, 10));
        String code = coupon.path("code").asText();
        other.client().expect("GET", "/cupons/" + code, null, 403);
        other.client().expect("POST", "/cupons/" + code + "/utilizar", Map.of(), 403);
        company.client().expect("GET", "/cupons/" + UUID.randomUUID(), null, 404);
        var second = data.authenticated(company);
        var responses = ConcurrentTestActions.together(
                () -> company.client().call("POST", "/cupons/" + code + "/utilizar", Map.of(), null).statusCode(),
                () -> second.call("POST", "/cupons/" + code + "/utilizar", Map.of(), null).statusCode());
        assertEquals(List.of(200, 409), responses.stream().sorted().toList());
        assertEquals("UTILIZADO", company.client().ok("GET", "/cupons/" + code, null).path("status").asText());
        assertEquals("UTILIZADO", fixture.student().client().ok("GET", "/cupons", null).get(0).path("status").asText());
    }

}
