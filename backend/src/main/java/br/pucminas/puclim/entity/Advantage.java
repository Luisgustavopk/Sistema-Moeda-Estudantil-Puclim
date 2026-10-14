package br.pucminas.puclim.entity;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "advantages")
public class Advantage {
    @Id
    public String id = UUID.randomUUID().toString();
    @ManyToOne(optional = false)
    @JoinColumn(name = "company_id")
    public Partner company;
    @Column(nullable = false, length = 100)
    public String name;
    @Column(nullable = false, length = 1000)
    public String description;
    @Column(nullable = false, length = 300)
    public String photo;
    @Column(nullable = false, length = 30)
    public String category;
    public long cost;
    public boolean active = true;
}
