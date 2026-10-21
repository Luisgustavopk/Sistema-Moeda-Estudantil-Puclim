package br.pucminas.puclim.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "profile_customizations")
public class ProfileCustomization {
    @Id @Column(name = "student_id") public String studentId;
    @Column(nullable = false, length = 40) public String displayName;
    @Column(nullable = false, length = 240) public String bio = "";
    @Column(nullable = false) public boolean showRealName;
    @Column(nullable = false, length = 300) public String avatar = "portrait";
    @Column(nullable = false, length = 20) public String frame = "classic";
    @Column(nullable = false, length = 20) public String banner = "petroleum";
    @Column(nullable = false, length = 500) public String featuredBadgeIds = "";
    @Column(length = 255) public String favoriteBadgeId;
    @Column(nullable = false, length = 20) public String visibility = "all";
    @Column(nullable = false) public boolean showStats = true;
    @Column(nullable = false) public boolean showActivity = true;
}
