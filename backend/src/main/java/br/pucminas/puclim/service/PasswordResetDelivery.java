package br.pucminas.puclim.service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import br.pucminas.puclim.config.PasswordResetPolicy;
import br.pucminas.puclim.mail.TextEmailTemplate;
import br.pucminas.puclim.repository.PasswordResetRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

/** SMTP retry queue without plaintext bearer credentials at rest. */
@Service
@Transactional(isolation = Isolation.READ_COMMITTED)
public class PasswordResetDelivery {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final TextEmailTemplate TEMPLATE = TextEmailTemplate.load("Redefina sua senha no Puclim", "mail/password-reset.txt");
    private final PasswordResetRepository requests;
    private final AccountService accounts;
    private final PasswordResetPolicy policy;
    private final JavaMailSender sender;
    private final String from;
    private final JdbcTemplate jdbc;
    @PersistenceContext private EntityManager entities;

    public PasswordResetDelivery(PasswordResetRepository requests, AccountService accounts, PasswordResetPolicy policy,
            JavaMailSender sender, @Value("${puclim.mail.from}") String from, JdbcTemplate jdbc) {
        this.requests = requests;
        this.accounts = accounts;
        this.policy = policy;
        this.sender = sender;
        this.from = from;
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public List<String> pending() {
        return requests.due(Instant.now(), PageRequest.of(0, 50));
    }

    public void deliver(String id) {
        var request = requests.findById(id).orElse(null);
        if (request == null)
            return;
        var account = accounts.locked(request.account.id);
        entities.refresh(request);
        Instant now = Instant.now();
        if (request.sentAt != null || request.invalidatedAt != null || request.consumedAt != null
                || request.nextAttempt.isAfter(now))
            return;
        if (!request.expiresAt.isAfter(now) || !account.active || !request.recipient.equals(account.email)
                || request.credentialVersion != account.credentialVersion) {
            request.invalidatedAt = now;
            request.tokenHash = null;
            return;
        }
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        request.tokenHash = PasswordResetRateLimiter.hash(token);
        request.attempts++;
        try {
            var content = TEMPLATE.render(Map.of("name", account.name, "link", policy.link(token),
                    "minutes", Long.toString(Math.max(1, java.time.Duration.between(now, request.expiresAt).toMinutes()))));
            var message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(request.recipient);
            message.setSubject(content.subject());
            message.setText(content.body());
            sender.send(message);
            request.sentAt = Instant.now();
            request.lastError = null;
        } catch (MailException e) {
            request.tokenHash = null;
            request.lastError = e.getClass().getSimpleName();
            request.nextAttempt = Instant.now().plusSeconds(Math.min(300, 30L * (1L << Math.min(request.attempts, 4))));
        }
    }

    public void clean() {
        Instant cutoff = Instant.now().minus(java.time.Duration.ofDays(7));
        // Retain a small private operational history, then remove expired metadata.
        jdbc.update("DELETE FROM password_reset_requests WHERE expires_at < ?", java.sql.Timestamp.from(cutoff));
        jdbc.update("DELETE FROM password_reset_rate_limits WHERE window_end < ?", java.sql.Timestamp.from(cutoff));
    }
}
