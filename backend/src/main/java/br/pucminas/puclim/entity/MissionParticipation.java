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
@Table(name = "mission_participations")
public class MissionParticipation {
    @Id
    public String id = UUID.randomUUID().toString();
    @ManyToOne(optional = false)
    @JoinColumn(name = "mission_id")
    public Mission mission;
    @ManyToOne(optional = false)
    @JoinColumn(name = "student_id")
    public Student student;
    @Column(nullable = false, length = 30)
    public String status = "EM_ANDAMENTO";
    @Column(length = 4000)
    public String delivery;
    @Column(length = 2000)
    public String feedback;
    public Instant acceptedAt = Instant.now();
    public Instant submittedAt;
    public Instant approvedAt;
}
