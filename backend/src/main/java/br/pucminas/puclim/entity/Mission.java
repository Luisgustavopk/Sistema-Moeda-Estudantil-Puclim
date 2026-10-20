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
@Table(name = "missions")
public class Mission {
    @Id
    public String id = UUID.randomUUID().toString();
    @ManyToOne(optional = false)
    @JoinColumn(name = "teacher_id")
    public Teacher teacher;
    @Column(nullable = false, length = 100)
    public String title;
    @Column(nullable = false, length = 2000)
    public String description;
    public long reward;
    public int capacity;
    public int occupied;
    public long reserved;
    @Column(nullable = false)
    public Instant deadline;
    @Column(nullable = false, length = 20)
    public String status = "DISPONIVEL";
    public Instant date = Instant.now();
}
