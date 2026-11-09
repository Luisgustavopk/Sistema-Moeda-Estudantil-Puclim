package br.pucminas.puclim.entity;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** Private delivery queue: never expose through the notifications API. */
@Entity
@Table(name = "password_reset_requests")
public class PasswordResetRequest {
    @Id
    public String id = UUID.randomUUID().toString();
    @ManyToOne(optional = false)
    @JoinColumn(name = "account_id")
    public Account account;
    @Column(nullable = false, length = 254)
    public String recipient;
    public long credentialVersion;
    @Column(unique = true, length = 64)
    public String tokenHash;
    @Column(nullable = false)
    public Instant requestedAt;
    @Column(nullable = false)
    public Instant expiresAt;
    public Instant consumedAt;
    public Instant invalidatedAt;
    public Instant sentAt;
    public int attempts;
    @Column(nullable = false)
    public Instant nextAttempt;
    @Column(length = 100)
    public String lastError;
}
