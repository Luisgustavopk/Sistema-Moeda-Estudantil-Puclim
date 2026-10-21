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
@Table(name = "peer_transfer_requests")
public class PeerTransferRequest {
    @Id
    @Column(length = 36)
    public String id = UUID.randomUUID().toString();
    @ManyToOne(optional = false)
    @JoinColumn(name = "teacher_id")
    public Teacher teacher;
    @ManyToOne(optional = false)
    @JoinColumn(name = "sender_id")
    public Student sender;
    @ManyToOne(optional = false)
    @JoinColumn(name = "recipient_id")
    public Student recipient;
    @Column(nullable = false)
    public long amount;
    @Column(nullable = false, length = 1000)
    public String reason;
    @Column(nullable = false, length = 2000)
    public String criteria;
    @Column(nullable = false, length = 80)
    public String requestKey;
    @Column(nullable = false, length = 20)
    public String status = "PENDENTE";
    @Column(length = 1000)
    public String feedback;
    @Column(nullable = false)
    public Instant createdAt;
    public Instant reviewedAt;
}
