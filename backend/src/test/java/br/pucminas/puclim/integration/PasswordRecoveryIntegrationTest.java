
package br.pucminas.puclim.integration;

import java.io.ByteArrayInputStream;
import java.net.http.HttpRequest;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Properties;
import java.util.UUID;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import br.pucminas.puclim.config.PasswordResetPolicy;
import br.pucminas.puclim.entity.PasswordResetRequest;
import br.pucminas.puclim.repository.AccountRepository;
import br.pucminas.puclim.repository.NotificationRepository;
import br.pucminas.puclim.repository.PasswordResetRepository;
import br.pucminas.puclim.service.PasswordResetDelivery;
import br.pucminas.puclim.service.PasswordResetRateLimiter;
import br.pucminas.puclim.service.PasswordResetService;
import br.pucminas.puclim.support.AbstractDatabaseTest;
import br.pucminas.puclim.support.ConcurrentTestActions;
import br.pucminas.puclim.support.SmtpTestServer;
import br.pucminas.puclim.support.TestAccount;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;

@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:(mysql|mariadb):.*")
@TestPropertySource(properties = { "puclim.public-app-url=https://app.puclim.example",
        "puclim.password-reset.email-cooldown=120s",
        "puclim.password-reset.ip-limit=1000", "puclim.password-reset.delivery-delay-ms=3600000" })
class PasswordRecoveryIntegrationTest extends AbstractDatabaseTest {
    @Autowired
    PasswordResetRepository resets;
    @Autowired
    PasswordResetDelivery delivery;
    @Autowired
    PasswordResetService recovery;
    @Autowired
    AccountRepository accounts;
    @Autowired
    NotificationRepository notifications;
    @Autowired
    JavaMailSender mail;
    @Autowired
    PasswordEncoder encoder;
    @Autowired
    PlatformTransactionManager transactions;
    @Autowired
    JdbcTemplate jdbc;

