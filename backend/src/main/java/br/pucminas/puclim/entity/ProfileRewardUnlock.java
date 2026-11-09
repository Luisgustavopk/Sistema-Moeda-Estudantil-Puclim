package br.pucminas.puclim.entity;

import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "profile_reward_unlocks", uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "reward_id"}))
public class ProfileRewardUnlock {
    @Id public String id = UUID.randomUUID().toString();
    @Column(name = "student_id", nullable = false) public String studentId;
    @ManyToOne(optional = false) @JoinColumn(name = "reward_id") public ProfileReward reward;
    @Column(nullable = false) public Instant unlockedAt;
    public Instant seenAt;
}
