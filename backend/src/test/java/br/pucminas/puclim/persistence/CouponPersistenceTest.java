package br.pucminas.puclim.persistence;

import java.util.HashMap;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;

import br.pucminas.puclim.repository.AdvantageRepository;
import br.pucminas.puclim.repository.CouponRepository;
import br.pucminas.puclim.repository.LedgerEntryRepository;
import br.pucminas.puclim.support.AbstractDatabaseTest;

@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:(mysql|mariadb):.*")
class CouponPersistenceTest extends AbstractDatabaseTest {

    @Autowired
    CouponRepository coupons;
    @Autowired
    AdvantageRepository advantages;
    @Autowired
    LedgerEntryRepository ledger;

    @Test
    void redemptionPersistsReferencesAndImmutableCostAndNames() throws Exception {
        var fixture = data.academic();
        data.transfer(fixture, 100, "Reconhecimento");
        var company = data.partner("EMPRESA");
        var advantage = data.advantage(company, 60);
        var result = data.redeem(fixture.student(), advantage);
        String code = result.path("code").asText();
        var original = coupons.findByCode(code).orElseThrow();
        assertEquals(fixture.student().id(), original.student.id);
        assertEquals(company.id(), original.company.id);
        assertEquals(advantage.id(), original.advantage.id);
        assertEquals(60, original.cost);
        var edited = new HashMap<>(advantage.input());
        edited.put("cost", 10);
        edited.put("name", "Vantagem Alterada");
        company.client().ok("PUT", "/vantagens/" + advantage.id(), edited);
        var snapshot = coupons.findByCode(code).orElseThrow();
        assertEquals(60, snapshot.cost);
        assertEquals(advantage.input().get("name"), snapshot.advantageName);
        assertEquals(40, ledger.sum(fixture.student().id()));
    }

    @Test
    void removingAdvantageAndCompanyRetainsExistingCouponsAndTheirStatus() throws Exception {
        var fixture = data.academic();
        data.transfer(fixture, 100, "Reconhecimento");
        var company = data.partner("EMPRESA");
        var advantage = data.advantage(company, 10);
        String code = data.redeem(fixture.student(), advantage).path("code").asText();
        company.client().expect("DELETE", "/vantagens/" + advantage.id(), null, 204);
        assertFalse(advantages.findById(advantage.id()).orElseThrow().active);
        assertEquals("VALIDO", coupons.findByCode(code).orElseThrow().status);
        company.client().expect("DELETE", "/conta", null, 204);
        assertTrue(coupons.findByCode(code).isPresent());
        assertEquals(code, fixture.student().client().ok("GET", "/cupons", null).get(0).path("code").asText());
    }

}
