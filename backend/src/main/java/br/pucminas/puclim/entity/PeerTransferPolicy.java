package br.pucminas.puclim.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "peer_transfer_policies")
public class PeerTransferPolicy {
    @Id
    @Column(name = "teacher_id")
    public String teacherId;
    @Column(nullable = false, length = 2000)
    public String criteria;
}
