package br.pucminas.puclim.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ledger_entries", indexes = @Index(name = "idx_ledger_account_date", columnList = "account_id,date"))
public class LedgerEntry {
    @Id @Column(length = 36)
    public String id = UUID.randomUUID().toString();
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", nullable = false)
    public Account account;
    @Column(nullable = false)
    public Instant date = Instant.now();
    @Column(nullable = false, length = 20)
    public String kind;
    @Column(nullable = false)
    public long amount;
    @Column(nullable = false, length = 255)
    public String description;
    @Column(length = 180)
    public String counterpart;
    @Column(length = 500)
    public String reason;
}