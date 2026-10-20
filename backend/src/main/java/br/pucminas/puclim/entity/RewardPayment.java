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
@Table(name = "reward_payments")
public class RewardPayment {
    @Id
    public String id = UUID.randomUUID().toString();
    @ManyToOne(optional = false)
    @JoinColumn(name = "student_id")
    public Student student;
    @ManyToOne(optional = false)
    @JoinColumn(name = "institution_id")
    public Partner institution;
    @Column(nullable = false, length = 6)
    public String semester;
    @Column(nullable = false, length = 160)
    public String sourceKey;
    @Column(nullable = false, length = 20)
    public String kind;
    public long amount;
    @Column(nullable = false, length = 20)
    public String status = "PENDENTE";
    @Column(length = 36)
    public String originOperationId;
    public Instant date = Instant.now();
    public Instant paidAt;
}