    @Test
    void genericRequestProtectsUnknownInactiveAndRateLimitedAccountsAndRequiresCsrf() throws Exception {
        var known = data.partner("EMPRESA");
        var inactive = data.partner("EMPRESA");
        var ipBlocked = data.partner("EMPRESA");
        inactive.client().expect("DELETE", "/conta", null, 204);
        var client = data.anonymous();
        var noCsrf = client.send(HttpRequest.newBuilder(client.uri("/auth/recuperar-senha"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("{\"email\":\"a@example.com\"}")).build());
        assertEquals(403, noCsrf.statusCode());
        var expected = client.expect("POST", "/auth/recuperar-senha", Map.of("email", known.email()), 202);
        assertEquals(PasswordResetService.ACCEPTED, expected.path("message").asString());
        assertEquals(120L, expected.path("resendAfterSeconds").asLong());
        assertEquals(2, expected.size());
        assertEquals(expected, client.expect("POST", "/auth/recuperar-senha", Map.of("email", known.email()), 202));
        assertEquals(expected, client.expect("POST", "/auth/recuperar-senha", Map.of("email", inactive.email()), 202));
        assertEquals(expected, client.expect("POST", "/auth/recuperar-senha",
                Map.of("email", UUID.randomUUID() + "@example.com"), 202));
        String ipBucket = PasswordResetRateLimiter.hash("ip:" + client.uri("").getHost());
        int ipAttempts = jdbc.queryForObject("SELECT attempts FROM password_reset_rate_limits WHERE bucket_key=?",
                Integer.class, ipBucket);
        try {
            jdbc.update("UPDATE password_reset_rate_limits SET attempts=1000 WHERE bucket_key=?", ipBucket);
            assertEquals(expected, client.expect("POST", "/auth/recuperar-senha",
                    Map.of("email", ipBlocked.email()), 202));
            assertEquals(0L, count(ipBlocked.id()));
        } finally {
            jdbc.update("UPDATE password_reset_rate_limits SET attempts=? WHERE bucket_key=?", ipAttempts, ipBucket);
        }
        assertEquals(1L, count(known.id()));
        assertEquals(0L, count(inactive.id()));
        var queued = latest(known.id());
        assertNull(queued.tokenHash);
        assertNull(queued.sentAt);
        assertTrue(queued.expiresAt.isAfter(queued.requestedAt.plusSeconds(1799)));
        assertTrue(queued.expiresAt.isBefore(queued.requestedAt.plusSeconds(1801)));
        client.expect("POST", "/auth/recuperar-senha", Map.of("email", "inválido"), 400);
    }

    @Test
    void emailContainsSingleUseLinkButUserNotificationsNeverContainTheCredential() throws Exception {
        var account = data.partner("EMPRESA");
        var otherSession = data.authenticated(account);
        request(account);
        var queued = latest(account.id());
        String token = deliverAndToken(queued.id, account.email());
        var stored = resets.findById(queued.id).orElseThrow();
        assertEquals(64, stored.tokenHash.length());
        assertEquals(PasswordResetRateLimiter.hash(token), stored.tokenHash);
        assertNotEquals(token, stored.tokenHash);
        assertEquals(1, stored.attempts);
        assertTrue(notifications.findByAccountIdOrderByDateDesc(account.id()).isEmpty());
        assertFalse(account.client().ok("GET", "/conta/notificacoes", null).toString().contains(token));
        delivery.deliver(stored.id);
        assertEquals(1, resets.findById(stored.id).orElseThrow().attempts);
        String password = "NovaSenhaSegura!2026";
        var anonymous = data.anonymous();
        anonymous.expect("POST", "/auth/redefinir-senha", Map.of("token", token, "password", password), 204);
        anonymous.expect("GET", "/auth/session", null, 401);
        account.client().expect("GET", "/auth/session", null, 401);
        otherSession.expect("GET", "/auth/session", null, 401);
        anonymous.expect("POST", "/auth/login", Map.of("login", account.login(), "password", account.password()), 401);
        assertEquals(account.id(), anonymous.login(account.login(), password).path("id").asString());
        assertTrue(encoder.matches(password, accounts.findById(account.id()).orElseThrow().passwordHash));
        assertNotNull(resets.findById(queued.id).orElseThrow().consumedAt);
        assertNull(resets.findById(queued.id).orElseThrow().tokenHash);
        var confirmation = notifications.findByAccountIdOrderByDateDesc(account.id());
        assertEquals(1, confirmation.size());
        assertEquals("Sua senha do Puclim foi alterada", confirmation.get(0).subject);
        assertFalse(confirmation.get(0).body.contains(token));
        assertFalse(confirmation.get(0).body.contains(password));
        assertEquals(PasswordResetService.INVALID,
                data.anonymous()
                        .expect("POST", "/auth/redefinir-senha", Map.of("token", token, "password", password), 400)
                        .path("message").asString());
    }

    @Test
    void resendingInvalidatesOlderLinksImmediatelyAndOnlyLatestCanReset() throws Exception {
        var account = data.partner("EMPRESA");
        request(account);
        var first = latest(account.id());
        String oldToken = deliverAndToken(first.id, account.email());
        allowResend(account.email());
        request(account);
        var second = latest(account.id());
        assertNotEquals(first.id, second.id);
        assertNotNull(resets.findById(first.id).orElseThrow().invalidatedAt);
        assertNull(resets.findById(first.id).orElseThrow().tokenHash);
        invalid(oldToken);
        String newToken = deliverAndToken(second.id, account.email());
        data.anonymous().expect("POST", "/auth/redefinir-senha",
                Map.of("token", newToken, "password", "SenhaRecente123"), 204);
        invalid(newToken);
        invalid(oldToken);
    }

    @Test
    void expiredMalformedAndUnknownTokensShareErrorAndInvalidPasswordsDoNotConsumeToken() throws Exception {
        var account = data.partner("EMPRESA");
        request(account);
        var queued = latest(account.id());
        String token = deliverAndToken(queued.id, account.email());
        var client = data.anonymous();
        client.expect("POST", "/auth/redefinir-senha", Map.of("token", token, "password", "curta"), 400);
        client.expect("POST", "/auth/redefinir-senha", Map.of("token", token, "password", "a".repeat(129)), 400);
        assertNull(resets.findById(queued.id).orElseThrow().consumedAt);
        invalid("errado");
        invalid("a".repeat(43));
        var withoutToken = client.expect("POST", "/auth/redefinir-senha", Map.of("password", "SenhaValida123"), 400);
        assertEquals(PasswordResetService.INVALID, withoutToken.path("message").asString());
        new TransactionTemplate(transactions).executeWithoutResult(
                status -> resets.findById(queued.id).orElseThrow().expiresAt = Instant.now().minusSeconds(1));
        invalid(token);
        assertEquals(account.id(), data.anonymous().login(account.login(), account.password()).path("id").asString());
    }

    @Test
    void simultaneousUsesConsumeTokenExactlyOnce() throws Exception {
        var account = data.partner("EMPRESA");
        request(account);
        String token = deliverAndToken(latest(account.id()).id, account.email());
        var one = data.anonymous();
        var two = data.anonymous();
        var responses = ConcurrentTestActions.together(
                () -> one.call("POST", "/auth/redefinir-senha", Map.of("token", token, "password", "PrimeiraSenha123"),
                        null),
                () -> two.call("POST", "/auth/redefinir-senha", Map.of("token", token, "password", "SegundaSenha123"),
                        null));
        assertEquals(java.util.List.of(204, 400), responses.stream().map(r -> r.statusCode()).sorted().toList());
        assertEquals(1, accounts.findById(account.id()).orElseThrow().credentialVersion);
        assertNotNull(latest(account.id()).consumedAt);
    }

    @Test
    void smtpFailureKeepsPrivateQueueForRetryWithoutPersistingTokenOrSendingAgain() throws Exception {
        var account = data.partner("EMPRESA");
        request(account);
        var queued = latest(account.id());
        var sender = (JavaMailSenderImpl) mail;
        String host = sender.getHost();
        int port = sender.getPort();
        try {
            sender.setHost("127.0.0.1");
            sender.setPort(1);
            delivery.deliver(queued.id);
            var failed = resets.findById(queued.id).orElseThrow();
            assertNull(failed.sentAt);
            assertNull(failed.tokenHash);
            assertNotNull(failed.lastError);
            assertEquals(1, failed.attempts);
            assertTrue(failed.nextAttempt.isAfter(Instant.now()));
            delivery.deliver(queued.id);
            assertEquals(1, resets.findById(queued.id).orElseThrow().attempts);
            new TransactionTemplate(transactions).executeWithoutResult(
                    status -> resets.findById(queued.id).orElseThrow().nextAttempt = Instant.now().minusSeconds(1));
            String token = deliverAndToken(queued.id, account.email());
            assertNotNull(resets.findById(queued.id).orElseThrow().sentAt);
            assertEquals(2, resets.findById(queued.id).orElseThrow().attempts);
            data.anonymous().expect("POST", "/auth/redefinir-senha",
                    Map.of("token", token, "password", "DepoisDoRetry123"), 204);
            assertEquals(1, notifications.findByAccountIdOrderByDateDesc(account.id()).size());
        } finally {
            sender.setHost(host);
            sender.setPort(port);
        }
    }

    @Test
    void firstAccessCanRecoverAndRevokedSessionDoesNotBlockRecoveryEndpoints() throws Exception {
        var teacher = data.teacherFirstAccess(data.partner("ENSINO"));
        var previousSession = data.authenticated(teacher);
        assertTrue(accounts.findById(teacher.id()).orElseThrow().mustChangePassword);
        teacher.client().expect("POST", "/auth/recuperar-senha", Map.of("email", teacher.email()), 202);
        String token = deliverAndToken(latest(teacher.id()).id, teacher.email());
        teacher.client().expect("POST", "/auth/redefinir-senha",
                Map.of("token", token, "password", "SenhaDefinitiva123"), 204);
        assertFalse(accounts.findById(teacher.id()).orElseThrow().mustChangePassword);
        // The browser still has the pre-reset principal. CSRF and the public POST must
        // remain usable.
        assertEquals(PasswordResetService.ACCEPTED, previousSession.expect("POST", "/auth/recuperar-senha",
                Map.of("email", teacher.email()), 202).path("message").asString());
        teacher.client().expect("GET", "/auth/session", null, 401);
        previousSession.expect("GET", "/auth/session", null, 401);
    }

    @Test
    void successfulResetClearsRequestingBrowserSessionAndCsrfEvenForADifferentAccount() throws Exception {
        var target = data.partner("EMPRESA");
        var requester = data.partner("EMPRESA");
        request(target);
        String token = deliverAndToken(latest(target.id()).id, target.email());
        var response = requester.client().call("POST", "/auth/redefinir-senha",
                Map.of("token", token, "password", "SenhaDoAlvo123"), null);
        assertEquals(204, response.statusCode());
        var cookies = response.headers().allValues("Set-Cookie");
        String cookieAttributes = cookies.stream().map(c -> c.replaceFirst("=[^;]*", "=<redacted>")).toList()
                .toString();
        var parsed = cookies.stream().flatMap(c -> java.net.HttpCookie.parse(c).stream()).toList();
        assertTrue(parsed.stream().anyMatch(c -> c.getName().equals("JSESSIONID") && c.hasExpired()), cookieAttributes);
        assertTrue(parsed.stream().anyMatch(c -> c.getName().equals("XSRF-TOKEN") && c.hasExpired()), cookieAttributes);
        requester.client().expect("GET", "/auth/session", null, 401);
        assertEquals(requester.id(),
                requester.client().login(requester.login(), requester.password()).path("id").asString());
    }

    @Test
    void passwordOrEmailChangesAndDeactivationInvalidatePreviouslySentLinks() throws Exception {
        for (String change : java.util.List.of("password", "email", "deactivate")) {
            var account = data.partner("EMPRESA");
            request(account);
            String token = deliverAndToken(latest(account.id()).id, account.email());
            switch (change) {
                case "password" -> account.client().ok("PATCH", "/conta/senha",
                        Map.of("currentPassword", account.password(), "password", "TrocadaPeloPerfil123"));
                case "email" -> {
                    var changed = Map.of("name", account.name(), "email", UUID.randomUUID() + "@example.com",
                            "phone", "31999999999", "description", "Contato atualizado");
                    account.client().ok("PATCH", "/conta/perfil", changed);
                    // Restoring the original address must never revive an old bearer link.
                    account.client().ok("PATCH", "/conta/perfil",
                            Map.of("name", account.name(), "email", account.email(),
                                    "phone", "31999999999", "description", "Contato restaurado"));
                }
                default -> account.client().expect("DELETE", "/conta", null, 204);
            }
            assertNotNull(latest(account.id()).invalidatedAt);
            assertNull(latest(account.id()).tokenHash);
            invalid(token);
        }
    }

    @Test
    void ipLimitAppliesToDifferentAddressesAndExpiresWithoutRetainingRawIdentifiers() {
        String ip = "test-ip-" + UUID.randomUUID();
        var policy = new PasswordResetPolicy(Duration.ofMinutes(30), Duration.ofSeconds(60), Duration.ofMinutes(15), 2,
                "https://app.puclim.example");
        var limiter = new PasswordResetRateLimiter(jdbc, policy);
        var transaction = new TransactionTemplate(transactions);
        Instant now = Instant.now();
        assertEquals(Boolean.TRUE,
                transaction.execute(status -> limiter.allow(UUID.randomUUID() + "@example.com", ip, now)));
        assertEquals(Boolean.TRUE,
                transaction.execute(status -> limiter.allow(UUID.randomUUID() + "@example.com", ip, now)));
        String deniedEmail = UUID.randomUUID() + "@example.com";
        assertEquals(Boolean.FALSE, transaction.execute(status -> limiter.allow(deniedEmail, ip, now)));
        assertEquals(0L,
                jdbc.queryForObject("SELECT COUNT(*) FROM password_reset_rate_limits WHERE bucket_key=?", Long.class,
                        PasswordResetRateLimiter.hash("email:" + deniedEmail)));
        assertEquals(Boolean.TRUE, transaction
                .execute(status -> limiter.allow(UUID.randomUUID() + "@example.com", ip, now.plusSeconds(901))));
        String bucket = PasswordResetRateLimiter.hash("ip:" + ip);
        assertEquals(64, bucket.length());
        assertEquals(1, jdbc.queryForObject("SELECT attempts FROM password_reset_rate_limits WHERE bucket_key=?",
                Integer.class, bucket));
    }

    private void request(TestAccount account) throws Exception {
        data.anonymous().expect("POST", "/auth/recuperar-senha",
                Map.of("email", account.email().toUpperCase(java.util.Locale.ROOT)), 202);
    }

    private long count(String accountId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM password_reset_requests WHERE account_id=?", Long.class,
                accountId);
    }

