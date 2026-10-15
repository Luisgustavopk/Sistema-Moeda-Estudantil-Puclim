package br.pucminas.puclim.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notifications", indexes = @Index(name = "idx_notifications_account_date", columnList = "account_id,date"))
public class Notification {
    @Id @Column(length = 36) public String id = UUID.randomUUID().toString();
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "account_id", nullable = false) public Account account;
    @Column(nullable = false, length = 255) public String subject;
    @Column(nullable = false, columnDefinition = "TEXT") public String body;
    @Column(nullable = false) public Instant date = Instant.now();
    @Column(nullable = false, length = 180) public String recipient;
    @Enumerated(EnumType.STRING) @Column(name = "delivery_status", nullable = false, length = 12) public DeliveryStatus deliveryStatus = DeliveryStatus.PENDENTE;
    @Column(nullable = false) public int attempts;
    public enum DeliveryStatus { PENDENTE, ENVIADO }
}