package br.pucminas.puclim.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "partners")
public class Partner {
    @Id
    public String id;
    @OneToOne
    @MapsId
    @JoinColumn(name = "id")
    public Account account;
    @Column(nullable = false, unique = true, length = 14)
    public String cnpj;
    @Column(nullable = false, length = 20)
    public String kind;
    @Column(nullable = false, length = 20)
    public String phone;
    @Column(nullable = false, length = 500)
    public String description;
}
