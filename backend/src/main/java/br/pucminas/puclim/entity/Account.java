package br.pucminas.puclim.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "accounts", uniqueConstraints = {
        @UniqueConstraint(name = "uk_accounts_login", columnNames = "login"),
        @UniqueConstraint(name = "uk_accounts_email", columnNames = "email")
})
public class Account {
    @Id
    @Column(length = 36)
    public String id = UUID.randomUUID().toString();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    public Role role;

    @Column(name = "partner_kind", length = 12)
    public String partnerKind;
    @Column(nullable = false, length = 180)
    public String name;
    @Column(nullable = false, length = 180)
    public String email;
    @Column(nullable = false, length = 80)
    public String login;
    @Column(name = "password_hash", nullable = false, length = 255)
    public String passwordHash;
    @Column(nullable = false)
    public boolean active = true;
    @Column(nullable = false)
    public long balance;
    @Version
    public long version;
    public String cpf;
    public String rg;
    public String address;
    public String course;
    @Column(name = "institution_id", length = 36)
    public String institutionId;
    public String department;
    public String cnpj;
    public String phone;
    @Column(columnDefinition = "TEXT")
    public String description;

    public enum Role { ALUNO, PROFESSOR, EMPRESA }
}