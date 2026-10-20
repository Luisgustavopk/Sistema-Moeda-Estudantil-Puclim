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
@Table(name = "sponsored_challenges")
public class SponsoredChallenge {
    @Id
    public String id = UUID.randomUUID().toString();
    @ManyToOne(optional = false)
    @JoinColumn(name = "company_id")
    public Partner company;
    @Column(nullable = false, length = 100)
    public String title;
    @Column(nullable = false, length = 2000)
    public String description;
    public long reward;
    public int capacity;
    public long budget;
    @Column(nullable = false)
    public Instant deadline;
    @Column(nullable = false, length = 30)
    public String status = "PROPOSTA";
    public Instant date = Instant.now();
}
