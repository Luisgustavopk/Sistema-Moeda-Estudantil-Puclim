package br.pucminas.puclim.persistence;

import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;

import br.pucminas.puclim.repository.AccountRepository;
import br.pucminas.puclim.repository.CouponRepository;
import br.pucminas.puclim.repository.LedgerEntryRepository;
import br.pucminas.puclim.repository.NotificationRepository;
import br.pucminas.puclim.support.AbstractDatabaseTest;
import br.pucminas.puclim.support.TestPayloads;

@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:(mysql|mariadb):.*")
class OutboxPersistenceTest extends AbstractDatabaseTest {

    @Autowired
    NotificationRepository notifications;
    @Autowired
    CouponRepository coupons;
    @Autowired
    AccountRepository accounts;
    @Autowired
    LedgerEntryRepository ledger;

    @Test
    void redemptionPersistsOneCodeForBothRecipientsAndUsesUpdatedPartnerContact() throws Exception {
        var fixture = data.academic();
        data.transfer(fixture, 100, "Reconhecimento");
        var company = data.partner("EMPRESA");
        String email = TestPayloads.unique("contato") + "@example.test";
        company.client().ok("PATCH", "/conta/perfil", Map.of("name", company.name(), "email", email,
                "phone", "31988888888", "description", "Novo contato"));
        String code = data.redeem(fixture.student(), data.advantage(company, 10)).path("code").asString();
        var partnerMail = notifications.findByAccountIdOrderByDateDesc(company.id()).get(0);
        assertEquals(email, partnerMail.recipient);
        assertTrue(partnerMail.body.contains(code));
        assertNull(partnerMail.sentAt);
        assertTrue(notifications.findByAccountIdOrderByDateDesc(fixture.student().id()).stream()
                .anyMatch(notification -> notification.recipient.equals(fixture.student().email())
                        && notification.body.contains(code)));
    }

    @Test
    void failedRedemptionRollsBackCouponLedgerAndNotificationsTogether() throws Exception {
        var fixture = data.academic();
        data.transfer(fixture, 100, "Reconhecimento");
        var company = data.partner("EMPRESA");
        var advantage = data.advantage(company, 101);
        int entries = ledger.findByAccountIdOrderByDateDesc(fixture.student().id()).size();
        int notices = notifications.findByAccountIdOrderByDateDesc(fixture.student().id()).size();
        fixture.student().client()
                .result(fixture.student().client().call("POST", "/vantagens/" + advantage.id() + "/resgates",
                        Map.of(), UUID.randomUUID().toString()), 409);
        assertEquals(100, accounts.findById(fixture.student().id()).orElseThrow().balance);
        assertEquals(entries, ledger.findByAccountIdOrderByDateDesc(fixture.student().id()).size());
        assertEquals(notices, notifications.findByAccountIdOrderByDateDesc(fixture.student().id()).size());
        assertTrue(coupons.findByStudentIdOrderByDateDesc(fixture.student().id()).isEmpty());
        assertTrue(notifications.findByAccountIdOrderByDateDesc(company.id()).isEmpty());
    }

}
