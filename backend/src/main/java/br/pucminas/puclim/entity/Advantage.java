package br.pucminas.puclim.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "advantages", indexes = {
        @Index(name = "idx_advantages_company", columnList = "company_id"),
        @Index(name = "idx_advantages_active", columnList = "active")
})
public class Advantage {
    @Id @Column(length = 36)
    public String id = UUID.randomUUID().toString();
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    public Account company;
    @Column(nullable = false, length = 180) public String name;
    @Column(nullable = false, columnDefinition = "TEXT") public String description;
    @Column(nullable = false, length = 500) public String photo;
    @Column(nullable = false, length = 20) public String category;
    @Column(nullable = false) public long cost;
    @Column(nullable = false) public boolean active = true;
}