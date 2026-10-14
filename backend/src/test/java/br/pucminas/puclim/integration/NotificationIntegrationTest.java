package br.pucminas.puclim.integration;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import br.pucminas.puclim.repository.AccountRepository;
import br.pucminas.puclim.repository.NotificationRepository;
import br.pucminas.puclim.service.OutboxService;
import br.pucminas.puclim.support.AbstractDatabaseTest;
import br.pucminas.puclim.support.SmtpTestServer;

@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:(mysql|mariadb):.*")
class NotificationIntegrationTest extends AbstractDatabaseTest {

    @Autowired
    NotificationRepository notifications;
    @Autowired
    AccountRepository accounts;
    @Autowired
    OutboxService outbox;
    @Autowired
    PlatformTransactionManager transactions;
    @Autowired
    org.springframework.mail.javamail.JavaMailSender mail;

    @Test
    void smtpFailurePreservesTransferAndRetryActuallyDeliversTheMessage() throws Exception {
        var fixture = data.academic();
        data.transfer(fixture, 200, "Excelente participacao");
        var notification = notifications.findByAccountIdOrderByDateDesc(fixture.student().id()).get(0);
        var sender = (JavaMailSenderImpl) mail;
        String originalHost = sender.getHost();
        int originalPort = sender.getPort();
        try {
            sender.setHost("127.0.0.1");
            sender.setPort(1);
            outbox.deliver(notification.id);
            var failed = notifications.findById(notification.id).orElseThrow();
            assertNull(failed.sentAt);
            assertEquals(1, failed.attempts);
            assertNotNull(failed.lastError);
            assertEquals(200, accounts.findById(fixture.student().id()).orElseThrow().balance);
            try (var smtp = new SmtpTestServer(1)) {
                sender.setPort(smtp.port());
                new TransactionTemplate(transactions).executeWithoutResult(
                        status -> notifications.findById(notification.id).orElseThrow().nextAttempt = Instant.now()
                                .minusSeconds(1));
                outbox.deliver(notification.id);
                assertNotNull(notifications.findById(notification.id).orElseThrow().sentAt);
                assertEquals(2, notifications.findById(notification.id).orElseThrow().attempts);
                var messages = smtp.received();
                assertEquals(1, messages.size());
                assertTrue(messages.get(0).contains("Excelente participacao"));
            }
        } finally {
            sender.setHost(originalHost);
            sender.setPort(originalPort);
        }
    }

    @Test
    void bothRedemptionNotificationsAreSentWithTheSameCouponCode() throws Exception {
        var fixture = data.academic();
        data.transfer(fixture, 100, "Reconhecimento");
        var company = data.partner("EMPRESA");
        var coupon = data.redeem(fixture.student(), data.advantage(company, 10));
        String code = coupon.path("code").asString();
        var studentMail = notifications.findByAccountIdOrderByDateDesc(fixture.student().id()).stream()
                .filter(notification -> notification.body.contains(code)).findFirst().orElseThrow();
        var partnerMail = notifications.findByAccountIdOrderByDateDesc(company.id()).get(0);
        assertTrue(partnerMail.body.contains(code));
        var sender = (JavaMailSenderImpl) mail;
        String originalHost = sender.getHost();
        int originalPort = sender.getPort();
        try (var smtp = new SmtpTestServer(2)) {
            sender.setHost("127.0.0.1");
            sender.setPort(smtp.port());
            outbox.deliver(studentMail.id);
            outbox.deliver(partnerMail.id);
            var messages = smtp.received();
            assertEquals(2, messages.size());
            assertTrue(messages.stream().allMatch(message -> message.contains(code)));
            assertNotNull(notifications.findById(studentMail.id).orElseThrow().sentAt);
            assertNotNull(notifications.findById(partnerMail.id).orElseThrow().sentAt);
        } finally {
            sender.setHost(originalHost);
            sender.setPort(originalPort);
        }
    }

}