    private PasswordResetRequest latest(String accountId) {
        String id = jdbc.queryForObject(
                "SELECT id FROM password_reset_requests WHERE account_id=? ORDER BY requested_at DESC LIMIT 1",
                String.class, accountId);
        return resets.findById(id).orElseThrow();
    }

    private void allowResend(String email) {
        jdbc.update("UPDATE password_reset_rate_limits SET window_end=? WHERE bucket_key=?",
                Timestamp.from(Instant.now().minusSeconds(1)),
                PasswordResetRateLimiter.hash("email:" + email));
    }

    private void invalid(String token) throws Exception {
        assertEquals(PasswordResetService.INVALID,
                data.anonymous()
                        .expect("POST", "/auth/redefinir-senha", Map.of("token", token, "password", "SenhaValida123"),
                                400)
                        .path("message").asString());
    }

    private String deliverAndToken(String requestId, String recipient) throws Exception {
        var sender = (JavaMailSenderImpl) mail;
        String host = sender.getHost();
        int port = sender.getPort();
        try (var smtp = new SmtpTestServer(1)) {
            sender.setHost("127.0.0.1");
            sender.setPort(smtp.port());
            delivery.deliver(requestId);
            var messages = smtp.received();
            assertEquals(1, messages.size());
            var message = new MimeMessage(Session.getInstance(new Properties()),
                    new ByteArrayInputStream(messages.get(0).getBytes(StandardCharsets.UTF_8)));
            assertEquals("Redefina sua senha no Puclim", message.getSubject());
            assertEquals(recipient, ((InternetAddress) message.getAllRecipients()[0]).getAddress());
            assertTrue(message.isMimeType("text/plain"));
            String text = (String) message.getContent();
            var match = Pattern.compile("https://app\\.puclim\\.example/redefinir-senha#token=([A-Za-z0-9_-]{43})")
                    .matcher(text);
            assertTrue(match.find(), "A mensagem deve conter o link da aplicação configurada.");
            assertTrue(text.contains("uma única vez"));
            assertTrue(text.contains("ignore esta mensagem"));
            return match.group(1);
        } finally {
            sender.setHost(host);
            sender.setPort(port);
        }
    }
}
