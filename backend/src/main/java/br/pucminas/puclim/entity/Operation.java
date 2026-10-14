package br.pucminas.puclim.entity;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "operations")
public class Operation {
    @Id
    public String id = UUID.randomUUID().toString();
    @ManyToOne(optional = false)
    @JoinColumn(name = "account_id")
    public Account account;
    @Column(nullable = false, length = 80)
    public String requestKey;
    @Column(nullable = false, length = 64)
    public String fingerprint;
    @Column(nullable = false, length = 20)
    public String kind;
    @Column(nullable = false, length = 36)
    public String resultId;
}
