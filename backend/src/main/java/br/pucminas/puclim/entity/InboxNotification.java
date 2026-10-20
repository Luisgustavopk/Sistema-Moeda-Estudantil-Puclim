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
@Table(name = "inbox_notifications")
public class InboxNotification {
    @Id
    public String id = UUID.randomUUID().toString();
    @ManyToOne(optional = false)
    @JoinColumn(name = "account_id")
    public Account account;
    @Column(nullable = false, length = 40)
    public String type;
    @Column(nullable = false, length = 200)
    public String title;
    @Column(nullable = false, length = 2000)
    public String message;
    @Column(length = 255)
    public String referenceId;
    public Instant date = Instant.now();
    public Instant readAt;
}
