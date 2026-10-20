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
@Table(name = "institution_funds")
public class InstitutionFund {
    @Id
    public String id = UUID.randomUUID().toString();
    @ManyToOne(optional = false)
    @JoinColumn(name = "institution_id")
    public Partner institution;
    @Column(nullable = false, length = 6)
    public String semester;
    public long allocation;
    public long balance;
    public long reserved;
    @Column(nullable = false, length = 500)
    public String origin;
    public Instant date = Instant.now();
}
