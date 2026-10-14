package br.pucminas.puclim.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "teachers")
public class Teacher {
    @Id
    public String id;
    @OneToOne
    @MapsId
    @JoinColumn(name = "id")
    public Account account;
    @Column(nullable = false, unique = true, length = 11)
    public String cpf;
    @Column(nullable = false, length = 100)
    public String department;
    @ManyToOne(optional = false)
    @JoinColumn(name = "institution_id")
    public Partner institution;
}
