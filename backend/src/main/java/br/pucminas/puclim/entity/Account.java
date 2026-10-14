package br.pucminas.puclim.entity;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "accounts")
public class Account {
    @Id
    public String id = UUID.randomUUID().toString();
    @Column(nullable = false, unique = true, length = 40)
    public String login;
    @Column(nullable = false, unique = true, length = 254)
    public String email;
    @Column(nullable = false)
    public String passwordHash;
    @Column(nullable = false, length = 20)
    public String role;
    @Column(nullable = false, length = 100)
    public String name;
    public boolean active = true;
    public boolean mustChangePassword;
    public long balance;
    public long credentialVersion;
    @jakarta.persistence.Version public long version;
}
