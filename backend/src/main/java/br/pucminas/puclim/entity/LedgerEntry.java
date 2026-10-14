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
@Table(name = "ledger_entries")
public class LedgerEntry {
    @Id
    public String id = UUID.randomUUID().toString();
    @ManyToOne(optional = false)
    @JoinColumn(name = "account_id")
    public Account account;
    @Column(nullable = false, length = 20)
    public String kind;
    public long amount;
    @Column(nullable = false, length = 1000)
    public String description;
    @Column(length = 100)
    public String counterpart;
    @Column(length = 1000)
    public String reason;
    @Column(nullable = false)
    public Instant date = Instant.now();
    @Column(nullable = false, length = 36)
    public String operationId;
}
