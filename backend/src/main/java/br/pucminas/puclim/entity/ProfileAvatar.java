package br.pucminas.puclim.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "profile_avatars")
public class ProfileAvatar {
    @Id @Column(length = 36) public String id = UUID.randomUUID().toString();
    @Column(nullable = false) public String studentId;
    @Lob @Column(nullable = false, columnDefinition = "LONGBLOB") public byte[] content;
    @Column(nullable = false, length = 40) public String contentType = "image/png";
    @Lob @Column(columnDefinition = "LONGBLOB") public byte[] staticContent;
}
