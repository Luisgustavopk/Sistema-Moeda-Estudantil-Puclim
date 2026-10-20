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
@Table(name = "mission_reviews")
public class MissionReview {
    @Id
    public String id = UUID.randomUUID().toString();
    @ManyToOne(optional = false)
    @JoinColumn(name = "participation_id")
    public MissionParticipation participation;
    @Column(nullable = false, length = 30)
    public String action;
    @Column(nullable = false, length = 4000)
    public String text;
    public Instant date = Instant.now();
}
