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
@Table(name = "fund_movements")
public class FundMovement {
    @Id
    public String id = UUID.randomUUID().toString();
    @ManyToOne(optional = false)
    @JoinColumn(name = "fund_id")
    public InstitutionFund fund;
    @Column(nullable = false, length = 30)
    public String kind;
    public long amount;
    @Column(nullable = false, length = 160)
    public String sourceKey;
    public Instant date = Instant.now();
}
