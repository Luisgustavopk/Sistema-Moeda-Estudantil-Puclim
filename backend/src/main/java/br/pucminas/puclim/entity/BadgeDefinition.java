package br.pucminas.puclim.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "badge_definitions")
public class BadgeDefinition {
    @Id
    @Column(length = 40)
    public String id;
    @Column(nullable = false, length = 100)
    public String name;
    @Column(nullable = false, length = 500)
    public String description;
    @Column(nullable = false, length = 40)
    public String criterion;
    @Column(nullable = false, length = 20)
    public String rarity;
    @Column(nullable = false, length = 40)
    public String icon;
    public long target;
}
