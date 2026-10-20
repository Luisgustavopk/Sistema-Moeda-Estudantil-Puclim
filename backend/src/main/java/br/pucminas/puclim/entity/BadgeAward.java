package br.pucminas.puclim.entity;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "badge_awards")
public class BadgeAward {
    @Id
    public String id = UUID.randomUUID().toString();
    @ManyToOne(optional = false)
    @JoinColumn(name = "student_id")
    public Student student;
    @ManyToOne(optional = false)
    @JoinColumn(name = "badge_id")
    public BadgeDefinition badge;
    public Instant date = Instant.now();
}
