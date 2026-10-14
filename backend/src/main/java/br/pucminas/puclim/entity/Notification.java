package br.pucminas.puclim.entity;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "notifications")
public class Notification {
    @Id
    public String id = UUID.randomUUID().toString();
    @ManyToOne(optional = false)
    @JoinColumn(name = "account_id")
    public Account account;
    @Column(nullable = false, length = 254)
    public String recipient;
    @Column(nullable = false, length = 200)
    public String subject;
    @Column(nullable = false, length = 5000)
    public String body;
    @Column(nullable = false)
    public Instant date = Instant.now();
    public Instant sentAt;
    public int attempts;
    @Column(nullable = false)
    public Instant nextAttempt = Instant.now();
    @Column(length = 500)
    public String lastError;
}
