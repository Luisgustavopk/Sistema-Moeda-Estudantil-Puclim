package br.pucminas.puclim.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.pucminas.puclim.config.PasswordResetPolicy;

/** Database buckets work across instances and never store email/IP in plaintext. */
@Service
public class PasswordResetRateLimiter {
    private final JdbcTemplate jdbc;
    private final PasswordResetPolicy policy;

    public PasswordResetRateLimiter(JdbcTemplate jdbc, PasswordResetPolicy policy) {
        this.jdbc = jdbc;
        this.policy = policy;
    }

    @Transactional
    public boolean allow(String email, String remoteAddress, Instant now) {
        // Consistent lock order: IP first, then email. Unknown accounts use the same buckets.
        if (!take(hash("ip:" + remoteAddress), now, policy.ipWindow(), policy.ipLimit()))
            return false;
        return take(hash("email:" + email), now, policy.emailCooldown(), 1);
    }

    private boolean take(String key, Instant now, Duration window, int maximum) {
        jdbc.update("INSERT INTO password_reset_rate_limits (bucket_key,window_end,attempts) VALUES (?,?,0) ON DUPLICATE KEY UPDATE bucket_key=VALUES(bucket_key)",
                key, Timestamp.from(now.plus(window)));
        var end = jdbc.queryForObject("SELECT window_end FROM password_reset_rate_limits WHERE bucket_key=? FOR UPDATE",
                Timestamp.class, key).toInstant();
        if (!end.isAfter(now))
            jdbc.update("UPDATE password_reset_rate_limits SET attempts=0,window_end=? WHERE bucket_key=?",
                    Timestamp.from(now.plus(window)), key);
        return jdbc.update("UPDATE password_reset_rate_limits SET attempts=attempts+1 WHERE bucket_key=? AND attempts<?",
                key, maximum) == 1;
    }

    public static String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
