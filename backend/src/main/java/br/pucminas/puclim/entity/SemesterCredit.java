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
@Table(name = "semester_credits")
public class SemesterCredit {
    @Id
    public String id = UUID.randomUUID().toString();
    @ManyToOne(optional = false)
    @JoinColumn(name = "teacher_id")
    public Teacher teacher;
    @Column(nullable = false, length = 6)
    public String semester;
    @Column(nullable = false)
    public Instant date = Instant.now();
}
