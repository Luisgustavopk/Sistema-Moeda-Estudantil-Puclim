package br.pucminas.puclim.entity;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "image_assets")
public class ImageAsset {
    @Id
    public String id = UUID.randomUUID().toString();
    @ManyToOne(optional = false)
    @JoinColumn(name = "owner_id")
    public Account owner;
    @Column(nullable = false, unique = true, length = 100)
    public String filename;
    @Column(nullable = false, length = 40)
    public String contentType;
}
