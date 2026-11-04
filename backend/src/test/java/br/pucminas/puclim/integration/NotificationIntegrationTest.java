package br.pucminas.puclim.integration;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Properties;

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
import br.pucminas.puclim.repository.LedgerEntryRepository;
import br.pucminas.puclim.repository.NotificationRepository;
import br.pucminas.puclim.service.OutboxService;
import br.pucminas.puclim.support.AbstractDatabaseTest;
import br.pucminas.puclim.support.SmtpTestServer;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;

@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:(mysql|mariadb):.*")
class NotificationIntegrationTest extends AbstractDatabaseTest {

    @Autowired
    NotificationRepository notifications;
    @Autowired
    AccountRepository accounts;
    @Autowired
    LedgerEntryRepository ledger;
    @Autowired
    OutboxService outbox;
    @Autowired
    PlatformTransactionManager transactions;
    @Autowired
    org.springframework.mail.javamail.JavaMailSender mail;

    @Test
    void bothTransferConfirmationsReachTheCorrectRecipientsWithTheSameOperation() throws Exception {
        var fixture = data.academic();
        String reason = "Ótima participação e colaboração na apresentação.";
        var result = data.transfer(fixture, 200, reason);
        var operation = ledger.findById(result.path("id").asString()).orElseThrow();
        var teacherMail = notifications.findByAccountIdOrderByDateDesc(fixture.teacher().id()).get(0);
        var studentMail = notifications.findByAccountIdOrderByDateDesc(fixture.student().id()).get(0);
        assertEquals(fixture.teacher().email(), teacherMail.recipient);
        assertEquals(fixture.student().email(), studentMail.recipient);
        assertEquals("Envio de moedas confirmado no Puclim", teacherMail.subject);
        assertEquals("Você recebeu moedas no Puclim", studentMail.subject);
        assertTrue(teacherMail.body.contains("Aluno destinatário: " + fixture.student().name()));
        assertTrue(studentMail.body.contains("Professor remetente: " + fixture.teacher().name()));
        for (var notification : java.util.List.of(teacherMail, studentMail)) {
            assertTrue(notification.body.contains("Quantidade: 200 moedas"));
            assertTrue(notification.body.contains(reason));
            assertTrue(notification.body.contains("Identificador da operação: " + operation.operationId));
            assertNull(notification.sentAt);
        }
        var sender = (JavaMailSenderImpl) mail;
        String originalHost = sender.getHost();
        int originalPort = sender.getPort();
        try (var smtp = new SmtpTestServer(2)) {
            sender.setHost("127.0.0.1");
            sender.setPort(smtp.port());
            outbox.deliver(teacherMail.id);
            outbox.deliver(studentMail.id);
            // Delivering an already sent notification must not send it again.
            outbox.deliver(teacherMail.id);
            outbox.deliver(studentMail.id);
            var messages = smtp.received();
            assertEquals(2, messages.size());
            for (int i = 0; i < messages.size(); i++) {
                var expected = i == 0 ? teacherMail : studentMail;
                var message = new MimeMessage(Session.getInstance(new Properties()),
                        new ByteArrayInputStream(messages.get(i).getBytes(StandardCharsets.UTF_8)));
                assertEquals(1, message.getAllRecipients().length);
                assertEquals(expected.recipient, ((InternetAddress) message.getAllRecipients()[0]).getAddress());
                assertEquals(expected.subject, message.getSubject());
                assertTrue(message.isMimeType("text/plain"));
                assertEquals(expected.body, ((String) message.getContent()).replace("\r\n", "\n"));
                var delivered = notifications.findById(expected.id).orElseThrow();
                assertNotNull(delivered.sentAt);
                assertEquals(1, delivered.attempts);
            }
        } finally {
            sender.setHost(originalHost);
            sender.setPort(originalPort);
        }
    }

    @Test
    void smtpFailurePreservesTransferAndTheOtherConfirmationWhileRetryDeliversTheOriginalMessage() throws Exception {
        var fixture = data.academic();
        data.transfer(fixture, 200, "Excelente participacao");
        var notification = notifications.findByAccountIdOrderByDateDesc(fixture.student().id()).get(0);
        var teacherMail = notifications.findByAccountIdOrderByDateDesc(fixture.teacher().id()).get(0);
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
            assertEquals(800, accounts.findById(fixture.teacher().id()).orElseThrow().balance);
            try (var smtp = new SmtpTestServer(2)) {
                sender.setPort(smtp.port());
                outbox.deliver(teacherMail.id);
                assertNotNull(notifications.findById(teacherMail.id).orElseThrow().sentAt);
                // A retry scheduled for the future must wait without increasing attempts.
                outbox.deliver(notification.id);
                assertEquals(1, notifications.findById(notification.id).orElseThrow().attempts);
                new TransactionTemplate(transactions).executeWithoutResult(
                        status -> notifications.findById(notification.id).orElseThrow().nextAttempt = Instant.now()
                                .minusSeconds(1));
                outbox.deliver(notification.id);
                assertNotNull(notifications.findById(notification.id).orElseThrow().sentAt);
                assertEquals(2, notifications.findById(notification.id).orElseThrow().attempts);
                var messages = smtp.received();
                assertEquals(2, messages.size());
                assertTrue(messages.stream().allMatch(message -> message.contains("Excelente participacao")));
                assertEquals(notification.body, notifications.findById(notification.id).orElseThrow().body);
                assertEquals(1, notifications.findById(teacherMail.id).orElseThrow().attempts);
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
