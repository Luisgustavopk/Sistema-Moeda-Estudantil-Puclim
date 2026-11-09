package br.pucminas.puclim.service;

import java.time.Instant;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import br.pucminas.puclim.config.PasswordResetPolicy;
import br.pucminas.puclim.entity.PasswordResetRequest;
import br.pucminas.puclim.exception.ApiException;
import br.pucminas.puclim.mail.TextEmailTemplate;
import br.pucminas.puclim.repository.AccountRepository;
import br.pucminas.puclim.repository.PasswordResetRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@Service
@Transactional(isolation = Isolation.READ_COMMITTED)
public class PasswordResetService {
    public static final String ACCEPTED = "Se houver uma conta ativa com esse e-mail, você receberá as instruções para redefinir sua senha.";
    public static final String INVALID = "Link inválido ou expirado. Solicite uma nova recuperação de senha.";
    private final AccountRepository accounts;
    private final AccountService accountService;
    private final PasswordResetRepository requests;
    private final PasswordResetRateLimiter limits;
    private final PasswordResetPolicy policy;
    private final PasswordEncoder encoder;
    private final OutboxService outbox;
    private static final TextEmailTemplate CONFIRMED = TextEmailTemplate.load("Sua senha do Puclim foi alterada", "mail/password-reset-confirmed.txt");
    @PersistenceContext private EntityManager entities;

    public PasswordResetService(AccountRepository accounts, AccountService accountService, PasswordResetRepository requests,
            PasswordResetRateLimiter limits, PasswordResetPolicy policy, PasswordEncoder encoder, OutboxService outbox) {
        this.accounts = accounts;
        this.accountService = accountService;
        this.requests = requests;
        this.limits = limits;
        this.policy = policy;
        this.encoder = encoder;
        this.outbox = outbox;
    }

    public void request(String email, String remoteAddress) {
        String normalized = IdentityValidation.normalize(email);
        Instant now = Instant.now();
        if (!limits.allow(normalized, remoteAddress, now))
            return;
        var candidate = accounts.findByEmail(normalized).orElse(null);
        if (candidate == null)
            return;
        var account = accountService.locked(candidate.id);
        if (!account.active || !account.email.equals(normalized))
            return;
        requests.invalidateForAccount(account.id, now);
        var request = new PasswordResetRequest();
        request.account = account;
        request.recipient = account.email;
        request.credentialVersion = account.credentialVersion;
        request.requestedAt = now;
        request.expiresAt = now.plus(policy.tokenTtl());
        request.nextAttempt = now;
        requests.save(request);
    }

    public void reset(String token, String password) {
        if (password == null || password.length() < 8 || password.length() > 128)
            throw ApiException.bad("A senha deve ter entre 8 e 128 caracteres.");
        if (token == null || !token.matches("[A-Za-z0-9_-]{43}"))
            throw ApiException.bad(INVALID);
        var request = requests.findByTokenHash(PasswordResetRateLimiter.hash(token))
                .orElseThrow(() -> ApiException.bad(INVALID));
        var account = accountService.locked(request.account.id);
        entities.refresh(request);
        Instant now = Instant.now();
        if (!account.active || !request.recipient.equals(account.email)
                || request.credentialVersion != account.credentialVersion || request.tokenHash == null
                || request.consumedAt != null || request.invalidatedAt != null || request.sentAt == null
                || !request.expiresAt.isAfter(now))
            throw ApiException.bad(INVALID);
        account.passwordHash = encoder.encode(password);
        account.credentialVersion++;
        account.mustChangePassword = false;
        request.consumedAt = now;
        request.tokenHash = null;
        // Flush consumedAt before the bulk invalidation query so this request keeps its consumed marker.
        requests.flush();
        requests.invalidateForAccount(account.id, now);
        outbox.enqueue(account, CONFIRMED.render(java.util.Map.of("name", account.name)));
    }
}
